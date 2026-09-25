CREATE TABLE IF NOT EXISTS `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`topic` text NOT NULL,
	`payload` text NOT NULL,
	`object_key` text,
	`created` integer NOT NULL,
	`due` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_records_owner_due` ON `records` (`owner`,`due`);
