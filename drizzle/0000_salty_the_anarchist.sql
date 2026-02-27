CREATE TABLE `app_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(191) NOT NULL,
	`value` text NOT NULL,
	`created_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `app_meta_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_meta_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`id` varchar(191) NOT NULL,
	`user_id` int NOT NULL,
	`account_id` varchar(191) NOT NULL,
	`provider_id` varchar(191) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(0),
	`refresh_token_expires_at` timestamp(0),
	`scope` text,
	`password` text,
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	CONSTRAINT `auth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_accounts_provider_account_unique` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(191) NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp(0) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` varchar(191) NOT NULL,
	`role` text NOT NULL DEFAULT ('candidate'),
	`email_verified` boolean NOT NULL DEFAULT false,
	`email_verified_at` timestamp(0),
	`image` text,
	`remember_token` text,
	`candidate_name` text NOT NULL DEFAULT (''),
	`candidate_phone` text NOT NULL DEFAULT (''),
	`candidate_photo` text NOT NULL DEFAULT (''),
	`company_name` text NOT NULL DEFAULT (''),
	`company_phone` text NOT NULL DEFAULT (''),
	`company_contact` text NOT NULL DEFAULT (''),
	`company_description` text,
	`company_logo` text NOT NULL DEFAULT (''),
	`subscribe` int NOT NULL DEFAULT 0,
	`subscribe_partners` int NOT NULL DEFAULT 0,
	`deleted_at` timestamp(0),
	`stripe_id` text,
	`pm_type` text,
	`pm_last_four` text,
	`trial_ends_at` timestamp(0),
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	CONSTRAINT `auth_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `auth_verifications` (
	`id` varchar(191) NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`value` varchar(255) NOT NULL,
	`expires_at` timestamp(0) NOT NULL,
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	CONSTRAINT `auth_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` varchar(191),
	`description` text NOT NULL DEFAULT (''),
	`page_text` text NOT NULL DEFAULT (''),
	`meta_title` text NOT NULL DEFAULT (''),
	`icon` text NOT NULL DEFAULT ('fa-check-circle'),
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	`coverage_state` text NOT NULL DEFAULT (''),
	`inspection_url` text NOT NULL DEFAULT (''),
	`crawled_at` timestamp(0),
	`bing_crawled_at` timestamp(0),
	`submitted_at` timestamp(0),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `cloudflare_events` (
	`ray_name` varchar(191) NOT NULL,
	`action` text NOT NULL,
	`asn` text,
	`asn_description` text,
	`country` text NOT NULL,
	`ip` text NOT NULL,
	`http_host` text NOT NULL,
	`http_method` text,
	`request_path` text,
	`user_agent` text,
	`status` int,
	`rule_id` text,
	`created_at` timestamp(0) NOT NULL,
	CONSTRAINT `cloudflare_events_ray_name` PRIMARY KEY(`ray_name`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`created_at` timestamp(0),
	`updated_at` timestamp(0),
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`code` text NOT NULL,
	`weight` int NOT NULL DEFAULT 100,
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	CONSTRAINT `countries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `country_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`countries` text NOT NULL,
	`weight` int NOT NULL DEFAULT 100,
	`created_at` timestamp(0),
	`updated_at` timestamp(0),
	CONSTRAINT `country_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `direct_traffic` (
	`id` int AUTO_INCREMENT NOT NULL,
	`traffic_date` varchar(32) NOT NULL,
	`bypass_bots` text,
	`false_positives` text,
	`total_nginx_requests` int NOT NULL DEFAULT 0,
	`total_cloudflare_events` int NOT NULL DEFAULT 0,
	`cloudflare_blocks` int NOT NULL DEFAULT 0,
	`cloudflare_challenges` int NOT NULL DEFAULT 0,
	CONSTRAINT `direct_traffic_id` PRIMARY KEY(`id`),
	CONSTRAINT `direct_traffic_traffic_date_unique` UNIQUE(`traffic_date`)
);
--> statement-breakpoint
CREATE TABLE `job_logos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`external_company_id` int NOT NULL,
	`company_logo` text NOT NULL,
	`created_at` timestamp(0),
	`updated_at` timestamp(0),
	CONSTRAINT `job_logos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_removals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` int NOT NULL DEFAULT 0,
	`position` text NOT NULL DEFAULT (''),
	`expired_at` timestamp(0),
	`indexed` int NOT NULL DEFAULT 0,
	CONSTRAINT `job_removals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL DEFAULT 1,
	`category_id` int NOT NULL,
	`country_id` int NOT NULL,
	`country_groups` text NOT NULL DEFAULT (''),
	`url` text NOT NULL DEFAULT (''),
	`position` text NOT NULL,
	`company_name` text NOT NULL,
	`company_logo` text NOT NULL DEFAULT (''),
	`salary_min` double NOT NULL DEFAULT 0,
	`salary_max` double NOT NULL DEFAULT 0,
	`currency` text NOT NULL DEFAULT ('USD'),
	`salary_period` text NOT NULL DEFAULT ('hour'),
	`published` timestamp(0) NOT NULL,
	`expires` timestamp(0),
	`skills` text NOT NULL DEFAULT (''),
	`description` text NOT NULL,
	`apply_text` text NOT NULL,
	`contract_code` text NOT NULL DEFAULT ('full_time'),
	`status` int NOT NULL DEFAULT 1,
	`google_crawled` int NOT NULL DEFAULT 0,
	`google_crawled_at` timestamp(0),
	`bing_crawled` int NOT NULL DEFAULT 0,
	`bing_crawled_at` timestamp(0),
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL DEFAULT 1,
	`category_id` int NOT NULL,
	`country_id` int NOT NULL,
	`position` text NOT NULL,
	`salary_min` double NOT NULL DEFAULT 0,
	`currency` text NOT NULL DEFAULT ('USD'),
	`salary_period` text NOT NULL DEFAULT ('hour'),
	`description` text NOT NULL,
	`skills` text NOT NULL DEFAULT (''),
	`contract_code` text NOT NULL DEFAULT ('full_time'),
	`status` int NOT NULL DEFAULT 1,
	`created_at` timestamp(0) NOT NULL,
	`updated_at` timestamp(0) NOT NULL,
	CONSTRAINT `resumes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`coverage_state` text NOT NULL DEFAULT (''),
	`inspection_url` text NOT NULL DEFAULT (''),
	`crawled_at` timestamp(0),
	`bing_crawled_at` timestamp(0),
	`submitted_at` timestamp(0),
	CONSTRAINT `seo_pages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscription_id` int NOT NULL,
	`stripe_id` varchar(191) NOT NULL,
	`stripe_product` text NOT NULL,
	`stripe_price` text NOT NULL,
	`quantity` int,
	`created_at` timestamp(0),
	`updated_at` timestamp(0),
	CONSTRAINT `subscription_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_items_stripe_id_unique` UNIQUE(`stripe_id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` text NOT NULL,
	`stripe_id` varchar(191) NOT NULL,
	`stripe_status` text NOT NULL,
	`stripe_price` text,
	`quantity` int,
	`trial_ends_at` timestamp(0),
	`ends_at` timestamp(0),
	`created_at` timestamp(0),
	`updated_at` timestamp(0),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_stripe_id_unique` UNIQUE(`stripe_id`)
);
