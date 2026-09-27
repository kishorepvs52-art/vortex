-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'EXPERT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PROCESSING', 'AI_COMPLETED', 'EXPERT_REVIEW_PENDING', 'EXPERT_REVIEWED', 'FAILED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVE_AI', 'CORRECTED');

-- CreateEnum
CREATE TYPE "PathogenType" AS ENUM ('FUNGAL', 'BACTERIAL', 'VIRAL', 'NUTRITIONAL', 'PEST', 'PHYSIOLOGICAL', 'HEALTHY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GuidanceSource" AS ENUM ('AI', 'EXPERT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ANALYSIS_COMPLETE', 'ANALYSIS_FAILED', 'EXPERT_REVIEW_NEEDED', 'EXPERT_REVIEW_ASSIGNED', 'EXPERT_REVIEW_COMPLETED', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FARMER',
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "village" TEXT,
    "district" TEXT,
    "state" TEXT,
    "farmSizeAcres" DOUBLE PRECISION,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualification" TEXT,
    "licenseNumber" TEXT,
    "yearsExperience" INTEGER,
    "bio" TEXT,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "family" TEXT,
    "description" TEXT,
    "emoji" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disease" (
    "id" TEXT NOT NULL,
    "cropTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pathogenType" "PathogenType" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "visibleSigns" TEXT,
    "defaultSeverity" "Severity" NOT NULL DEFAULT 'MODERATE',
    "treatmentSummary" TEXT NOT NULL,
    "preventiveSummary" TEXT NOT NULL,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedImage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "thumbKey" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropAnalysis" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "cropTypeId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PROCESSING',
    "symptoms" TEXT,
    "locationText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIResult" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "predictedDiseaseId" TEXT,
    "predictedLabel" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MODERATE',
    "healthy" BOOLEAN NOT NULL DEFAULT false,
    "indicators" JSONB,
    "reasoning" TEXT,
    "needsExpertReview" BOOLEAN NOT NULL DEFAULT false,
    "processingTimeMs" INTEGER,
    "modelVersion" TEXT,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertReview" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "expertId" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "ReviewDecision",
    "finalDiseaseId" TEXT,
    "finalSeverity" "Severity",
    "confidenceNote" TEXT,
    "treatmentGuidance" TEXT,
    "preventiveAdvice" TEXT,
    "comments" TEXT,
    "requestedByFarmer" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentGuidance" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "source" "GuidanceSource" NOT NULL,
    "title" TEXT,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentGuidance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "analysisId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerProfile_userId_key" ON "FarmerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertProfile_userId_key" ON "ExpertProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CropType_name_key" ON "CropType"("name");

-- CreateIndex
CREATE INDEX "Disease_cropTypeId_idx" ON "Disease"("cropTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Disease_cropTypeId_name_key" ON "Disease"("cropTypeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedImage_storageKey_key" ON "UploadedImage"("storageKey");

-- CreateIndex
CREATE INDEX "CropAnalysis_farmerId_createdAt_idx" ON "CropAnalysis"("farmerId", "createdAt");

-- CreateIndex
CREATE INDEX "CropAnalysis_status_idx" ON "CropAnalysis"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AIResult_analysisId_key" ON "AIResult"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpertReview_analysisId_key" ON "ExpertReview"("analysisId");

-- CreateIndex
CREATE INDEX "ExpertReview_status_idx" ON "ExpertReview"("status");

-- CreateIndex
CREATE INDEX "ExpertReview_expertId_idx" ON "ExpertReview"("expertId");

-- CreateIndex
CREATE INDEX "TreatmentGuidance_analysisId_idx" ON "TreatmentGuidance"("analysisId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "FarmerProfile" ADD CONSTRAINT "FarmerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertProfile" ADD CONSTRAINT "ExpertProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disease" ADD CONSTRAINT "Disease_cropTypeId_fkey" FOREIGN KEY ("cropTypeId") REFERENCES "CropType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedImage" ADD CONSTRAINT "UploadedImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropAnalysis" ADD CONSTRAINT "CropAnalysis_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropAnalysis" ADD CONSTRAINT "CropAnalysis_cropTypeId_fkey" FOREIGN KEY ("cropTypeId") REFERENCES "CropType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropAnalysis" ADD CONSTRAINT "CropAnalysis_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "UploadedImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResult" ADD CONSTRAINT "AIResult_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CropAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResult" ADD CONSTRAINT "AIResult_predictedDiseaseId_fkey" FOREIGN KEY ("predictedDiseaseId") REFERENCES "Disease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CropAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpertReview" ADD CONSTRAINT "ExpertReview_finalDiseaseId_fkey" FOREIGN KEY ("finalDiseaseId") REFERENCES "Disease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentGuidance" ADD CONSTRAINT "TreatmentGuidance_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CropAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CropAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
