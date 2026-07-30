CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`event_id` text NOT NULL,
	`year` integer NOT NULL,
	`body` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `claims_branch_idx` ON `claims` (`branch_id`);--> statement-breakpoint
CREATE INDEX `claims_event_idx` ON `claims` (`event_id`);--> statement-breakpoint
ALTER TABLE `convergence_points` ADD `attractor` text DEFAULT 'institutional' NOT NULL;--> statement-breakpoint
ALTER TABLE `convergence_points` ADD `lateness_years` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `convergence_points` ADD `path_note` text;--> statement-breakpoint
ALTER TABLE `entities` ADD `born_year` integer;--> statement-breakpoint
ALTER TABLE `entities` ADD `counterfactual` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `entities` ADD `succeeds_slug` text;--> statement-breakpoint
ALTER TABLE `eras` ADD `speculative` integer DEFAULT false NOT NULL;