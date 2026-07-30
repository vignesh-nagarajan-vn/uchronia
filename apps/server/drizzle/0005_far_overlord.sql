CREATE TABLE `interpretations` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`event_id` text NOT NULL,
	`school_id` text NOT NULL,
	`gloss` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `interpretations_branch_idx` ON `interpretations` (`branch_id`);--> statement-breakpoint
CREATE INDEX `interpretations_event_idx` ON `interpretations` (`event_id`);--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`name` text NOT NULL,
	`stance` text NOT NULL,
	`seat` text NOT NULL,
	`blind_spot` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `schools_branch_idx` ON `schools` (`branch_id`);