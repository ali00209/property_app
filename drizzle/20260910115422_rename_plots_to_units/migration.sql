ALTER TABLE "plots" RENAME TO "units";--> statement-breakpoint
ALTER TABLE "properties" RENAME COLUMN "plot_id" TO "unit_id";--> statement-breakpoint
ALTER TABLE "units" RENAME COLUMN "plot_number" TO "unit_number";--> statement-breakpoint
ALTER TABLE "units" RENAME COLUMN "plot_type" TO "type";--> statement-breakpoint
ALTER INDEX "plots_sector_plot_number_idx" RENAME TO "units_sector_unit_number_idx";--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "activities" SET "entity_type" = 'units' WHERE "entity_type" = 'plots';--> statement-breakpoint
DROP TYPE "activity_entity_type";--> statement-breakpoint
CREATE TYPE "activity_entity_type" AS ENUM('users', 'userBankAccounts', 'properties', 'propertyFeatures', 'propertyImages', 'addresses', 'propertyOwner', 'maintenance', 'documents', 'deals', 'societies', 'units');--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "entity_type" SET DATA TYPE "activity_entity_type" USING "entity_type"::"activity_entity_type";--> statement-breakpoint
ALTER TABLE "units" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
DROP TYPE "property_type";--> statement-breakpoint
CREATE TYPE "property_type" AS ENUM('residential', 'commercial', 'industrial', 'land', 'unit', 'apartment', 'house', 'office', 'warehouse', 'mixed_use');--> statement-breakpoint
ALTER TABLE "units" ALTER COLUMN "type" SET DATA TYPE "property_type" USING "type"::"property_type";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "type" SET DATA TYPE "property_type" USING "type"::"property_type";--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "type" SET DEFAULT 'residential'::"property_type";