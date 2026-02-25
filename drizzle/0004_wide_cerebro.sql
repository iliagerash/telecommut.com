ALTER TABLE `categories` ADD `slug` text;--> statement-breakpoint
ALTER TABLE `categories` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);