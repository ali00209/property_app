CREATE EXTENSION IF NOT EXISTS "postgis";--> statement-breakpoint
CREATE TYPE "activity_action" AS ENUM('create', 'delete', 'update', 'hide', 'show');--> statement-breakpoint
CREATE TYPE "activity_entity_type" AS ENUM('users', 'userBankAccounts', 'properties', 'propertyFeatures', 'propertyImages', 'addresses', 'propertyOwner', 'maintenance', 'documents', 'deals', 'societies', 'plots');--> statement-breakpoint
CREATE TYPE "address_entity_type" AS ENUM('user', 'property');--> statement-breakpoint
CREATE TYPE "area_unit" AS ENUM('marla', 'kanal', 'acre', 'sqft', 'sqyd', 'sqm');--> statement-breakpoint
CREATE TYPE "deal_frequency" AS ENUM('monthly', 'quarterly', 'annually');--> statement-breakpoint
CREATE TYPE "deal_payment_schedule_status" AS ENUM('scheduled', 'partially_paid', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "deal_payment_status" AS ENUM('posted', 'reversed');--> statement-breakpoint
CREATE TYPE "deal_status" AS ENUM('pending_acceptance', 'active', 'completed', 'cancelled', 'terminated', 'defaulted');--> statement-breakpoint
CREATE TYPE "deal_tax_payer" AS ENUM('seller', 'counterparty');--> statement-breakpoint
CREATE TYPE "deal_type" AS ENUM('cash_sale', 'fixed_lease', 'periodic_rent', 'installment_purchase');--> statement-breakpoint
CREATE TYPE "document_entity_type" AS ENUM('users', 'properties', 'maintenance', 'deals');--> statement-breakpoint
CREATE TYPE "legal_noc_status" AS ENUM('balloted', 'noc_approved', 'file_under_process', 'registry_and_mutation');--> statement-breakpoint
CREATE TYPE "listing_purpose" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "maintenance_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "maintenance_status" AS ENUM('new', 'assigned', 'in_progress', 'waiting_parts', 'completed', 'closed');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('cash', 'bank_transfer', 'cheque', 'card', 'online');--> statement-breakpoint
CREATE TYPE "property_status" AS ENUM('available', 'sold', 'leased', 'rented', 'under_contract', 'off_market', 'occupied', 'vacant', 'maintenance', 'archived');--> statement-breakpoint
CREATE TYPE "property_type" AS ENUM('residential', 'commercial', 'industrial', 'land', 'plot', 'apartment', 'house', 'office', 'warehouse', 'mixed_use');--> statement-breakpoint
CREATE TYPE "society_kind" AS ENUM('housing_society', 'commercial_area', 'industrial_zone', 'general_locality');--> statement-breakpoint
CREATE TYPE "state" AS ENUM('federal', 'punjab', 'sindh', 'kpk', 'balochistan', 'gilgit_baltistan', 'azad_kashmir');--> statement-breakpoint
CREATE TYPE "tax_policy_kind" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"action" "activity_action" NOT NULL,
	"details" jsonb,
	"entity_type" "activity_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"done_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_type" "address_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"street" varchar(255) NOT NULL,
	"area" varchar(255),
	"city_id" uuid,
	"state" "state" NOT NULL,
	"zip_code" varchar NOT NULL,
	"country" text DEFAULT 'pakistan',
	"latitude" numeric(10,6),
	"longitude" numeric(10,6),
	"formatted_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"province" "state",
	"center_point" geography(Point,4326),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"deal_id" uuid NOT NULL,
	"accepted_by" uuid NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "deal_installment_details" (
	"deal_id" uuid PRIMARY KEY,
	"down_payment_amount" numeric(14,2) NOT NULL,
	"installment_amount" numeric(14,2) NOT NULL,
	"installment_count" integer NOT NULL,
	"frequency" "deal_frequency" DEFAULT 'monthly'::"deal_frequency" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_lease_details" (
	"deal_id" uuid PRIMARY KEY,
	"rent_amount" numeric(14,2) NOT NULL,
	"deposit_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"frequency" "deal_frequency" DEFAULT 'monthly'::"deal_frequency" NOT NULL,
	"fixed_term" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"principal_amount" numeric(14,2) NOT NULL,
	"tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_payment_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"deal_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"due_on" date,
	"principal_amount" numeric(14,2) NOT NULL,
	"tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"paid_principal" numeric(14,2) DEFAULT '0' NOT NULL,
	"paid_tax" numeric(14,2) DEFAULT '0' NOT NULL,
	"status" "deal_payment_schedule_status" DEFAULT 'scheduled'::"deal_payment_schedule_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"deal_id" uuid NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"principal_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"status" "deal_payment_status" DEFAULT 'posted'::"deal_payment_status" NOT NULL,
	"payment_method" "payment_method",
	"reference" varchar(255),
	"notes" text,
	"recorded_by" uuid NOT NULL,
	"reversed_by" uuid,
	"reversed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deal_payments_amount_breakdown_check" CHECK ("principal_amount" + "tax_amount" = "amount")
);
--> statement-breakpoint
CREATE TABLE "deal_sale_details" (
	"deal_id" uuid PRIMARY KEY,
	"payment_method" "payment_method",
	"due_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"deal_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"paid_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"refund_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"refund_principal_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"refund_tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"reason" text,
	"settled_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_tax_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"deal_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"type" "deal_type" NOT NULL,
	"status" "deal_status" DEFAULT 'pending_acceptance'::"deal_status" NOT NULL,
	"seller_id" uuid,
	"counterparty_id" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'PKR' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"total_amount" numeric(14,2),
	"tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"tax_payer" "deal_tax_payer" DEFAULT 'counterparty'::"deal_tax_payer" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"accepted_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"terminated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_type" "document_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_size" integer,
	"file_url" text,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" "maintenance_priority" DEFAULT 'medium'::"maintenance_priority" NOT NULL,
	"status" "maintenance_status" DEFAULT 'new'::"maintenance_status" NOT NULL,
	"assigned_to" uuid,
	"estimated_cost" numeric(12,2),
	"actual_cost" numeric(12,2),
	"completed_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"sector_id" uuid NOT NULL,
	"plot_number" varchar(50) NOT NULL,
	"street_number" varchar(50),
	"geometry" geography(Polygon,4326) NOT NULL,
	"centroid" geography(Point,4326),
	"area_value" numeric(10,2),
	"area_unit" "area_unit",
	"plot_type" "property_type",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(500) NOT NULL,
	"slug" varchar(300) NOT NULL,
	"description" text,
	"type" "property_type" DEFAULT 'residential'::"property_type" NOT NULL,
	"status" "property_status" DEFAULT 'available'::"property_status" NOT NULL,
	"listing_purpose" "listing_purpose" NOT NULL,
	"city_id" uuid,
	"society_id" uuid,
	"sector_id" uuid,
	"plot_id" uuid,
	"location_point" geography(Point,4326),
	"price" numeric(14,2) NOT NULL,
	"monthly_rent" numeric(14,2),
	"area_value" numeric(10,2) NOT NULL,
	"area_unit" "area_unit" NOT NULL,
	"area_sqft" numeric(12,2),
	"bedrooms" smallint,
	"bathrooms" smallint,
	"year_built" integer,
	"legal_noc_status" "legal_noc_status",
	"parcel_number" varchar(255),
	"views_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"feature" varchar NOT NULL,
	"value" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"url" varchar NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_owner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"owner_id" uuid,
	"ownership_percentage" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "property_owner_percentage_range_check" CHECK ("ownership_percentage" IS NULL OR "ownership_percentage" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "property_tax_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"property_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"role" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "societies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"kind" "society_kind" DEFAULT 'general_locality'::"society_kind" NOT NULL,
	"developer" varchar(150),
	"boundary" geography(Polygon,4326),
	"description" text,
	"cover_image" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "society_sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"society_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"boundary" geography(Polygon,4326),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"account_number" varchar(255) NOT NULL UNIQUE,
	"iban" varchar NOT NULL UNIQUE,
	"credit_limit" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) UNIQUE,
	"password" text NOT NULL,
	"role_id" uuid NOT NULL,
	"avatar_url" text,
	"phone" varchar(50) UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_or_phone_check" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX "activities_entity_idx" ON "activities" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "addresses_entity_idx" ON "addresses" ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_payment_allocations_payment_schedule_idx" ON "deal_payment_allocations" ("payment_id","schedule_id");--> statement-breakpoint
CREATE INDEX "deal_payment_allocations_payment_idx" ON "deal_payment_allocations" ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_payment_schedules_deal_sequence_idx" ON "deal_payment_schedules" ("deal_id","sequence");--> statement-breakpoint
CREATE INDEX "deal_payment_schedules_deal_idx" ON "deal_payment_schedules" ("deal_id");--> statement-breakpoint
CREATE INDEX "deal_payments_deal_idx" ON "deal_payments" ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_tax_snapshots_deal_policy_idx" ON "deal_tax_snapshots" ("deal_id","policy_id");--> statement-breakpoint
CREATE INDEX "deal_tax_snapshots_deal_idx" ON "deal_tax_snapshots" ("deal_id");--> statement-breakpoint
CREATE INDEX "deals_property_idx" ON "deals" ("property_id");--> statement-breakpoint
CREATE INDEX "deals_status_idx" ON "deals" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "deals_one_active_property_idx" ON "deals" ("property_id") WHERE "status" in ('pending_acceptance', 'active');--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plots_sector_plot_number_idx" ON "plots" ("sector_id","plot_number");--> statement-breakpoint
CREATE INDEX "plots_geometry_gix" ON "plots" USING gist ("geometry");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_slug_idx" ON "properties" ("slug");--> statement-breakpoint
CREATE INDEX "properties_location_gix" ON "properties" USING gist ("location_point");--> statement-breakpoint
CREATE INDEX "properties_society_search_idx" ON "properties" ("society_id","listing_purpose","status");--> statement-breakpoint
CREATE INDEX "properties_price_idx" ON "properties" ("price");--> statement-breakpoint
CREATE UNIQUE INDEX "property_features_property_feature_idx" ON "property_features" ("property_id","feature");--> statement-breakpoint
CREATE INDEX "property_images_property_idx" ON "property_images" ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_owner_property_owner_idx" ON "property_owner" ("property_id","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "property_tax_assignments_property_policy_idx" ON "property_tax_assignments" ("property_id","policy_id");--> statement-breakpoint
CREATE INDEX "property_tax_assignments_property_idx" ON "property_tax_assignments" ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_role_idx" ON "roles" ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "societies_slug_idx" ON "societies" ("slug");--> statement-breakpoint
CREATE INDEX "societies_city_idx" ON "societies" ("city_id");--> statement-breakpoint
CREATE INDEX "societies_boundary_gix" ON "societies" USING gist ("boundary");--> statement-breakpoint
CREATE UNIQUE INDEX "society_sectors_society_name_idx" ON "society_sectors" ("society_id","name");--> statement-breakpoint
CREATE INDEX "society_sectors_boundary_gix" ON "society_sectors" USING gist ("boundary");--> statement-breakpoint
CREATE INDEX "tax_policies_active_idx" ON "tax_policies" ("active");--> statement-breakpoint
CREATE INDEX "tax_policies_effective_idx" ON "tax_policies" ("effective_start","effective_end");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_done_by_users_id_fkey" FOREIGN KEY ("done_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "deal_acceptances" ADD CONSTRAINT "deal_acceptances_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_acceptances" ADD CONSTRAINT "deal_acceptances_accepted_by_users_id_fkey" FOREIGN KEY ("accepted_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "deal_installment_details" ADD CONSTRAINT "deal_installment_details_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_lease_details" ADD CONSTRAINT "deal_lease_details_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_payment_allocations" ADD CONSTRAINT "deal_payment_allocations_payment_id_deal_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "deal_payments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_payment_allocations" ADD CONSTRAINT "deal_payment_allocations_H2VnIr6sQ726_fkey" FOREIGN KEY ("schedule_id") REFERENCES "deal_payment_schedules"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_payment_schedules" ADD CONSTRAINT "deal_payment_schedules_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_payments" ADD CONSTRAINT "deal_payments_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_payments" ADD CONSTRAINT "deal_payments_recorded_by_users_id_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "deal_payments" ADD CONSTRAINT "deal_payments_reversed_by_users_id_fkey" FOREIGN KEY ("reversed_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "deal_sale_details" ADD CONSTRAINT "deal_sale_details_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_settlements" ADD CONSTRAINT "deal_settlements_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_settlements" ADD CONSTRAINT "deal_settlements_settled_by_users_id_fkey" FOREIGN KEY ("settled_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "deal_tax_snapshots" ADD CONSTRAINT "deal_tax_snapshots_deal_id_deals_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deal_tax_snapshots" ADD CONSTRAINT "deal_tax_snapshots_policy_id_tax_policies_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "tax_policies"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_id_users_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_counterparty_id_users_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_assigned_to_users_id_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "plots" ADD CONSTRAINT "plots_sector_id_society_sectors_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "society_sectors"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id");--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_sector_id_society_sectors_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "society_sectors"("id");--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_plot_id_plots_id_fkey" FOREIGN KEY ("plot_id") REFERENCES "plots"("id");--> statement-breakpoint
ALTER TABLE "property_features" ADD CONSTRAINT "property_features_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_owner" ADD CONSTRAINT "property_owner_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_owner" ADD CONSTRAINT "property_owner_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "property_tax_assignments" ADD CONSTRAINT "property_tax_assignments_property_id_properties_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_tax_assignments" ADD CONSTRAINT "property_tax_assignments_policy_id_tax_policies_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "tax_policies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "property_tax_assignments" ADD CONSTRAINT "property_tax_assignments_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "societies" ADD CONSTRAINT "societies_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "society_sectors" ADD CONSTRAINT "society_sectors_society_id_societies_id_fkey" FOREIGN KEY ("society_id") REFERENCES "societies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tax_policies" ADD CONSTRAINT "tax_policies_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "user_bank_accounts" ADD CONSTRAINT "user_bank_accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");