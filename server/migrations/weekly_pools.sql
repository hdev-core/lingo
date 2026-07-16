-- 007_weekly_pools.sql
-- week_start_date is always a Monday, UTC boundary (matches daily reset UTC boundary).

CREATE TABLE IF NOT EXISTS weekly_pools (
    week_start_date        DATE PRIMARY KEY,
    total_hbd_pool          NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_qualifying_players INTEGER NOT NULL DEFAULT 0,
    status                  TEXT NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'closed', 'paid')),

    CONSTRAINT weekly_pools_monday CHECK (EXTRACT(ISODOW FROM week_start_date) = 1)
);