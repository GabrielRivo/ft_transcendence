
CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_friend CHECK (userId <> otherId)
); --- Rajouter le pending pour les friend request : si la demande est acceptee, retirer le peding et ajouter
--- IS refuser, retirer le pending et supprimer
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_other_unique ON friends (userId, otherId);


CREATE TABLE IF NOT EXISTS blocklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_block CHECK (userId <> otherId)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_block_unique ON blocklist (userId, otherId);


--- Creer les salons prives
-- Methode pour add un user au salon 
-- methode pour delete un user du salon / le faire quitter

-- CREATE TABLE IF NOT EXISTS privateChatRoom(
--     roomId INTEGER PRIMARY KEY AUTOINCREMENT,

-- );


CREATE TABLE IF NOT EXISTS matchHistory (
    gameId INTEGER PRIMARY KEY,
    userId1 INTEGER NOT NULL, 
    userId2 INTEGER NOT NULL,
    scoreUser1 INTEGER NOT NULL,
    scoreUser2 INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generalChatHistory(
    msgId INTEGER PRIMARY KEY,
    userId INTEGER,
    msgContent VARCHAR(5000),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS privateChatHistory(
    msgId INTEGER PRIMARY KEY,
    userId1 INTEGER NOT NULL,
    userId2 INTEGER NOT NULL,
    msgContent VARCHAR(5000),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS privateGroup (
    groupId INTEGER PRIMARY KEY AUTOINCREMENT,
    -- les users ?
    msgContent VARCHAR(5000),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS groupChatHistory(
    msgId INTEGER PRIMARY KEY,
    userId INTEGER,
    msgContent VARCHAR(5000),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournamentChatHistory(
    chatId INTEGER PRIMARY KEY,
    msgId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    msgContent VARCHAR(5000),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS tournamentChatLink(
    tournamentId INTEGER PRIMARY KEY,
    chatId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
