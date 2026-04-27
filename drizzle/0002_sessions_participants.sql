PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `sessions_owner_id_idx` ON `sessions` (`owner_id`);--> statement-breakpoint
CREATE INDEX `sessions_created_at_idx` ON `sessions` (`created_at`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `participants_session_id_idx` ON `participants` (`session_id`);--> statement-breakpoint
CREATE INDEX `participants_user_id_idx` ON `participants` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `participants_session_user_unique_idx` ON `participants` (`session_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `session_packet_map` (
	`owner_id` text NOT NULL,
	`packet_id` text NOT NULL,
	`session_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `packet_id`)
);--> statement-breakpoint
INSERT INTO `session_packet_map` (`owner_id`, `packet_id`, `session_id`, `created_at`)
SELECT `owner_id`, `packet_id`, lower(hex(randomblob(16))), MIN(`created_at`)
FROM `documents`
GROUP BY `owner_id`, `packet_id`;--> statement-breakpoint
INSERT INTO `sessions` (`id`, `owner_id`, `created_at`)
SELECT `session_id`, `owner_id`, `created_at`
FROM `session_packet_map`;--> statement-breakpoint
INSERT INTO `participants` (`id`, `session_id`, `user_id`, `role`, `created_at`)
SELECT lower(hex(randomblob(16))), s.`id`, s.`owner_id`, 'leader', s.`created_at`
FROM `sessions` s;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`owner_id` text NOT NULL,
	`session_id` text NOT NULL,
	`filename` text NOT NULL,
	`url` text NOT NULL,
	`download_url` text NOT NULL,
	`bucket_path` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_documents`("id", "owner_id", "session_id", "filename", "url", "download_url", "bucket_path", "created_at", "status")
SELECT d.`id`, d.`owner_id`, m.`session_id`, d.`filename`, d.`url`, d.`download_url`, d.`bucket_path`, d.`created_at`, d.`status`
FROM `documents` d
JOIN `session_packet_map` m
	ON m.`owner_id` = d.`owner_id`
	AND m.`packet_id` = d.`packet_id`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
CREATE INDEX `documents_owner_id_idx` ON `documents` (`owner_id`);--> statement-breakpoint
CREATE INDEX `documents_session_id_idx` ON `documents` (`session_id`);--> statement-breakpoint
CREATE INDEX `documents_owner_session_idx` ON `documents` (`owner_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `documents_created_at_idx` ON `documents` (`created_at`);--> statement-breakpoint
DROP TABLE `session_packet_map`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
