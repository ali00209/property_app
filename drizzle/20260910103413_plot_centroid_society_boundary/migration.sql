UPDATE "plots" SET "centroid" = ST_Centroid("geometry") WHERE "centroid" IS NULL AND "geometry" IS NOT NULL;--> statement-breakpoint
DROP INDEX "plots_geometry_gix";--> statement-breakpoint
DROP INDEX "society_sectors_boundary_gix";--> statement-breakpoint
ALTER TABLE "plots" DROP COLUMN "geometry";--> statement-breakpoint
ALTER TABLE "society_sectors" DROP COLUMN "boundary";--> statement-breakpoint
ALTER TABLE "plots" ALTER COLUMN "centroid" SET NOT NULL;