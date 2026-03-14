/*
  Warnings:

  - You are about to drop the column `fromAccountId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `toAccountId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_conceptId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_fromAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_toAccountId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "fromAccountId",
DROP COLUMN "toAccountId",
ADD COLUMN     "transferId" TEXT,
ALTER COLUMN "conceptId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
