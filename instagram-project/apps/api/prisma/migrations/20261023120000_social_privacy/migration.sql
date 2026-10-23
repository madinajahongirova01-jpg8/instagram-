-- CreateEnum
CREATE TYPE "StoryAudience" AS ENUM ('EVERYONE', 'FOLLOWERS', 'CLOSE_FRIENDS');

-- AlterEnum
ALTER TYPE "Audience" ADD VALUE 'FOLLOWING';

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "audience" "StoryAudience" NOT NULL DEFAULT 'EVERYONE';

-- CreateTable
CREATE TABLE "SavedPost" (
    "userId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "CloseFriend" (
    "userId" UUID NOT NULL,
    "friendId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CloseFriend_pkey" PRIMARY KEY ("userId","friendId")
);

-- CreateTable
CREATE TABLE "StoryHide" (
    "userId" UUID NOT NULL,
    "hiddenUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryHide_pkey" PRIMARY KEY ("userId","hiddenUserId")
);

-- CreateIndex
CREATE INDEX "SavedPost_userId_createdAt_idx" ON "SavedPost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CloseFriend_friendId_idx" ON "CloseFriend"("friendId");

-- CreateIndex
CREATE INDEX "StoryHide_hiddenUserId_idx" ON "StoryHide"("hiddenUserId");

-- AddForeignKey
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloseFriend" ADD CONSTRAINT "CloseFriend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryHide" ADD CONSTRAINT "StoryHide_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryHide" ADD CONSTRAINT "StoryHide_hiddenUserId_fkey" FOREIGN KEY ("hiddenUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

