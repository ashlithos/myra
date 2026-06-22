CREATE TABLE `affinities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`buddy_id` integer NOT NULL,
	`experience_id` integer NOT NULL,
	`tier` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`buddy_id`) REFERENCES `buddies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `buddies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
