PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CardPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "purchaseDate" DATETIME NOT NULL,
    "installments" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardPurchase_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CardPurchase" ("amount", "cardId", "createdAt", "description", "id", "installments", "purchaseDate", "title", "updatedAt")
SELECT "amount", "cardId", "createdAt", "description", "id", "installments", "purchaseDate", COALESCE(NULLIF(TRIM("description"), ''), 'Compra'), "updatedAt"
FROM "CardPurchase";
DROP TABLE "CardPurchase";
ALTER TABLE "new_CardPurchase" RENAME TO "CardPurchase";
CREATE INDEX "CardPurchase_cardId_idx" ON "CardPurchase"("cardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
