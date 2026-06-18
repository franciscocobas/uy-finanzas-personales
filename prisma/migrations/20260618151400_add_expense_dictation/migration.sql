-- CreateTable
CREATE TABLE "ExpenseDictation" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseDictation_pkey" PRIMARY KEY ("id")
);
