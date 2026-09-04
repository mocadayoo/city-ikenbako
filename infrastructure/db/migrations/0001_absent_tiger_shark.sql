CREATE TYPE "public"."opinion_status" AS ENUM('OPEN', 'COMPLETED', 'DELETED');--> statement-breakpoint
ALTER TYPE "public"."opinion_event_type" ADD VALUE 'COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."opinion_event_type" ADD VALUE 'DELETED';--> statement-breakpoint
ALTER TYPE "public"."opinion_event_type" ADD VALUE 'REOPENED';--> statement-breakpoint
ALTER TABLE "opinions" ADD COLUMN "status" "opinion_status" DEFAULT 'OPEN' NOT NULL;