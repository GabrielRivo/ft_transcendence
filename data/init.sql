-- Active le mode WAL (Write-Ahead Logging) pour de meilleures performances et concurrence
PRAGMA journal_mode = WAL;

-- Active la verification des cles etrangeres (Important pour SQLite)
-- comment cela fonctionner => https://www.sqlite.org/foreignkeys.html
PRAGMA foreign_keys = ON;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE COLLATE NOCASE,
    email TEXT UNIQUE COLLATE NOCASE,
    password_hash VARCHAR(64) NOT NULL,
    provider TEXT CHECK(provider IN ('github', 'google', 'email', 'discord')) DEFAULT 'email', -- # Warning: check provider
    provider_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

-- --------------------------------------------------------
-- Table: refresh_tokens
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,    -- 0 = Valide, 1 = Revoque
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- foreign key: Si un user est delete, ses tokens le sont aussi
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON refresh_tokens(user_id);