-- Keep old orders unchanged while making session membership available for new ones.
CREATE TYPE "DiningSessionStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "DiningSession" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "status" "DiningSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedTotalInCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DiningSession_closed_fields_check" CHECK (
        ("status" = 'OPEN' AND "closedAt" IS NULL AND "closedTotalInCents" IS NULL)
        OR
        ("status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "closedTotalInCents" IS NOT NULL AND "closedTotalInCents" >= 0)
    )
);

ALTER TABLE "Order" ADD COLUMN "diningSessionId" UUID;

CREATE UNIQUE INDEX "DiningSession_id_restaurantId_key"
    ON "DiningSession"("id", "restaurantId");
CREATE UNIQUE INDEX "DiningSession_id_tableId_restaurantId_key"
    ON "DiningSession"("id", "tableId", "restaurantId");
CREATE INDEX "DiningSession_restaurantId_status_openedAt_idx"
    ON "DiningSession"("restaurantId", "status", "openedAt");
CREATE INDEX "DiningSession_tableId_status_openedAt_idx"
    ON "DiningSession"("tableId", "status", "openedAt");
CREATE UNIQUE INDEX "DiningSession_one_open_per_table_key"
    ON "DiningSession"("tableId") WHERE "status" = 'OPEN';
CREATE INDEX "Order_diningSessionId_restaurantId_status_idx"
    ON "Order"("diningSessionId", "restaurantId", "status");

ALTER TABLE "DiningSession"
    ADD CONSTRAINT "DiningSession_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiningSession"
    ADD CONSTRAINT "DiningSession_tableId_restaurantId_fkey"
    FOREIGN KEY ("tableId", "restaurantId") REFERENCES "RestaurantTable"("id", "restaurantId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order"
    ADD CONSTRAINT "Order_diningSessionId_tableId_restaurantId_fkey"
    FOREIGN KEY ("diningSessionId", "tableId", "restaurantId")
    REFERENCES "DiningSession"("id", "tableId", "restaurantId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
