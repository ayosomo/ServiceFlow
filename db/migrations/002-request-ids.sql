-- Additive identifier acceptance; retain all existing IDs and dependent foreign keys.
-- The known 001 check name is PostgreSQL's generated requests_request_id_check.
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_request_id_check;
ALTER TABLE requests ADD CONSTRAINT requests_request_id_check CHECK (
 request_id ~ '^REQ-([0-9]{4}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$'
);
