ALTER TABLE "properties" ADD COLUMN "bedrooms" integer;
ALTER TABLE "properties" ADD COLUMN "bathrooms" integer;
ALTER TABLE "properties" ADD COLUMN "year_built" integer;
ALTER TABLE "properties" ADD COLUMN "parcel_number" varchar(255);
CREATE UNIQUE INDEX "property_owner_property_idx"
  ON "property_owner" ("property_id");
