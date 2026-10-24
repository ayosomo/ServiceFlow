SELECT request_id, owner_team, target_at FROM requests
WHERE status IN ('SUBMITTED','APPROVED','IN_PROGRESS') AND target_at < $1::timestamptz
ORDER BY target_at,request_id;
