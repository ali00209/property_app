CREATE TYPE "deal_type" AS ENUM ('cash_sale', 'fixed_lease', 'periodic_rent', 'installment_purchase');
CREATE TYPE "deal_status" AS ENUM ('pending_acceptance', 'active', 'completed', 'cancelled', 'terminated', 'defaulted');
CREATE TYPE "deal_frequency" AS ENUM ('monthly', 'quarterly', 'annually');
CREATE TYPE "deal_payment_status" AS ENUM ('posted', 'reversed');

CREATE TABLE "deals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE RESTRICT,
  "type" "deal_type" NOT NULL,
  "status" "deal_status" DEFAULT 'pending_acceptance' NOT NULL,
  "seller_id" uuid REFERENCES "users"("id"),
  "counterparty_id" uuid NOT NULL REFERENCES "users"("id"),
  "currency" varchar(3) DEFAULT 'PKR' NOT NULL,
  "starts_on" date,
  "ends_on" date,
  "total_amount" numeric(14,2),
  "snapshot" jsonb NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "accepted_at" timestamp,
  "completed_at" timestamp,
  "cancelled_at" timestamp,
  "terminated_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "deals_property_idx" ON "deals" ("property_id");
CREATE INDEX "deals_status_idx" ON "deals" ("status");
CREATE UNIQUE INDEX "deals_one_active_property_idx"
  ON "deals" ("property_id")
  WHERE "status" IN ('pending_acceptance', 'active');

CREATE TABLE "deal_sale_details" (
  "deal_id" uuid PRIMARY KEY NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "payment_method" varchar(50),
  "due_on" date,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_lease_details" (
  "deal_id" uuid PRIMARY KEY NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "rent_amount" numeric(14,2) NOT NULL,
  "deposit_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "frequency" "deal_frequency" DEFAULT 'monthly' NOT NULL,
  "fixed_term" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_installment_details" (
  "deal_id" uuid PRIMARY KEY NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "down_payment_amount" numeric(14,2) NOT NULL,
  "installment_amount" numeric(14,2) NOT NULL,
  "installment_count" integer NOT NULL,
  "frequency" "deal_frequency" DEFAULT 'monthly' NOT NULL,
  "legacy_contract_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "amount" numeric(14,2) NOT NULL,
  "status" "deal_payment_status" DEFAULT 'posted' NOT NULL,
  "payment_method" varchar(50),
  "reference" varchar(255),
  "notes" text,
  "recorded_by" uuid NOT NULL REFERENCES "users"("id"),
  "reversed_by" uuid REFERENCES "users"("id"),
  "reversed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "deal_payments_deal_idx" ON "deal_payments" ("deal_id");

CREATE TABLE "deal_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "name" varchar(500) NOT NULL,
  "file_type" varchar(100) NOT NULL,
  "file_size" integer,
  "file_url" text,
  "uploaded_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "deal_documents_deal_idx" ON "deal_documents" ("deal_id");

CREATE TABLE "deal_acceptances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "accepted_by" uuid NOT NULL REFERENCES "users"("id"),
  "accepted_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" varchar(64),
  "user_agent" text
);

CREATE TABLE "deal_settlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "kind" varchar(20) NOT NULL,
  "paid_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "refund_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "reason" text,
  "settled_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "action" varchar(50) NOT NULL,
  "actor_id" uuid REFERENCES "users"("id"),
  "details" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "deal_audit_deal_idx" ON "deal_audit_logs" ("deal_id");

ALTER TABLE "purchase_contracts"
  ADD COLUMN "deal_id" uuid REFERENCES "deals"("id") ON DELETE SET NULL;
CREATE INDEX "purchase_contracts_deal_idx" ON "purchase_contracts" ("deal_id");
ALTER TABLE "deal_payments" ADD COLUMN "legacy_payment_id" uuid;
CREATE INDEX "deal_payments_legacy_idx" ON "deal_payments" ("legacy_payment_id");

CREATE OR REPLACE FUNCTION prevent_deal_snapshot_mutation()
RETURNS trigger AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot THEN
    RAISE EXCEPTION 'deal snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER deals_snapshot_immutable
  BEFORE UPDATE ON "deals"
  FOR EACH ROW EXECUTE FUNCTION prevent_deal_snapshot_mutation();
