import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminPrincipal } from '../auth/admin-principal.js';
import {
  assertCatalogWriteAccess,
  normalizeCategoryName,
} from './catalog-access.js';
import type {
  CatalogProductQueryDto,
  CreateCatalogCategoryDto,
  CreateCatalogProductDto,
  UpdateCatalogCategoryDto,
  UpdateCatalogProductDto,
} from './catalog.dto.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(principal: AdminPrincipal) {
    const categories = await this.prisma.catalogCategory.findMany({
      where: { restaurantId: principal.restaurantId },
      include: { _count: { select: { products: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map(({ _count, ...category }) => ({
      ...category,
      productCount: _count.products,
    }));
  }

  async getCategory(principal: AdminPrincipal, id: string) {
    const category = await this.prisma.catalogCategory.findFirst({
      where: { id, restaurantId: principal.restaurantId },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Category not found.');

    const { _count, ...categoryData } = category;
    return { ...categoryData, productCount: _count.products };
  }

  async createCategory(
    principal: AdminPrincipal,
    dto: CreateCatalogCategoryDto,
  ) {
    assertCatalogWriteAccess(principal.role);
    const name = dto.name.trim();
    try {
      const category = await this.prisma.catalogCategory.create({
        data: {
          restaurantId: principal.restaurantId,
          name,
          nameNormalized: normalizeCategoryName(name),
          description: dto.description,
          imageUrl: dto.imageUrl,
          displayOrder: dto.displayOrder,
        },
        include: { _count: { select: { products: true } } },
      });
      const { _count, ...categoryData } = category;
      return { ...categoryData, productCount: _count.products };
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }
      throw error;
    }
  }

  async updateCategory(
    principal: AdminPrincipal,
    id: string,
    dto: UpdateCatalogCategoryDto,
  ) {
    assertCatalogWriteAccess(principal.role);
    await this.requireCategory(principal, id);
    const data = {
      ...(dto.name !== undefined
        ? {
            name: dto.name.trim(),
            nameNormalized: normalizeCategoryName(dto.name),
          }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.displayOrder !== undefined
        ? { displayOrder: dto.displayOrder }
        : {}),
    };

    try {
      const result = await this.prisma.catalogCategory.updateMany({
        where: { id, restaurantId: principal.restaurantId },
        data,
      });
      if (result.count !== 1)
        throw new NotFoundException('Category not found.');
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }
      throw error;
    }

    return this.getCategory(principal, id);
  }

  async deleteCategory(principal: AdminPrincipal, id: string): Promise<void> {
    assertCatalogWriteAccess(principal.role);
    await this.requireCategory(principal, id);
    const productCount = await this.prisma.catalogProduct.count({
      where: { categoryId: id, restaurantId: principal.restaurantId },
    });
    if (productCount > 0) {
      throw new ConflictException('This category still contains products.');
    }

    try {
      const result = await this.prisma.catalogCategory.deleteMany({
        where: { id, restaurantId: principal.restaurantId },
      });
      if (result.count !== 1)
        throw new NotFoundException('Category not found.');
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2003')) {
        throw new ConflictException('This category still contains products.');
      }
      throw error;
    }
  }

  async listProducts(principal: AdminPrincipal, query: CatalogProductQueryDto) {
    const includeArchived = query.includeArchived === true;
    if (includeArchived && principal.role === MembershipRole.STAFF) {
      throw new ForbiddenException(
        'Only restaurant owners and administrators can view archived products.',
      );
    }

    if (query.categoryId)
      await this.requireCategory(principal, query.categoryId);

    return this.prisma.catalogProduct.findMany({
      where: {
        restaurantId: principal.restaurantId,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(!includeArchived ? { isActive: true } : {}),
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getProduct(principal: AdminPrincipal, id: string) {
    const product = await this.prisma.catalogProduct.findFirst({
      where: {
        id,
        restaurantId: principal.restaurantId,
        ...(principal.role === MembershipRole.STAFF ? { isActive: true } : {}),
      },
    });
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  async createProduct(principal: AdminPrincipal, dto: CreateCatalogProductDto) {
    assertCatalogWriteAccess(principal.role);
    await this.requireCategory(principal, dto.categoryId);
    return this.prisma.catalogProduct.create({
      data: {
        restaurantId: principal.restaurantId,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        description: dto.description,
        priceInCents: dto.priceInCents,
        imageUrl: dto.imageUrl,
        available: dto.available,
        featured: dto.featured,
        dietaryTags: dto.dietaryTags,
        prepTimeMinutes: dto.prepTimeMinutes,
      },
    });
  }

  async updateProduct(
    principal: AdminPrincipal,
    id: string,
    dto: UpdateCatalogProductDto,
  ) {
    assertCatalogWriteAccess(principal.role);
    await this.requireProduct(principal, id);
    if (dto.categoryId) await this.requireCategory(principal, dto.categoryId);
    const data = {
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.priceInCents !== undefined
        ? { priceInCents: dto.priceInCents }
        : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.available !== undefined ? { available: dto.available } : {}),
      ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
      ...(dto.dietaryTags !== undefined
        ? { dietaryTags: dto.dietaryTags }
        : {}),
      ...(dto.prepTimeMinutes !== undefined
        ? { prepTimeMinutes: dto.prepTimeMinutes }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
    const result = await this.prisma.catalogProduct.updateMany({
      where: { id, restaurantId: principal.restaurantId },
      data,
    });
    if (result.count !== 1) throw new NotFoundException('Product not found.');

    return this.getProduct(principal, id);
  }

  async archiveProduct(principal: AdminPrincipal, id: string): Promise<void> {
    assertCatalogWriteAccess(principal.role);
    const result = await this.prisma.catalogProduct.updateMany({
      where: { id, restaurantId: principal.restaurantId },
      data: { isActive: false },
    });
    if (result.count !== 1) throw new NotFoundException('Product not found.');
  }

  private async requireCategory(
    principal: AdminPrincipal,
    id: string,
  ): Promise<void> {
    const category = await this.prisma.catalogCategory.findFirst({
      where: { id, restaurantId: principal.restaurantId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found.');
  }

  private async requireProduct(
    principal: AdminPrincipal,
    id: string,
  ): Promise<void> {
    const product = await this.prisma.catalogProduct.findFirst({
      where: { id, restaurantId: principal.restaurantId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
