CREATE TABLE `court_records` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`event_id` text NOT NULL,
	`advocate` text NOT NULL,
	`skeptic` text NOT NULL,
	`ruling` text NOT NULL,
	`created_at` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `court_branch_idx` ON `court_records` (`branch_id`);--> statement-breakpoint
CREATE INDEX `court_event_idx` ON `court_records` (`event_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `contested` integer DEFAULT false NOT NULL;