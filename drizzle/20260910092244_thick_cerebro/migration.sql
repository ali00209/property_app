CREATE TYPE "filer_status" AS ENUM('filer', 'late_filer', 'non_filer');--> statement-breakpoint
CREATE TYPE "milestone_type" AS ENUM('booking', 'confirmation', 'monthly', 'balloting', 'allotment', 'other');--> statement-breakpoint
CREATE TYPE "mutation_status" AS ENUM('not_applicable', 'pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "noc_status" AS ENUM('not_required', 'file_under_process', 'approved');--> statement-breakpoint
CREATE TYPE "possession_status" AS ENUM('not_applicable', 'pending', 'granted', 'disputed');--> statement-breakpoint
ALTER TABLE "deal_lease_details" ADD COLUMN "advance_rent_months" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_lease_details" ADD COLUMN "notice_period_days" integer;--> statement-breakpoint
ALTER TABLE "deal_lease_details" ADD COLUMN "agreement_registered_at" timestamp;--> statement-breakpoint
ALTER TABLE "deal_payment_schedules" ADD COLUMN "milestone_type" "milestone_type" DEFAULT 'monthly'::"milestone_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "deal_payment_schedules" ADD COLUMN "event_date" date;--> statement-breakpoint
ALTER TABLE "deal_tax_snapshots" ADD COLUMN "filer_status_used" "filer_status";--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "earnest_amount" numeric(14,2);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "token_paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "noc_status" "noc_status" DEFAULT 'not_required'::"noc_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "mutation_status" "mutation_status" DEFAULT 'not_applicable'::"mutation_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "mutation_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "possession_status" "possession_status" DEFAULT 'not_applicable'::"possession_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "possession_granted_at" timestamp;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "is_balloted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "fbr_valuation" numeric(14,2);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "dc_rate" numeric(14,2);--> statement-breakpoint
ALTER TABLE "societies" ADD COLUMN "regulatory_authority" varchar(255);--> statement-breakpoint
ALTER TABLE "tax_policies" ADD COLUMN "min_value" numeric(14,2);--> statement-breakpoint
ALTER TABLE "tax_policies" ADD COLUMN "max_value" numeric(14,2);--> statement-breakpoint
ALTER TABLE "tax_policies" ADD COLUMN "filer_status" "filer_status";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cnic" varchar(15);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "filer_status" "filer_status" DEFAULT 'non_filer'::"filer_status";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "property_status";--> statement-breakpoint
CREATE TYPE "property_status" AS ENUM('available', 'off_market', 'occupied', 'vacant', 'maintenance', 'archived');--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "status" SET DATA TYPE "property_status" USING "status"::"property_status";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "status" SET DEFAULT 'available'::"property_status";--> statement-breakpoint
ALTER TABLE "properties" DROP COLUMN "legal_noc_status";--> statement-breakpoint
DROP TYPE "legal_noc_status";