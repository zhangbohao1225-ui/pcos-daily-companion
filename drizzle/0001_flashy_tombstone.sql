CREATE TABLE `checkin_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`source` enum('preset','custom') NOT NULL DEFAULT 'preset',
	`kind` enum('nutrition','movement','mood','sleep','custom') NOT NULL DEFAULT 'custom',
	`name` varchar(120) NOT NULL,
	`description` varchar(255),
	`icon` varchar(32) NOT NULL DEFAULT 'Sparkles',
	`recordMode` enum('toggle','value','choice') NOT NULL DEFAULT 'toggle',
	`unit` varchar(24),
	`goalValue` int,
	`scoreValue` int NOT NULL DEFAULT 10,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkin_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cycle_symptoms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cycleId` int,
	`recordDate` varchar(10) NOT NULL,
	`pain` enum('pain','no_pain'),
	`breastSwelling` enum('swollen','not_swollen'),
	`acne` enum('acne','clear'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cycle_symptoms_id` PRIMARY KEY(`id`),
	CONSTRAINT `cycle_symptoms_user_date_unique` UNIQUE(`userId`,`recordDate`)
);
--> statement-breakpoint
CREATE TABLE `daily_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` int NOT NULL,
	`recordDate` varchar(10) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`numericValue` decimal(8,2),
	`textValue` varchar(120),
	`note` text,
	`earnedScore` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_checkins_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_checkins_user_template_date_unique` UNIQUE(`userId`,`templateId`,`recordDate`)
);
--> statement-breakpoint
CREATE TABLE `health_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120),
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
	`dailySleepTarget` int NOT NULL DEFAULT 8,
	`dailyMovementTarget` int NOT NULL DEFAULT 30,
	`onboardingCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `health_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `health_profiles_user_id_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `health_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportType` enum('weekly','on_demand') NOT NULL DEFAULT 'weekly',
	`periodStart` varchar(10) NOT NULL,
	`periodEnd` varchar(10) NOT NULL,
	`healthScore` int NOT NULL,
	`completionRate` decimal(5,2) NOT NULL,
	`metrics` json NOT NULL,
	`correlations` json NOT NULL,
	`content` text NOT NULL,
	`model` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `health_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menstrual_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menstrual_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 0 1 * * 1',
	`isEnabled` boolean NOT NULL DEFAULT false,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_schedules_user_id_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `checkin_templates_user_id_idx` ON `checkin_templates` (`userId`);--> statement-breakpoint
CREATE INDEX `checkin_templates_kind_idx` ON `checkin_templates` (`kind`);--> statement-breakpoint
CREATE INDEX `cycle_symptoms_cycle_idx` ON `cycle_symptoms` (`cycleId`);--> statement-breakpoint
CREATE INDEX `daily_checkins_user_date_idx` ON `daily_checkins` (`userId`,`recordDate`);--> statement-breakpoint
CREATE INDEX `health_reports_user_period_idx` ON `health_reports` (`userId`,`periodEnd`);--> statement-breakpoint
CREATE INDEX `menstrual_cycles_user_start_idx` ON `menstrual_cycles` (`userId`,`startDate`);--> statement-breakpoint
CREATE INDEX `report_schedules_task_uid_idx` ON `report_schedules` (`scheduleCronTaskUid`);