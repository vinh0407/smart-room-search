CREATE TABLE IF NOT EXISTS room_demands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT,
  district TEXT,
  max_price INTEGER NOT NULL DEFAULT 0,
  people_count INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_demands_created_at
  ON room_demands(created_at DESC);
