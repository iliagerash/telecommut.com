CREATE TABLE `app_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_meta_key_unique` ON `app_meta` (`key`);--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_provider_account_unique` ON `auth_accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_unique` ON `auth_sessions` (`token`);--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'candidate' NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`email_verified_at` text,
	`image` text,
	`remember_token` text,
	`candidate_name` text DEFAULT '' NOT NULL,
	`candidate_phone` text DEFAULT '' NOT NULL,
	`candidate_photo` text DEFAULT '' NOT NULL,
	`company_name` text DEFAULT '' NOT NULL,
	`company_phone` text DEFAULT '' NOT NULL,
	`company_contact` text DEFAULT '' NOT NULL,
	`company_description` text,
	`company_logo` text DEFAULT '' NOT NULL,
	`subscribe` integer DEFAULT 0 NOT NULL,
	`subscribe_partners` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	`stripe_id` text,
	`pm_type` text,
	`pm_last_four` text,
	`trial_ends_at` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_email_unique` ON `auth_users` (`email`);--> statement-breakpoint
CREATE TABLE `auth_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text,
	`description` text DEFAULT '' NOT NULL,
	`page_text` text DEFAULT '' NOT NULL,
	`meta_title` text DEFAULT '' NOT NULL,
	`icon` text DEFAULT 'fa-check-circle' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`coverage_state` text DEFAULT '' NOT NULL,
	`inspection_url` text DEFAULT '' NOT NULL,
	`crawled_at` text,
	`bing_crawled_at` text,
	`submitted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `cloudflare_events` (
	`ray_name` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`asn` text,
	`asn_description` text,
	`country` text NOT NULL,
	`ip` text NOT NULL,
	`http_host` text NOT NULL,
	`http_method` text,
	`request_path` text,
	`user_agent` text,
	`status` integer,
	`rule_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`code` text NOT NULL,
	`weight` integer DEFAULT 100 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `country_groups` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`countries` text NOT NULL,
	`weight` integer DEFAULT 100 NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `direct_traffic` (
	`id` integer PRIMARY KEY NOT NULL,
	`traffic_date` text NOT NULL,
	`bypass_bots` text,
	`false_positives` text,
	`total_nginx_requests` integer DEFAULT 0 NOT NULL,
	`total_cloudflare_events` integer DEFAULT 0 NOT NULL,
	`cloudflare_blocks` integer DEFAULT 0 NOT NULL,
	`cloudflare_challenges` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `direct_traffic_traffic_date_unique` ON `direct_traffic` (`traffic_date`);--> statement-breakpoint
CREATE TABLE `job_logos` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_company_id` integer NOT NULL,
	`company_logo` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `job_removals` (
	`id` integer PRIMARY KEY NOT NULL,
	`category_id` integer DEFAULT 0 NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`expired_at` text,
	`indexed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer DEFAULT 1 NOT NULL,
	`category_id` integer NOT NULL,
	`country_id` integer NOT NULL,
	`country_groups` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`position` text NOT NULL,
	`company_name` text NOT NULL,
	`company_logo` text DEFAULT '' NOT NULL,
	`salary_min` real DEFAULT 0 NOT NULL,
	`salary_max` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`salary_period` text DEFAULT 'hour' NOT NULL,
	`published` text NOT NULL,
	`expires` text,
	`skills` text DEFAULT '' NOT NULL,
	`description` text NOT NULL,
	`apply_text` text NOT NULL,
	`contract_code` text DEFAULT 'full_time' NOT NULL,
	`status` integer DEFAULT 1 NOT NULL,
	`google_crawled` integer DEFAULT 0 NOT NULL,
	`google_crawled_at` text,
	`bing_crawled` integer DEFAULT 0 NOT NULL,
	`bing_crawled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer DEFAULT 1 NOT NULL,
	`category_id` integer NOT NULL,
	`country_id` integer NOT NULL,
	`position` text NOT NULL,
	`salary_min` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`salary_period` text DEFAULT 'hour' NOT NULL,
	`description` text NOT NULL,
	`skills` text DEFAULT '' NOT NULL,
	`contract_code` text DEFAULT 'full_time' NOT NULL,
	`status` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seo_pages` (
	`id` integer PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`coverage_state` text DEFAULT '' NOT NULL,
	`inspection_url` text DEFAULT '' NOT NULL,
	`crawled_at` text,
	`bing_crawled_at` text,
	`submitted_at` text
);
--> statement-breakpoint
CREATE TABLE `subscription_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`subscription_id` integer NOT NULL,
	`stripe_id` text NOT NULL,
	`stripe_product` text NOT NULL,
	`stripe_price` text NOT NULL,
	`quantity` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_items_stripe_id_unique` ON `subscription_items` (`stripe_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`stripe_id` text NOT NULL,
	`stripe_status` text NOT NULL,
	`stripe_price` text,
	`quantity` integer,
	`trial_ends_at` text,
	`ends_at` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_id_unique` ON `subscriptions` (`stripe_id`);