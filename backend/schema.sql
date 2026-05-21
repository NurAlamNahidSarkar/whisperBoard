-- ============================================================
--  WhisperBoard — PostgreSQL Schema
--  Run once:  psql -U postgres -f schema.sql
-- ============================================================

-- 1. Create database (run separately if it doesn't exist)
-- CREATE DATABASE whisperboard;
-- \c whisperboard

-- 2. Messages table
--    ⚠️  NO sender column — anonymity is guaranteed by design.
CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL       PRIMARY KEY,
    recipient   VARCHAR(100) NOT NULL,
    message     TEXT         NOT NULL,
    hash        INTEGER      NOT NULL,  -- random, NOT derived from sender
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);
CREATE INDEX IF NOT EXISTS idx_messages_created   ON messages(created_at DESC);

-- 3. Optional demo rows (remove in production)
INSERT INTO messages (recipient, message, hash) VALUES
  ('Jubair', 'You always interrupt people mid-sentence. Please work on active listening.', 1238),
  ('Nahid',  'Your code reviews are thorough and genuinely helpful. Thank you!', 5521),
  ('Mahbub', 'You have been consistently late to morning meetings. It affects everyone.', 9872),
  ('Jubair', 'Your presentations are always well-structured and inspiring. Keep it up!', 3310),
  ('Sadia',  'The way you handled that conflict last week was incredibly mature. Real leadership.', 4456);
