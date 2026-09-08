-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CardAnticipation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "mode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardAnticipation_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CardPurchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CardAnticipation" ("createdAt", "date", "description", "id", "mode", "purchaseId", "snapshot") SELECT "createdAt", "date", "description", "id", "mode", "purchaseId", "snapshot" FROM "CardAnticipation";
DROP TABLE "CardAnticipation";
ALTER TABLE "new_CardAnticipation" RENAME TO "CardAnticipation";
CREATE INDEX "CardAnticipation_purchaseId_idx" ON "CardAnticipation"("purchaseId");
CREATE TABLE "new_CardPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "installments" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardPurchase_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CardPurchase" ("amount", "cardId", "createdAt", "description", "id", "installments", "purchaseDate", "updatedAt") SELECT "amount", "cardId", "createdAt", "description", "id", "installments", "purchaseDate", "updatedAt" FROM "CardPurchase";
DROP TABLE "CardPurchase";
ALTER TABLE "new_CardPurchase" RENAME TO "CardPurchase";
CREATE INDEX "CardPurchase_cardId_idx" ON "CardPurchase"("cardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
