import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

const publicCodePattern = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class PublicDiningService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu(publicCode: string) {
    if (!publicCodePattern.test(publicCode)) {
      throw new NotFoundException('Table not found.');
    }

    const table = await this.prisma.restaurantTable.findFirst({
      where: { publicCode, isActive: true },
      select: {
        name: true,
        restaurant: { select: { id: true, name: true } },
      },
    });
    if (!table) throw new NotFoundException('Table not found.');

    const categories = await this.prisma.catalogCategory.findMany({
      where: {
        restaurantId: table.restaurant.id,
        products: {
          some: {
            restaurantId: table.restaurant.id,
            isActive: true,
            available: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        products: {
          where: {
            restaurantId: table.restaurant.id,
            isActive: true,
            available: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            priceInCents: true,
            imageUrl: true,
            featured: true,
            dietaryTags: true,
            prepTimeMinutes: true,
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      restaurant: { name: table.restaurant.name },
      table: { name: table.name },
      categories,
    };
  }
}
