BEGIN;

-- Backfill existing addresses with area + coordinates
UPDATE addresses
SET area = 'Gulberg III', latitude = 31.5237, longitude = 74.3570, updated_at = now()
WHERE "entityType" = 'property' AND city = 'Lahore' AND street = 'none'
  AND "entityId" = '1c3e7e4a-94b3-4281-a849-b6acc1814038';

UPDATE addresses
SET area = 'Gulberg III', latitude = 31.5260, longitude = 74.3590, updated_at = now()
WHERE "entityType" = 'property' AND city = 'Lahore' AND street = 'none'
  AND "entityId" = '061cc134-8148-494f-b371-707117c95fbc';

UPDATE addresses
SET area = 'DHA Phase 5', latitude = 31.4602, longitude = 74.4264, updated_at = now()
WHERE "entityType" = 'property' AND city = 'Lahore' AND street = 'none'
  AND "entityId" = '03c0d704-1ad8-4d51-8c71-3c6420da2faf';

UPDATE addresses
SET area = 'F-7', updated_at = now()
WHERE "entityType" = 'property' AND "entityId" = '24ba61be-5f36-4ae4-be16-914c937fd87b';

-- New sample properties (id, title, type, status, price, monthly_rent, area, bedrooms, bathrooms, year_built)
INSERT INTO properties (id, title, description, type, status, price, monthly_rent, area, bedrooms, bathrooms, year_built, parcel_number, created_at, updated_at) VALUES
('20000000-0000-4000-8000-000000000001', 'DHA Phase 5 Corner Plot', 'Corner plot in DHA Phase 5, prime location', 'plot', 'available', 8500000, NULL, 500, NULL, NULL, 2018, 'D5-101', now(), now()),
('20000000-0000-4000-8000-000000000002', 'Gulberg 3 Studio Apartment', 'Compact studio apartment near Liberty', 'apartment', 'rented', 1200000, 35000, 60, 1, 1, 2015, 'G3-202', now(), now()),
('20000000-0000-4000-8000-000000000003', 'Bahria Town Luxury Villa', 'Luxury villa with garden', 'house', 'sold', 14500000, NULL, 350, 5, 6, 2020, 'BT-301', now(), now()),
('20000000-0000-4000-8000-000000000004', 'Gulberg Commercial Office', 'A-grade office space in Gulberg', 'office', 'leased', 3000000, 120000, 220, NULL, NULL, 2017, 'G3-404', now(), now()),
('20000000-0000-4000-8000-000000000005', 'F-7 Markaz Luxury Apartment', 'High-rise apartment with city view', 'apartment', 'available', 43500000, NULL, 180, 3, 3, 2022, 'F7-101', now(), now()),
('20000000-0000-4000-8000-000000000006', 'DHA Islamabad Family House', 'Spacious house in DHA Phase 2', 'house', 'under_contract', 56000000, NULL, 320, 5, 5, 2021, 'D2-555', now(), now()),
('20000000-0000-4000-8000-000000000007', 'Bahria Town Residential Plot', 'Residential plot in Bahria Town', 'plot', 'available', 3600000, NULL, 120, NULL, NULL, 2016, 'BT-707', now(), now()),
('20000000-0000-4000-8000-000000000008', 'F-7 House Duplex', 'Duplex house in F-7', 'house', 'off_market', 49500000, NULL, 400, 4, 5, 2019, 'F7-212', now(), now()),
('20000000-0000-4000-8000-000000000009', 'DHA Phase 5 Modern House', 'Modern contemporary house', 'house', 'occupied', 7800000, NULL, 280, 4, 4, 2023, 'D5-909', now(), now()),
('20000000-0000-4000-8000-000000000010', 'DHA Phase 2 Suburban Plot', 'Suburban plot in DHA Phase 2', 'plot', 'available', 5800000, NULL, 240, NULL, NULL, 2020, 'D2-232', now(), now());

-- Addresses for new properties
INSERT INTO addresses ("entityType", "entityId", street, area, city, state, zip_code, country, latitude, longitude, created_at, updated_at) VALUES
('property', '20000000-0000-4000-8000-000000000001', 'Main Boulevard', 'DHA Phase 5', 'Lahore', 'punjab', '54000', 'pakistan', 31.4590, 74.4270, now(), now()),
('property', '20000000-0000-4000-8000-000000000002', 'Liberty Market Road', 'Gulberg III', 'Lahore', 'punjab', '54000', 'pakistan', 31.5300, 74.3550, now(), now()),
('property', '20000000-0000-4000-8000-000000000003', 'Civic Center', 'Bahria Town', 'Lahore', 'punjab', '53720', 'pakistan', 31.3600, 74.2300, now(), now()),
('property', '20000000-0000-4000-8000-000000000004', 'MM Alam Road', 'Gulberg III', 'Lahore', 'punjab', '54000', 'pakistan', 31.5330, 74.3600, now(), now()),
('property', '20000000-0000-4000-8000-000000000005', 'F-7 Markaz Road', 'F-7', 'Islamabad', 'federal', '44000', 'pakistan', 33.7160, 73.0550, now(), now()),
('property', '20000000-0000-4000-8000-000000000006', 'Phase 2 Main Road', 'DHA Phase 2', 'Islamabad', 'federal', '44000', 'pakistan', 33.5300, 73.0800, now(), now()),
('property', '20000000-0000-4000-8000-000000000007', 'Thalian Road', 'Bahria Town', 'Lahore', 'punjab', '53720', 'pakistan', 31.3650, 74.2350, now(), now()),
('property', '20000000-0000-4000-8000-000000000008', 'F-7/2 Street', 'F-7', 'Islamabad', 'federal', '44000', 'pakistan', 33.7200, 73.0580, now(), now()),
('property', '20000000-0000-4000-8000-000000000009', 'Phase 5 Street 12', 'DHA Phase 5', 'Lahore', 'punjab', '54000', 'pakistan', 31.4620, 74.4290, now(), now()),
('property', '20000000-0000-4000-8000-000000000010', 'Phase 2 Avenue', 'DHA Phase 2', 'Islamabad', 'federal', '44000', 'pakistan', 33.5350, 73.0830, now(), now());

-- Ownership: all new properties owned by owner@gmail.com (32712a3f-0d87-4878-9043-bd9e5e63dbca)
INSERT INTO property_owner (property_id, owner_id, ownership_percentage, created_at, updated_at)
SELECT id, '32712a3f-0d87-4878-9043-bd9e5e63dbca', 100, now(), now()
FROM properties
WHERE id::text LIKE '20000000-%';

-- Sample area map (block plan) overlay for DHA Phase 5 Lahore
INSERT INTO area_maps (city, area, image_url, sw_lat, sw_lng, ne_lat, ne_lng, created_by, created_at, updated_at)
SELECT 'Lahore', 'DHA Phase 5', '/api/uploads/block-plan-demo-5c3637ae.png', 31.4550, 74.4190, 31.4700, 74.4400,
       '61cc0ae7-f286-4a8a-862b-aa742b2519f1', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM area_maps WHERE city = 'Lahore' AND area = 'DHA Phase 5'
);

COMMIT;