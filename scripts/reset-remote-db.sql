PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS `subscription_items`;
DROP TABLE IF EXISTS `subscriptions`;

DROP TABLE IF EXISTS `auth_accounts`;
DROP TABLE IF EXISTS `auth_sessions`;
DROP TABLE IF EXISTS `auth_verifications`;
DROP TABLE IF EXISTS `auth_users`;
DROP TABLE IF EXISTS `users`;

DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `resumes`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `sessions`;

DROP TABLE IF EXISTS `seo_pages`;
DROP TABLE IF EXISTS `job_redirects`;
DROP TABLE IF EXISTS `job_removals`;
DROP TABLE IF EXISTS `job_logos`;

DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `contracts`;
DROP TABLE IF EXISTS `countries`;
DROP TABLE IF EXISTS `country_groups`;

DROP TABLE IF EXISTS `cloudflare_events`;
DROP TABLE IF EXISTS `direct_traffic`;
DROP TABLE IF EXISTS `failed_jobs`;
DROP TABLE IF EXISTS `app_meta`;

DROP TABLE IF EXISTS `__drizzle_migrations`;
DROP TABLE IF EXISTS `d1_migrations`;
DROP TABLE IF EXISTS `__migrations`;

PRAGMA foreign_keys = ON;
