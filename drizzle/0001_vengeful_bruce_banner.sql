CREATE TABLE `actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`runId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`rationale` text NOT NULL,
	`priority` int NOT NULL,
	`expectedImpact` int NOT NULL,
	`costEstimate` int NOT NULL,
	`confidence` int NOT NULL,
	`citations` text,
	`status` enum('proposed','approved','rejected') NOT NULL DEFAULT 'proposed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`decidedBy` varchar(255),
	`decidedAt` timestamp,
	`feedback` text,
	CONSTRAINT `actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`ticker` varchar(20),
	`sector` varchar(100),
	`country` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`kind` varchar(50) NOT NULL,
	`sourceUrl` text,
	`filename` varchar(255),
	`fileKey` varchar(500),
	`mime` varchar(100),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`textExcerpt` text,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `esg_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`runId` int,
	`period` varchar(50),
	`eScore` int NOT NULL,
	`sScore` int NOT NULL,
	`gScore` int NOT NULL,
	`total` int NOT NULL,
	`method` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `esg_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eval_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`label` varchar(100) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eval_labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`runId` int NOT NULL,
	`category` varchar(50) NOT NULL,
	`severity` int NOT NULL,
	`summary` text NOT NULL,
	`evidence` text,
	`citation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`model` varchar(100),
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`tokenIn` int DEFAULT 0,
	`tokenOut` int DEFAULT 0,
	`cost` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `runs_id` PRIMARY KEY(`id`)
);
