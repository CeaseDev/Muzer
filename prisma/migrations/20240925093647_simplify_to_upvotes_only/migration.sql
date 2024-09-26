/*
  Warnings:

  - You are about to drop the column `type` on the `Vote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,trackId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "upVotes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "type";

-- DropEnum
DROP TYPE "VoteType";

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_trackId_key" ON "Vote"("userId", "trackId");
