CREATE TYPE "tax_policy_kind" AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE "deal_payment_schedule_status" AS ENUM ('scheduled', 'partially_paid', 'paid', 'cancelled');

ALTER TABLE "deals"
  ADD COLUMN "tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  ADD COLUMN "tax_payer" varchar(30) DEFAULT 'counterparty' NOT NULL;

ALTER TABLE "deal_payments"
  ADD COLUMN "principal_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  ADD COLUMN "tax_amount" numeric(14,2) DEFAULT '0' NOT NULL;

ALTER TABLE "deal_settlements"
  ADD COLUMN "refund_principal_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  ADD COLUMN "refund_tax_amount" numeric(14,2) DEFAULT '0' NOT NULL;

CREATE TABLE "tax_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL UNIQUE,
  "kind" "tax_policy_kind" NOT NULL,
  "value" numeric(14,2) NOT NULL,
  "applies_to" "deal_type"[] NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "effective_start" date,
  "effective_end" date,
  "code" varchar(100),
  "authority" varchar(255),
  "description" text,
  "notes" text,
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "tax_policies_active_idx" ON "tax_policies" ("active");
CREATE INDEX "tax_policies_effective_idx" ON "tax_policies" ("effective_start", "effective_end");

CREATE TABLE "deal_tax_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "policy_id" uuid NOT NULL REFERENCES "tax_policies"("id") ON DELETE RESTRICT,
  "policy_name" varchar(255) NOT NULL,
  "policy_kind" "tax_policy_kind" NOT NULL,
  "policy_value" numeric(14,2) NOT NULL,
  "policy_code" varchar(100),
  "authority" varchar(255),
  "base_amount" numeric(14,2) NOT NULL,
  "tax_amount" numeric(14,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'PKR' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "deal_tax_snapshots_deal_policy_idx" ON "deal_tax_snapshots" ("deal_id", "policy_id");
CREATE INDEX "deal_tax_snapshots_deal_idx" ON "deal_tax_snapshots" ("deal_id");

CREATE TABLE "deal_payment_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" uuid NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "sequence" integer NOT NULL,
  "due_on" date,
  "principal_amount" numeric(14,2) NOT NULL,
  "tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "paid_principal" numeric(14,2) DEFAULT '0' NOT NULL,
  "paid_tax" numeric(14,2) DEFAULT '0' NOT NULL,
  "status" "deal_payment_schedule_status" DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "deal_payment_schedules_deal_sequence_idx" ON "deal_payment_schedules" ("deal_id", "sequence");
CREATE INDEX "deal_payment_schedules_deal_idx" ON "deal_payment_schedules" ("deal_id");

CREATE TABLE "deal_payment_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "deal_payments"("id") ON DELETE CASCADE,
  "schedule_id" uuid NOT NULL REFERENCES "deal_payment_schedules"("id") ON DELETE CASCADE,
  "principal_amount" numeric(14,2) NOT NULL,
  "tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "deal_payment_allocations_payment_schedule_idx" ON "deal_payment_allocations" ("payment_id", "schedule_id");
CREATE INDEX "deal_payment_allocations_payment_idx" ON "deal_payment_allocations" ("payment_id");

CREATE OR REPLACE FUNCTION prevent_deal_tax_snapshot_mutation()
RETURNS trigger AS $$
BEGIN
  IF ROW(NEW.policy_id, NEW.policy_name, NEW.policy_kind, NEW.policy_value,
         NEW.policy_code, NEW.authority, NEW.base_amount, NEW.tax_amount,
         NEW.currency)
     IS DISTINCT FROM
     ROW(OLD.policy_id, OLD.policy_name, OLD.policy_kind, OLD.policy_value,
         OLD.policy_code, OLD.authority, OLD.base_amount, OLD.tax_amount,
         OLD.currency) THEN
    RAISE EXCEPTION 'deal tax snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER deal_tax_snapshots_immutable
  BEFORE UPDATE ON "deal_tax_snapshots"
  FOR EACH ROW EXECUTE FUNCTION prevent_deal_tax_snapshot_mutation();

CREATE OR REPLACE FUNCTION prevent_used_tax_policy_mutation()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "deal_tax_snapshots" WHERE policy_id = OLD.id)
     AND (NEW.name IS DISTINCT FROM OLD.name
       OR NEW.kind IS DISTINCT FROM OLD.kind
       OR NEW.value IS DISTINCT FROM OLD.value
       OR NEW.applies_to IS DISTINCT FROM OLD.applies_to
       OR NEW.effective_start IS DISTINCT FROM OLD.effective_start
       OR NEW.effective_end IS DISTINCT FROM OLD.effective_end) THEN
    RAISE EXCEPTION 'used tax policy financial and applicability fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER tax_policies_used_immutable
  BEFORE UPDATE ON "tax_policies"
  FOR EACH ROW EXECUTE FUNCTION prevent_used_tax_policy_mutation();
