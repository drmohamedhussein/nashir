SET @db = DATABASE();

SET @has_stripe_customer := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rp_subscription' AND COLUMN_NAME='stripeCustomerId');
SET @has_paypal_payer := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rp_subscription' AND COLUMN_NAME='paypalPayerId');
SET @ddl1 := IF(@has_stripe_customer=1 AND @has_paypal_payer=0,'ALTER TABLE rp_subscription CHANGE stripeCustomerId paypalPayerId VARCHAR(191) NULL','SELECT 1');
PREPARE s1 FROM @ddl1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @has_stripe_sub := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rp_subscription' AND COLUMN_NAME='stripeSubscriptionId');
SET @has_paypal_sub := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rp_subscription' AND COLUMN_NAME='paypalSubscriptionId');
SET @ddl2 := IF(@has_stripe_sub=1 AND @has_paypal_sub=0,'ALTER TABLE rp_subscription CHANGE stripeSubscriptionId paypalSubscriptionId VARCHAR(191) NULL','SELECT 1');
PREPARE s2 FROM @ddl2; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @add_payer := IF(@has_paypal_payer=0 AND @has_stripe_customer=0,'ALTER TABLE rp_subscription ADD COLUMN paypalPayerId VARCHAR(191) NULL','SELECT 1');
PREPARE s3 FROM @add_payer; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @add_sub := IF(@has_paypal_sub=0 AND @has_stripe_sub=0,'ALTER TABLE rp_subscription ADD COLUMN paypalSubscriptionId VARCHAR(191) NULL','SELECT 1');
PREPARE s4 FROM @add_sub; EXECUTE s4; DEALLOCATE PREPARE s4;

SET @has_connector := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rp_site' AND COLUMN_NAME='connectorType');
SET @ddl5 := IF(@has_connector=0,'ALTER TABLE rp_site ADD COLUMN connectorType VARCHAR(191) NOT NULL DEFAULT ''rankpublish''','SELECT 1');
PREPARE s5 FROM @ddl5; EXECUTE s5; DEALLOCATE PREPARE s5;

SET @has_worker_ref := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rp_site' AND COLUMN_NAME='workerRef');
SET @ddl6 := IF(@has_worker_ref=0,'ALTER TABLE rp_site ADD COLUMN workerRef VARCHAR(191) NULL','SELECT 1');
PREPARE s6 FROM @ddl6; EXECUTE s6; DEALLOCATE PREPARE s6;

CREATE TABLE IF NOT EXISTS rp_sync_state (
  id VARCHAR(191) NOT NULL,
  siteId VARCHAR(191) NOT NULL,
  lastCapabilitySyncAt DATETIME(3) NULL,
  lastPostSyncAt DATETIME(3) NULL,
  postSyncCursor VARCHAR(191) NULL,
  updatedAt DATETIME(3) NOT NULL,
  UNIQUE INDEX rp_sync_state_siteId_key(siteId),
  PRIMARY KEY(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE rp_plan SET monthlyPriceCents=999, yearlyPriceCents=9900, isActive=1 WHERE id='starter';
UPDATE rp_plan SET isActive=0 WHERE id IN ('growth','scale');

SELECT 'schema_ok' AS status;
