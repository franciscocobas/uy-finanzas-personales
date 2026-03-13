/*
  Warnings:

  - A unique constraint covering the columns `[name,categoryId]` on the table `Concept` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Concept_name_categoryId_key" ON "Concept"("name", "categoryId");
