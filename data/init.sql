
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    tournament_won INTEGER DEFAULT 0,
    tournament_played INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO users (id, tournament_won, tournament_played, created_at)
VALUES (1, 0, 0, CURRENT_TIMESTAMP), (2, 0, 0, CURRENT_TIMESTAMP), (3, 0, 0, CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS user_stats (
    user_id INTEGER PRIMARY KEY,
    elo INTEGER DEFAULT 700,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    winrate INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    average_score INTEGER DEFAULT 0,
    tournament_played INTEGER DEFAULT 0,
    tournament_won INTEGER DEFAULT 0,
    average_game_duration_in_seconde INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT OR IGNORE INTO user_stats (user_id)
VALUES (1), (2), (3);


CREATE TABLE IF NOT EXISTS game_history (
    game_id INTEGER PRIMARY KEY,
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
    tournament_id INTEGER,
    tournament_won INTEGER DEFAULT 0,
    is_final INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player1_id) REFERENCES users(id),
    FOREIGN KEY (player2_id) REFERENCES users(id),
    FOREIGN KEY (tournament_id) REFERENCES tournament(tournament_id)
);

CREATE TABLE IF NOT EXISTS tournament (
    tournament_id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'pending',
    winner_id INTEGER,
    players_number INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_players (
    tournament_id INTEGER,
    user_id INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournament(tournament_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT OR IGNORE INTO tournament (tournament_id, status, players_number)
VALUES (900, 'started', 4);

