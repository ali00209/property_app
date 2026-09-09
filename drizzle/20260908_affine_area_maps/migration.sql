ALTER TABLE area_maps ADD COLUMN center_lat numeric(10, 6);
ALTER TABLE area_maps ADD COLUMN center_lng numeric(10, 6);
ALTER TABLE area_maps ADD COLUMN width_m numeric(12, 2);
ALTER TABLE area_maps ADD COLUMN height_m numeric(12, 2);

UPDATE area_maps SET
  center_lat = (sw_lat + ne_lat) / 2,
  center_lng = (sw_lng + ne_lng) / 2,
  width_m = ABS(ne_lng - sw_lng) * 111320 * COS(RADIANS((sw_lat + ne_lat) / 2)),
  height_m = ABS(ne_lat - sw_lat) * 111320;

ALTER TABLE area_maps
  ALTER COLUMN center_lat SET NOT NULL,
  ALTER COLUMN center_lng SET NOT NULL,
  ALTER COLUMN width_m SET NOT NULL,
  ALTER COLUMN height_m SET NOT NULL;

ALTER TABLE area_maps DROP COLUMN sw_lat;
ALTER TABLE area_maps DROP COLUMN sw_lng;
ALTER TABLE area_maps DROP COLUMN ne_lat;
ALTER TABLE area_maps DROP COLUMN ne_lng;