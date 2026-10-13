-- CreateTable
CREATE TABLE "CatalogCategory" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceInCents" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "dietaryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prepTimeMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogCategory_restaurantId_displayOrder_name_idx" ON "CatalogCategory"("restaurantId", "displayOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCategory_restaurantId_nameNormalized_key" ON "CatalogCategory"("restaurantId", "nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCategory_id_restaurantId_key" ON "CatalogCategory"("id", "restaurantId");

-- CreateIndex
CREATE INDEX "CatalogProduct_restaurantId_isActive_categoryId_idx" ON "CatalogProduct"("restaurantId", "isActive", "categoryId");

-- CreateIndex
CREATE INDEX "CatalogProduct_restaurantId_isActive_name_idx" ON "CatalogProduct"("restaurantId", "isActive", "name");

-- AddForeignKey
ALTER TABLE "CatalogCategory" ADD CONSTRAINT "CatalogCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_categoryId_restaurantId_fkey" FOREIGN KEY ("categoryId", "restaurantId") REFERENCES "CatalogCategory"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
