CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_other_unique ON friends (userId, otherId);


CREATE TABLE IF NOT EXISTS blocklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    otherId INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


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

-- SELECT
--     tournamentId,
--     msgId,
--     userId,
--     msgContent
-- FROM tournamentChatLink
-- LEFT JOIN tournamntChatHistory ON tournamentChatLink.chatId = tournamentChatLink.chatId
-- WHERE tournamentId = 1