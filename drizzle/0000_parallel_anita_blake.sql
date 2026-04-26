CREATE TYPE "public"."collab_document_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."collab_invite_delivery_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."collab_invite_status" AS ENUM('pending', 'sent', 'accepted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."collab_participant_role" AS ENUM('owner', 'participant');--> statement-breakpoint
CREATE TYPE "public"."collab_session_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "collab_session_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collab_session_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"bucket_path" text NOT NULL,
	"upload_url" text NOT NULL,
	"download_url" text NOT NULL,
	"status" "collab_document_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collab_session_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collab_session_id" uuid NOT NULL,
	"email" text NOT NULL,
	"invite_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"email_delivery_status" "collab_invite_delivery_status" DEFAULT 'pending' NOT NULL,
	"delivery_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collab_session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collab_session_id" uuid NOT NULL,
	"email" text NOT NULL,
	"user_sub" text,
	"role" "collab_participant_role" DEFAULT 'participant' NOT NULL,
	"invite_status" "collab_invite_status" DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collab_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_sub" text NOT NULL,
	"title" text,
	"status" "collab_session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collab_session_documents" ADD CONSTRAINT "collab_session_documents_collab_session_id_collab_sessions_id_fk" FOREIGN KEY ("collab_session_id") REFERENCES "public"."collab_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_session_invites" ADD CONSTRAINT "collab_session_invites_collab_session_id_collab_sessions_id_fk" FOREIGN KEY ("collab_session_id") REFERENCES "public"."collab_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collab_session_participants" ADD CONSTRAINT "collab_session_participants_collab_session_id_collab_sessions_id_fk" FOREIGN KEY ("collab_session_id") REFERENCES "public"."collab_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collab_session_documents_session_idx" ON "collab_session_documents" USING btree ("collab_session_id");--> statement-breakpoint
CREATE INDEX "collab_session_documents_created_at_idx" ON "collab_session_documents" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collab_session_invites_token_hash_unq" ON "collab_session_invites" USING btree ("invite_token_hash");--> statement-breakpoint
CREATE INDEX "collab_session_invites_session_idx" ON "collab_session_invites" USING btree ("collab_session_id");--> statement-breakpoint
CREATE INDEX "collab_session_invites_email_idx" ON "collab_session_invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "collab_session_participants_session_email_unq" ON "collab_session_participants" USING btree ("collab_session_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "collab_session_participants_session_user_sub_unq" ON "collab_session_participants" USING btree ("collab_session_id","user_sub") WHERE "collab_session_participants"."user_sub" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "collab_session_participants_session_idx" ON "collab_session_participants" USING btree ("collab_session_id");--> statement-breakpoint
CREATE INDEX "collab_session_participants_user_sub_idx" ON "collab_session_participants" USING btree ("user_sub");--> statement-breakpoint
CREATE INDEX "collab_session_participants_email_idx" ON "collab_session_participants" USING btree ("email");--> statement-breakpoint
CREATE INDEX "collab_sessions_owner_user_sub_idx" ON "collab_sessions" USING btree ("owner_user_sub");