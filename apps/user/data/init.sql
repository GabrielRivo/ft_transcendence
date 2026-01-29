PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- --------------------------------------------------------
-- Table: profiles (Base Users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    userId INTEGER PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
    bio TEXT NOT NULL DEFAULT '',
    avatar TEXT DEFAULT NULL,
    avatar_provider TEXT DEFAULT NULL,
    self_hosted INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username) WHERE username != '';

INSERT OR IGNORE INTO profiles (userId, username, bio, avatar, avatar_provider, self_hosted, created_at, updated_at)
VALUES (0, '[Deleted User]', 'Deleted user', NULL, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- --------------------------------------------------------
-- Table: friends
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted')) NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys with Cascade
    CONSTRAINT fk_friends_user FOREIGN KEY (userId) REFERENCES profiles(userId) ON DELETE CASCADE,
    CONSTRAINT fk_friends_other FOREIGN KEY (otherId) REFERENCES profiles(userId) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friends_symmetry ON friends ((MIN(userId, otherId)), (MAX(userId, otherId)));

-- --------------------------------------------------------
-- Table: blocklist
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_block CHECK (userId <> otherId),

    -- Foreign Keys with Cascade
    CONSTRAINT fk_block_user FOREIGN KEY (userId) REFERENCES profiles(userId) ON DELETE CASCADE,
    CONSTRAINT fk_block_other FOREIGN KEY (otherId) REFERENCES profiles(userId) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_block_unique ON blocklist (userId, otherId);

-- --------------------------------------------------------
-- Table: challengeUser
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS challengeUser(
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted')) NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, otherId),

    -- Foreign Keys with Cascade
    CONSTRAINT fk_challenge_user FOREIGN KEY (userId) REFERENCES profiles(userId) ON DELETE CASCADE,
    CONSTRAINT fk_challenge_other FOREIGN KEY (otherId) REFERENCES profiles(userId) ON DELETE CASCADE
);