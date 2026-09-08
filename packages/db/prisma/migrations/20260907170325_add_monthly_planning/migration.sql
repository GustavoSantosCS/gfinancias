-- CreateTable
CREATE TABLE "MonthlyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlanningPhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDay" INTEGER NOT NULL,
    "endDay" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanningPhase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MonthlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannedIncome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannedIncome_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "PlanningPhase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannedExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannedExpense_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "PlanningPhase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPlan_year_month_key" ON "MonthlyPlan"("year", "month");

-- CreateIndex
CREATE INDEX "PlanningPhase_planId_idx" ON "PlanningPhase"("planId");

-- CreateIndex
CREATE INDEX "PlannedIncome_phaseId_idx" ON "PlannedIncome"("phaseId");

-- CreateIndex
CREATE INDEX "PlannedExpense_phaseId_idx" ON "PlannedExpense"("phaseId");
