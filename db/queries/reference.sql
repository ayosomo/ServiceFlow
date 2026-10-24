-- Snapshot is a parameter, never now(). Base stores valid fiction; metric_eligible
-- is the explicitly assessed subset of the preserved dirty feed.
WITH latest AS (
 SELECT *, ROW_NUMBER() OVER (PARTITION BY request_id ORDER BY supplier_updated_at DESC,update_id DESC) AS rn FROM source_updates
), assessed AS (
 SELECT r.*, s.supplier_target_at FROM requests r
 JOIN metric_eligible e USING(request_id)
 LEFT JOIN latest s ON s.request_id=r.request_id AND s.rn=1
)
SELECT COUNT(*) AS eligible,
 COUNT(*) FILTER (WHERE status IN ('SUBMITTED','APPROVED','IN_PROGRESS')) AS active,
 COUNT(*) FILTER (WHERE status IN ('SUBMITTED','APPROVED','IN_PROGRESS') AND NOT (approval_required AND approver_id IS NULL)) AS ready,
 COUNT(*) FILTER (WHERE status IN ('SUBMITTED','APPROVED','IN_PROGRESS') AND target_at < $1::timestamptz) AS overdue,
 COUNT(*) FILTER (WHERE status='DONE') AS done,
 COUNT(*) FILTER (WHERE status='DONE' AND actual_completed_at<=target_at) AS on_time
FROM assessed;
