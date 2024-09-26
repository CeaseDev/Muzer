-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('GOOGLE', 'Spotify');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Streamer', 'EndUser');

-- CreateEnum
CREATE TYPE "StreamType" AS ENUM ('Youtube', 'Spotify');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streams" (
    "id" TEXT NOT NULL,
    "type" "StreamType" NOT NULL,
    "active" BOOLEAN NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upvotes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,

    CONSTRAINT "Upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Upvotes_userId_streamId_key" ON "Upvotes"("userId", "streamId");

-- AddForeignKey
ALTER TABLE "Streams" ADD CONSTRAINT "Streams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upvotes" ADD CONSTRAINT "Upvotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upvotes" ADD CONSTRAINT "Upvotes_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Streams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
