-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "limit" INTEGER,
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "lastDigits" TEXT,
    "brand" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "CardPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "installments" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardPurchase_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "CardAnticipation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "mode" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardAnticipation_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CardPurchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "CardInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "anticipationId" TEXT,
    "number" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "competenceYear" INTEGER NOT NULL,
    "competenceMonth" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'REGULAR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardInstallment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CardPurchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardInstallment_anticipationId_fkey" FOREIGN KEY ("anticipationId") REFERENCES "CardAnticipation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Card_normalizedName_key" ON "Card"("normalizedName");
CREATE INDEX "CardPurchase_cardId_idx" ON "CardPurchase"("cardId");
CREATE INDEX "CardAnticipation_purchaseId_idx" ON "CardAnticipation"("purchaseId");
CREATE INDEX "CardInstallment_competenceYear_competenceMonth_idx" ON "CardInstallment"("competenceYear", "competenceMonth");
CREATE INDEX "CardInstallment_purchaseId_idx" ON "CardInstallment"("purchaseId");
CREATE INDEX "CardInstallment_anticipationId_idx" ON "CardInstallment"("anticipationId");
