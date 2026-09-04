CREATE TYPE "public"."councilor_role" AS ENUM('COUNCILOR', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."opinion_event_actor_type" AS ENUM('SYSTEM', 'COUNCILOR', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."opinion_event_type" AS ENUM('SUBMITTED', 'DELIVERED', 'VIEWED');--> statement-breakpoint
CREATE TABLE "councilor_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"councilor_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "councilor_role" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "councilor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "councilor_sessions_expiry_check" CHECK ("councilor_sessions"."expires_at" > "councilor_sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "councilors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"district" text,
	"organization" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opinion_access_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opinion_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "opinion_access_sessions_expiry_check" CHECK ("opinion_access_sessions"."expires_at" > "opinion_access_sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "opinion_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opinion_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "opinion_access_tokens_expiry_check" CHECK ("opinion_access_tokens"."expires_at" > "opinion_access_tokens"."created_at")
);
--> statement-breakpoint
CREATE TABLE "opinion_contacts" (
	"opinion_id" uuid PRIMARY KEY NOT NULL,
	"email_encrypted" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opinion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opinion_id" uuid NOT NULL,
	"recipient_id" uuid,
	"type" "opinion_event_type" NOT NULL,
	"actor_type" "opinion_event_actor_type" NOT NULL,
	"actor_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signature" text,
	"proof_version" integer,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "opinion_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opinion_id" uuid NOT NULL,
	"councilor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opinions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"category" text,
	"region" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "councilor_accounts" ADD CONSTRAINT "councilor_accounts_councilor_id_councilors_id_fk" FOREIGN KEY ("councilor_id") REFERENCES "public"."councilors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "councilor_sessions" ADD CONSTRAINT "councilor_sessions_account_id_councilor_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."councilor_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_access_sessions" ADD CONSTRAINT "opinion_access_sessions_opinion_id_opinions_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_access_tokens" ADD CONSTRAINT "opinion_access_tokens_opinion_id_opinions_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_contacts" ADD CONSTRAINT "opinion_contacts_opinion_id_opinions_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_events" ADD CONSTRAINT "opinion_events_opinion_id_opinions_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_events" ADD CONSTRAINT "opinion_events_recipient_id_opinion_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."opinion_recipients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_recipients" ADD CONSTRAINT "opinion_recipients_opinion_id_opinions_id_fk" FOREIGN KEY ("opinion_id") REFERENCES "public"."opinions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opinion_recipients" ADD CONSTRAINT "opinion_recipients_councilor_id_councilors_id_fk" FOREIGN KEY ("councilor_id") REFERENCES "public"."councilors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "councilor_accounts_email_uq" ON "councilor_accounts" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "councilor_accounts_councilor_idx" ON "councilor_accounts" USING btree ("councilor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "councilor_sessions_hash_uq" ON "councilor_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "councilor_sessions_account_idx" ON "councilor_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "councilors_active_idx" ON "councilors" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "opinion_access_sessions_hash_uq" ON "opinion_access_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "opinion_access_sessions_opinion_idx" ON "opinion_access_sessions" USING btree ("opinion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opinion_access_tokens_hash_uq" ON "opinion_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "opinion_access_tokens_opinion_idx" ON "opinion_access_tokens" USING btree ("opinion_id");--> statement-breakpoint
CREATE INDEX "opinion_events_opinion_occurred_idx" ON "opinion_events" USING btree ("opinion_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "opinion_events_delivery_uq" ON "opinion_events" USING btree ("opinion_id","type","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opinion_events_view_actor_uq" ON "opinion_events" USING btree ("opinion_id","type","actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opinion_recipients_opinion_councilor_uq" ON "opinion_recipients" USING btree ("opinion_id","councilor_id");--> statement-breakpoint
CREATE INDEX "opinion_recipients_councilor_idx" ON "opinion_recipients" USING btree ("councilor_id");--> statement-breakpoint
CREATE INDEX "opinions_created_at_idx" ON "opinions" USING btree ("created_at");