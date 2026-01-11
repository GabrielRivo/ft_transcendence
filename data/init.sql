CREATE TABLE IF NOT EXISTS test (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test (name, email) VALUES
    ('Michel', 'michel@example.com');

CREATE TABLE IF NOT EXISTS game_stats (
    game_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1 INTEGER NOT NULL,
    player2 INTEGER NOT NULL,
    score_player1 INTEGER NOT NULL,
    score_player2 INTEGER NOT NULL,
    game_duration_in_seconde INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);