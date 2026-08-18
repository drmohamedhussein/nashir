-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rp_user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_workspace` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rp_workspace_slug_key`(`slug`),
    UNIQUE INDEX `rp_workspace_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_workspace_member` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rp_workspace_member_userId_idx`(`userId`),
    UNIQUE INDEX `rp_workspace_member_workspaceId_userId_key`(`workspaceId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_workspace_invite` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `invitedById` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rp_workspace_invite_workspaceId_idx`(`workspaceId`),
    UNIQUE INDEX `rp_workspace_invite_workspaceId_email_status_key`(`workspaceId`, `email`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_plan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `monthlyPriceCents` INTEGER NOT NULL,
    `yearlyPriceCents` INTEGER NOT NULL,
    `siteLimit` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_plan_entitlement` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `capabilityKey` VARCHAR(191) NOT NULL,
    `isIncluded` BOOLEAN NOT NULL DEFAULT true,
    `quota` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `rp_plan_entitlement_planId_capabilityKey_key`(`planId`, `capabilityKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_site` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `restUrl` VARCHAR(191) NOT NULL,
    `wpVersion` VARCHAR(191) NULL,
    `apiKeyHash` VARCHAR(191) NOT NULL,
    `signingSecret` VARCHAR(191) NOT NULL,
    `connectionTokenHash` VARCHAR(191) NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `bridgeSecretHash` VARCHAR(191) NULL,
    `workerStatus` VARCHAR(191) NOT NULL DEFAULT 'none',
    `workerRef` VARCHAR(191) NULL,
    `connectorType` VARCHAR(191) NOT NULL DEFAULT 'rankpublish',
    `status` VARCHAR(191) NOT NULL DEFAULT 'connected',
    `lastSeenAt` DATETIME(3) NULL,
    `integrationsJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `capabilitiesJson` VARCHAR(191) NOT NULL DEFAULT '[]',
    `schedulerMode` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `autoIntervalMin` INTEGER NOT NULL DEFAULT 60,
    `weekSlots` VARCHAR(191) NOT NULL DEFAULT '{}',
    `allowedTypes` VARCHAR(191) NOT NULL DEFAULT 'post,page',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rp_site_workspaceId_url_key`(`workspaceId`, `url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_pairing_code` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `rp_pairing_code_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_subscription` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NULL,
    `planId` VARCHAR(191) NULL,
    `interval` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'trial',
    `priceCents` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `renewalDate` DATETIME(3) NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rp_subscription_siteId_key`(`siteId`),
    INDEX `rp_subscription_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_editorial_post` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `wpPostId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `postType` VARCHAR(191) NOT NULL DEFAULT 'post',
    `permalink` VARCHAR(191) NULL,
    `excerpt` TEXT NULL,
    `seoTitle` VARCHAR(191) NULL,
    `metaDescription` VARCHAR(191) NULL,
    `keywords` VARCHAR(191) NULL DEFAULT '[]',
    `scheduledAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `unpublishAt` DATETIME(3) NULL,
    `republishAt` DATETIME(3) NULL,
    `advancedAt` DATETIME(3) NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rp_editorial_post_siteId_scheduledAt_idx`(`siteId`, `scheduledAt`),
    UNIQUE INDEX `rp_editorial_post_siteId_wpPostId_key`(`siteId`, `wpPostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_schedule_job` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `wpPostId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL DEFAULT 'publish',
    `runAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rp_schedule_job_status_runAt_idx`(`status`, `runAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_social_account` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NOT NULL DEFAULT '',
    `refreshToken` VARCHAR(191) NOT NULL DEFAULT '',
    `meta` VARCHAR(191) NOT NULL DEFAULT '{}',
    `connected` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rp_social_account_siteId_platform_label_key`(`siteId`, `platform`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_social_template` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rp_social_template_siteId_platform_key`(`siteId`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_social_share_job` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `lastError` VARCHAR(191) NULL,
    `runAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_seo_audit` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `recommendations` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rp_seo_audit_postId_createdAt_idx`(`postId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_command` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `capabilityKey` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `input` TEXT NULL,
    `result` TEXT NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rp_command_workspaceId_status_createdAt_idx`(`workspaceId`, `status`, `createdAt`),
    UNIQUE INDEX `rp_command_workspaceId_idempotencyKey_key`(`workspaceId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `rp_activity_event` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NULL,
    `commandId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rp_activity_event_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rp_sync_state` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `lastCapabilitySyncAt` DATETIME(3) NULL,
    `lastPostSyncAt` DATETIME(3) NULL,
    `postSyncCursor` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rp_sync_state_siteId_key`(`siteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rp_workspace` ADD CONSTRAINT `rp_workspace_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `rp_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_workspace_member` ADD CONSTRAINT `rp_workspace_member_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `rp_workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_workspace_member` ADD CONSTRAINT `rp_workspace_member_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `rp_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_workspace_invite` ADD CONSTRAINT `rp_workspace_invite_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `rp_workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_workspace_invite` ADD CONSTRAINT `rp_workspace_invite_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `rp_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_plan_entitlement` ADD CONSTRAINT `rp_plan_entitlement_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `rp_plan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_site` ADD CONSTRAINT `rp_site_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `rp_workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_pairing_code` ADD CONSTRAINT `rp_pairing_code_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_subscription` ADD CONSTRAINT `rp_subscription_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `rp_workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_subscription` ADD CONSTRAINT `rp_subscription_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_subscription` ADD CONSTRAINT `rp_subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `rp_plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_editorial_post` ADD CONSTRAINT `rp_editorial_post_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_schedule_job` ADD CONSTRAINT `rp_schedule_job_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_schedule_job` ADD CONSTRAINT `rp_schedule_job_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `rp_editorial_post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_social_account` ADD CONSTRAINT `rp_social_account_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_social_template` ADD CONSTRAINT `rp_social_template_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_social_share_job` ADD CONSTRAINT `rp_social_share_job_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_social_share_job` ADD CONSTRAINT `rp_social_share_job_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `rp_editorial_post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_seo_audit` ADD CONSTRAINT `rp_seo_audit_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_seo_audit` ADD CONSTRAINT `rp_seo_audit_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `rp_editorial_post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_command` ADD CONSTRAINT `rp_command_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `rp_workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_command` ADD CONSTRAINT `rp_command_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_command` ADD CONSTRAINT `rp_command_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `rp_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_activity_event` ADD CONSTRAINT `rp_activity_event_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `rp_workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_activity_event` ADD CONSTRAINT `rp_activity_event_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `rp_site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rp_activity_event` ADD CONSTRAINT `rp_activity_event_commandId_fkey` FOREIGN KEY (`commandId`) REFERENCES `rp_command`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

