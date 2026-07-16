-- 008_payouts.sql

CREATE TABLE IF NOT EXISTS payouts (
    id                 BIGSERIAL PRIMARY KEY,
    hive_username      TEXT NOT NULL REFERENCES users(hive_username),
    week_start_date    DATE NOT NULL REFERENCES weekly_pools(week_start_date),
    base_share         NUMERIC(18,4) NOT NULL,
    multipliers_applied JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. {"fast_solver":true,"perfect_week":false,"loyalty":true}
    final_amount_hbd   NUMERIC(18,4) NOT NULL,
    payout_tx_id       TEXT,   -- Hive transfer tx id, filled in once the hot wallet broadcasts
    paid_at            TIMESTAMPTZ,

    CONSTRAINT payouts_one_per_account_per_week UNIQUE (hive_username, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_payouts_week ON payouts (week_start_date);