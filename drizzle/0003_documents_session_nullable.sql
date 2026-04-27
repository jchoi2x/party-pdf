PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`owner_id` text NOT NULL,
	`session_id` text,
	`filename` text NOT NULL,
	`url` text NOT NULL,
	`download_url` text NOT NULL,
	`bucket_path` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_documents`("id", "owner_id", "session_id", "filename", "url", "download_url", "bucket_path", "created_at", "status")
SELECT "id", "owner_id", "session_id", "filename", "url", "download_url", "bucket_path", "created_at", "status"
FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
CREATE INDEX `documents_owner_id_idx` ON `documents` (`owner_id`);--> statement-breakpoint
CREATE INDEX `documents_session_id_idx` ON `documents` (`session_id`);--> statement-breakpoint
CREATE INDEX `documents_owner_session_idx` ON `documents` (`owner_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `documents_created_at_idx` ON `documents` (`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
