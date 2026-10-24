CREATE TABLE IF NOT EXISTS requests (
 request_id text PRIMARY KEY CHECK (request_id ~ '^REQ-[0-9]{4}$'),
 customer_id text NOT NULL, summary text NOT NULL, owner_team text NOT NULL CHECK (length(owner_team)>0),
 priority text NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 status text NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','IN_PROGRESS','DONE')),
 submitted_at timestamptz NOT NULL, target_at timestamptz NOT NULL,
 actual_completed_at timestamptz, approval_required boolean NOT NULL,
 approver_id text, version integer NOT NULL CHECK(version>0),
 CHECK(target_at>=submitted_at), CHECK(actual_completed_at>=submitted_at),
 CHECK(status<>'DONE' OR actual_completed_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS approvals (
 approval_id text PRIMARY KEY, request_id text NOT NULL REFERENCES requests(request_id),
 actor_id text NOT NULL, decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED')),
 reason text NOT NULL, occurred_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
 event_id text PRIMARY KEY, request_id text NOT NULL REFERENCES requests(request_id),
 event_type text NOT NULL, actor_id text NOT NULL, occurred_at timestamptz NOT NULL,
 correlation_id text NOT NULL, details jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS source_updates (
 update_id text PRIMARY KEY, request_id text NOT NULL REFERENCES requests(request_id),
 supplier_updated_at timestamptz NOT NULL, supplier_milestone text NOT NULL, supplier_target_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS raw_inputs (source text NOT NULL, row_number integer NOT NULL, payload jsonb NOT NULL, PRIMARY KEY(source,row_number));
CREATE TABLE IF NOT EXISTS quality_findings (finding_id integer PRIMARY KEY, request_id text, source text NOT NULL, row_number integer NOT NULL, rule_id text NOT NULL, severity text NOT NULL, owner text NOT NULL, values jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS metric_eligible (request_id text PRIMARY KEY REFERENCES requests(request_id));
CREATE INDEX IF NOT EXISTS requests_active_target_idx ON requests(target_at) WHERE status IN ('SUBMITTED','APPROVED','IN_PROGRESS');
CREATE INDEX IF NOT EXISTS source_updates_latest_idx ON source_updates(request_id,supplier_updated_at DESC,update_id DESC);
CREATE INDEX IF NOT EXISTS events_request_time_idx ON events(request_id,occurred_at DESC);
