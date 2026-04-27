CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`packet_id` text NOT NULL,
	`filename` text NOT NULL,
	`url` text NOT NULL,
	`download_url` text NOT NULL,
	`bucket_path` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_owner_id_idx` ON `documents` (`owner_id`);--> statement-breakpoint
CREATE INDEX `documents_owner_packet_idx` ON `documents` (`owner_id`,`packet_id`);--> statement-breakpoint
CREATE INDEX `documents_created_at_idx` ON `documents` (`created_at`);