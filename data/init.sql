-- Enable Foreign Keys support (SQLite default is OFF)
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- Table: tournaments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED')),
    size INTEGER NOT NULL CHECK (size IN (4, 8, 16)),
    current_round INTEGER DEFAULT 1,
    start_mode TEXT NOT NULL CHECK (start_mode IN ('MANUAL', 'AUTO_FULL', 'AUTO_TIMER')),
    start_date TEXT, -- ISO8601 string
    bracket_data TEXT NOT NULL, -- JSON Payload
    created_by TEXT, -- UUID of the creator (User ID)
    admin_secret TEXT, -- Secret token for guest admin
    version INTEGER DEFAULT 0, -- Optimistic Lock
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- Table: participants
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY NOT NULL,
    tournament_id TEXT NOT NULL,
    user_id TEXT, -- Nullable (Guest)
    alias TEXT NOT NULL,
    avatar TEXT,
    rank INTEGER, -- Final rank (1, 2, 3...)
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Indexes for Performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_participants_tournament ON participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
