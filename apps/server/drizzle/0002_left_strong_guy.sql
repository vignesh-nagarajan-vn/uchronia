CREATE TABLE `run_traces` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`run_id` text,
	`template_id` text NOT NULL,
	`template_version` text NOT NULL,
	`role` text NOT NULL,
	`model` text NOT NULL,
	`system` text NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cache_read_tokens` integer,
	`cache_write_tokens` integer,
	`attempts` integer NOT NULL,
	`validation_issues` text NOT NULL,
	`ok` integer NOT NULL,
	`error` text,
	`duration_ms` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `traces_branch_idx` ON `run_traces` (`branch_id`);--> statement-breakpoint
CREATE INDEX `traces_run_idx` ON `run_traces` (`run_id`);