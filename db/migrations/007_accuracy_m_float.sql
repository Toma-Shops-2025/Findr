-- Findr hotfix v16: GPS accuracy is a float (meters).
-- Stage 2a POST /geo/location sent pos.coords.accuracy (~56.86) into
-- user_locations.accuracy_m INTEGER, causing:
--   invalid input syntax for type integer: "56.86499786376953"
-- That value is GPS accuracy in meters, not latitude.

ALTER TABLE user_locations
  ALTER COLUMN accuracy_m TYPE DOUBLE PRECISION
  USING accuracy_m::double precision;

COMMENT ON COLUMN user_locations.accuracy_m IS
  'Optional device GPS accuracy in meters (float). Lat/lng live in geom (geography).';