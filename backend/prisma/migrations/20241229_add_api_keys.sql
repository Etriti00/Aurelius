-- Add API Keys table for external service authentication
-- Migration: Add API Keys table
-- Date: 2024-12-29

-- Create API Keys table
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "permissions" JSONB DEFAULT '{}',
    "
    
    -- Status and lifecycle
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    
    -- Usage tracking
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIP" TEXT,
    "lastUsedUserAgent" TEXT,
    
    -- Rate limiting
    "rateLimit" INTEGER DEFAULT 1000, -- requests per hour
    "rateLimitWindow" INTEGER DEFAULT 3600, -- seconds
    "rateLimitReset" TIMESTAMP(3),
    
    -- Security
    "allowedIPs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredHeaders" JSONB DEFAULT '{}',
    
    -- Expiration
    "expiresAt" TIMESTAMP(3),
    "expirationWarned" BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    "environment" TEXT DEFAULT 'production', -- production, staging, development
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB DEFAULT '{}',
    
    -- Audit
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- Create API Key Usage Logs table
CREATE TABLE "ApiKeyUsageLog" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Request details
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    
    -- Response details
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER, -- milliseconds
    "requestSize" INTEGER, -- bytes
    "responseSize" INTEGER, -- bytes
    
    -- Security
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "riskScore" FLOAT DEFAULT 0.0, -- 0.0 to 1.0
    
    -- Metadata
    "requestHeaders" JSONB DEFAULT '{}',
    "requestBody" TEXT,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB DEFAULT '{}',
    
    -- Timestamp
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyUsageLog_pkey" PRIMARY KEY ("id")
);

-- Create API Key Rate Limit table for tracking rate limits
CREATE TABLE "ApiKeyRateLimit" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "endpoint" TEXT,
    
    -- Rate limit tracking
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "limitExceeded" BOOLEAN NOT NULL DEFAULT false,
    "blockedUntil" TIMESTAMP(3),
    
    -- Metadata
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKeyRateLimit_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApiKeyUsageLog" ADD CONSTRAINT "ApiKeyUsageLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKeyUsageLog" ADD CONSTRAINT "ApiKeyUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKeyRateLimit" ADD CONSTRAINT "ApiKeyRateLimit_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");
CREATE INDEX "ApiKey_isRevoked_idx" ON "ApiKey"("isRevoked");
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");
CREATE INDEX "ApiKey_lastUsedAt_idx" ON "ApiKey"("lastUsedAt");
CREATE INDEX "ApiKey_environment_idx" ON "ApiKey"("environment");
CREATE INDEX "ApiKey_createdAt_idx" ON "ApiKey"("createdAt");

CREATE INDEX "ApiKeyUsageLog_apiKeyId_idx" ON "ApiKeyUsageLog"("apiKeyId");
CREATE INDEX "ApiKeyUsageLog_userId_idx" ON "ApiKeyUsageLog"("userId");
CREATE INDEX "ApiKeyUsageLog_timestamp_idx" ON "ApiKeyUsageLog"("timestamp");
CREATE INDEX "ApiKeyUsageLog_ipAddress_idx" ON "ApiKeyUsageLog"("ipAddress");
CREATE INDEX "ApiKeyUsageLog_endpoint_idx" ON "ApiKeyUsageLog"("endpoint");
CREATE INDEX "ApiKeyUsageLog_statusCode_idx" ON "ApiKeyUsageLog"("statusCode");
CREATE INDEX "ApiKeyUsageLog_blocked_idx" ON "ApiKeyUsageLog"("blocked");

CREATE INDEX "ApiKeyRateLimit_apiKeyId_idx" ON "ApiKeyRateLimit"("apiKeyId");
CREATE INDEX "ApiKeyRateLimit_ipAddress_idx" ON "ApiKeyRateLimit"("ipAddress");
CREATE INDEX "ApiKeyRateLimit_endpoint_idx" ON "ApiKeyRateLimit"("endpoint");
CREATE INDEX "ApiKeyRateLimit_windowStart_idx" ON "ApiKeyRateLimit"("windowStart");
CREATE INDEX "ApiKeyRateLimit_windowEnd_idx" ON "ApiKeyRateLimit"("windowEnd");
CREATE INDEX "ApiKeyRateLimit_blockedUntil_idx" ON "ApiKeyRateLimit"("blockedUntil");

-- Create unique constraint for key hash
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- Create composite indexes for common queries
CREATE INDEX "ApiKey_userId_isActive_idx" ON "ApiKey"("userId", "isActive");
CREATE INDEX "ApiKey_keyHash_isActive_idx" ON "ApiKey"("keyHash", "isActive");
CREATE INDEX "ApiKeyUsageLog_apiKeyId_timestamp_idx" ON "ApiKeyUsageLog"("apiKeyId", "timestamp");
CREATE INDEX "ApiKeyRateLimit_apiKeyId_windowStart_idx" ON "ApiKeyRateLimit"("apiKeyId", "windowStart");