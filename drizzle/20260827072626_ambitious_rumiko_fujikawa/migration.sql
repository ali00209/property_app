CREATE TYPE "installment_frequency" AS ENUM('monthly', 'quarterly', 'annually');--> statement-breakpoint
CREATE TYPE "installment_plan_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "payment_entry_status" AS ENUM('posted', 'reversed');--> statement-breakpoint
CREATE TYPE "payment_entry_type" AS ENUM('payment', 'reversal', 'refund');--> statement-breakpoint
CREATE TYPE "purchase_contract_status" AS ENUM('active', 'cancelled', 'completed', 'defaulted');--> statement-breakpoint
CREATE TYPE "purchase_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "scheduled_installment_status" AS ENUM('scheduled', 'partially_paid', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TABLE "installment_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" uuid,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_plan_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"description" text,
	"frequency" "installment_frequency" DEFAULT 'monthly'::"installment_frequency" NOT NULL,
	"term_months" integer NOT NULL,
	"down_payment_percent" numeric(5,2) DEFAULT '20' NOT NULL,
	"interest_rate" numeric(5,2) DEFAULT '0' NOT NULL,
	"status" "installment_plan_status" DEFAULT 'draft'::"installment_plan_status" NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"contract_id" uuid NOT NULL,
	"installment_id" uuid,
	"amount" numeric(14,2) NOT NULL,
	"entry_type" "payment_entry_type" DEFAULT 'payment'::"payment_entry_type" NOT NULL,
	"status" "payment_entry_status" DEFAULT 'posted'::"payment_entry_status" NOT NULL,
	"payment_method" varchar(50),
	"reference" varchar(255),
	"notes" text,
	"recorded_by" uuid NOT NULL,
	"reversed_by" uuid,
	"reversed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_installment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"price" numeric(14,2) NOT NULL,
	"down_payment_amount" numeric(14,2) NOT NULL,
	"installment_amount" numeric(14,2) NOT NULL,
	"status" "installment_plan_status" DEFAULT 'draft'::"installment_plan_status" NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"request_id" uuid NOT NULL UNIQUE,
	"property_plan_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"status" "purchase_contract_status" DEFAULT 'active'::"purchase_contract_status" NOT NULL,
	"total_amount" numeric(14,2) NOT NULL,
	"down_payment_amount" numeric(14,2) NOT NULL,
	"installment_amount" numeric(14,2) NOT NULL,
	"installment_count" integer NOT NULL,
	"start_date" date NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"refund_amount" numeric(14,2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_plan_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"status" "purchase_request_status" DEFAULT 'pending'::"purchase_request_status" NOT NULL,
	"note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"contract_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"paid_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"status" "scheduled_installment_status" DEFAULT 'scheduled'::"scheduled_installment_status" NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "installment_audit_logs" ADD CONSTRAINT "installment_audit_logs_actor_id_users_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "installment_plan_templates" ADD CONSTRAINT "installment_plan_templates_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_contract_id_purchase_contracts_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "purchase_contracts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_installment_id_scheduled_installments_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "scheduled_installments"("id");--> statement-breakpoint
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_recorded_by_users_id_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_reversed_by_users_id_fkey" FOREIGN KEY ("reversed_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "property_installment_plans" ADD CONSTRAINT "property_installment_plans_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_installment_plans" ADD CONSTRAINT "property_installment_plans_L0iOiS9xqoQ7_fkey" FOREIGN KEY ("template_id") REFERENCES "installment_plan_templates"("id");--> statement-breakpoint
ALTER TABLE "property_installment_plans" ADD CONSTRAINT "property_installment_plans_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "purchase_contracts" ADD CONSTRAINT "purchase_contracts_request_id_purchase_requests_id_fkey" FOREIGN KEY ("request_id") REFERENCES "purchase_requests"("id");--> statement-breakpoint
ALTER TABLE "purchase_contracts" ADD CONSTRAINT "purchase_contracts_bvNIeFIbv2Vg_fkey" FOREIGN KEY ("property_plan_id") REFERENCES "property_installment_plans"("id");--> statement-breakpoint
ALTER TABLE "purchase_contracts" ADD CONSTRAINT "purchase_contracts_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id");--> statement-breakpoint
ALTER TABLE "purchase_contracts" ADD CONSTRAINT "purchase_contracts_buyer_id_users_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_ADxdTDVnSmnL_fkey" FOREIGN KEY ("property_plan_id") REFERENCES "property_installment_plans"("id");--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id");--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_buyer_id_users_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_reviewed_by_users_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "scheduled_installments" ADD CONSTRAINT "scheduled_installments_contract_id_purchase_contracts_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "purchase_contracts"("id") ON DELETE CASCADE;