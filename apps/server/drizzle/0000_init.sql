CREATE TABLE `artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`styling_hints` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `artifacts_event_idx` ON `artifacts` (`event_id`);--> statement-breakpoint
CREATE TABLE `biographies` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`biography` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `biographies_entity_branch_uq` ON `biographies` (`entity_id`,`branch_id`);--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`timeline_id` text NOT NULL,
	`parent_branch_id` text,
	`fork_event_id` text,
	`sub_pod` text,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `branches_timeline_idx` ON `branches` (`timeline_id`);--> statement-breakpoint
CREATE TABLE `convergence_points` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`event_id` text NOT NULL,
	`anchor_id` text NOT NULL,
	`similarity_note` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `convergence_branch_idx` ON `convergence_points` (`branch_id`);--> statement-breakpoint
CREATE TABLE `critique_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`era_id` text,
	`verdicts` text NOT NULL,
	`created_at` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `critiques_branch_idx` ON `critique_reports` (`branch_id`);--> statement-breakpoint
CREATE TABLE `edges` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`from_event_id` text NOT NULL,
	`to_event_id` text NOT NULL,
	`kind` text NOT NULL,
	`strength` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `edges_branch_idx` ON `edges` (`branch_id`);--> statement-breakpoint
CREATE INDEX `edges_to_idx` ON `edges` (`to_event_id`);--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`timeline_id` text NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`initial_state` text NOT NULL,
	`introduced_by_event_id` text,
	`created_at` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entities_timeline_idx` ON `entities` (`timeline_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `entities_slug_uq` ON `entities` (`timeline_id`,`slug`);--> statement-breakpoint
CREATE TABLE `eras` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`start_year` integer NOT NULL,
	`end_year` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`pressures` text NOT NULL,
	`status` text NOT NULL,
	`detail` text,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `eras_branch_idx` ON `eras` (`branch_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`era_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`year` integer NOT NULL,
	`date_label` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`detail` text,
	`entity_ids` text NOT NULL,
	`deltas` text NOT NULL,
	`lenses` text NOT NULL,
	`plausibility` text NOT NULL,
	`distance_from_pod` integer NOT NULL,
	`wildcard` integer NOT NULL,
	`disputed` integer NOT NULL,
	`convergence` integer NOT NULL,
	`critic_notes` text,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_branch_idx` ON `events` (`branch_id`);--> statement-breakpoint
CREATE INDEX `events_era_idx` ON `events` (`era_id`);--> statement-breakpoint
CREATE TABLE `pods` (
	`id` text PRIMARY KEY NOT NULL,
	`timeline_id` text NOT NULL,
	`raw` text NOT NULL,
	`statement` text NOT NULL,
	`year` integer NOT NULL,
	`date_label` text NOT NULL,
	`region` text NOT NULL,
	`mechanism` text NOT NULL,
	`baseline_context` text NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pods_timeline_uq` ON `pods` (`timeline_id`);--> statement-breakpoint
CREATE TABLE `timelines` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`settings` text NOT NULL
);
