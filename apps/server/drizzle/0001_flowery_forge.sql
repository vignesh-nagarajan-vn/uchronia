CREATE INDEX `biographies_branch_idx` ON `biographies` (`branch_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_branch_ordinal_uq` ON `events` (`branch_id`,`ordinal`);