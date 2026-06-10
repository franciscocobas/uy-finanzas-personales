-- CreateTable
CREATE TABLE "RecurringCompletion" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,

    CONSTRAINT "RecurringCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringCompletion_conceptId_year_month_key" ON "RecurringCompletion"("conceptId", "year", "month");

-- AddForeignKey
ALTER TABLE "RecurringCompletion" ADD CONSTRAINT "RecurringCompletion_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
