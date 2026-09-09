CREATE TABLE "property_tax_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "policy_id" uuid NOT NULL REFERENCES "tax_policies"("id") ON DELETE CASCADE,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "property_tax_assignments_property_policy_idx" ON "property_tax_assignments" ("property_id", "policy_id");
CREATE INDEX "property_tax_assignments_property_idx" ON "property_tax_assignments" ("property_id");