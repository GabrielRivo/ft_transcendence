
CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted')) NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_friends_symmetry ON friends ((MIN(userId, otherId)), (MAX(userId, otherId)));

CREATE TABLE IF NOT EXISTS blocklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_block CHECK (userId <> otherId)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_block_unique ON blocklist (userId, otherId);

CREATE TABLE IF NOT EXISTS challengeUser(
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted')) NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, otherId)
);

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