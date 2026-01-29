
CREATE TABLE IF NOT EXISTS user_stats (
    user_id INTEGER PRIMARY KEY,
    username TEXT DEFAULT '',
    elo INTEGER DEFAULT 1000,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    winrate INTEGER DEFAULT 0,
    average_score INTEGER DEFAULT 0,
    tournament_played INTEGER DEFAULT 0,
    tournament_won INTEGER DEFAULT 0,
    average_game_duration_in_seconde INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO user_stats (
    user_id, 
    username, 
    elo
)
VALUES (
    -1,
    'Guest',
    0
);

INSERT OR IGNORE INTO user_stats (
    user_id, 
    username, 
    elo
)
VALUES (
    0,
    '[Deleted User]',
    0
);

CREATE TABLE IF NOT EXISTS game_history (
    game_id TEXT NOT NULL,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    score_player1 INTEGER NOT NULL,
    score_player2 INTEGER NOT NULL,
    hit_player1 INTEGER NOT NULL,
    hit_player2 INTEGER NOT NULL,
    winner_id INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    game_type TEXT NOT NULL CHECK(game_type IN ('tournament', 'ranked')),
    gain_player1 INTEGER,
    gain_player2 INTEGER,
    tournament_won INTEGER DEFAULT 0,
    is_final INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
