ALTER TABLE "addresses" ADD COLUMN "area" varchar(255);

CREATE TABLE "area_maps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "city" varchar(255) NOT NULL,
  "area" varchar(255) NOT NULL,
  "image_url" text NOT NULL,
  "sw_lat" numeric(10,6) NOT NULL,
  "sw_lng" numeric(10,6) NOT NULL,
  "ne_lat" numeric(10,6) NOT NULL,
  "ne_lng" numeric(10,6) NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "area_maps_city_area_idx" ON "area_maps" ("city", "area");
