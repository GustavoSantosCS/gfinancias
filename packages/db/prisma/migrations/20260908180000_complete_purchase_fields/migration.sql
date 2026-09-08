ALTER TABLE "CardPurchase" ADD COLUMN "amount" INTEGER NOT NULL DEFAULT 0;
UPDATE "CardPurchase"
SET "amount" = COALESCE((SELECT SUM("amount") FROM "CardInstallment" WHERE "purchaseId" = "CardPurchase"."id"), 0);
ALTER TABLE "CardAnticipation" ADD COLUMN "description" TEXT NOT NULL DEFAULT 'Anticipation';
