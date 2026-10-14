-- Persist the browser request key so a retry after a lost response can return
-- the original order instead of creating a duplicate.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" UUID;

CREATE UNIQUE INDEX "Order_tableId_idempotencyKey_key"
ON "Order"("tableId", "idempotencyKey");
