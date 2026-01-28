CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    owner_id TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC',
    status TEXT NOT NULL,
    winner_id TEXT,
    invite_code TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0
);

-- Table des Participants (Liés à un tournoi)
CREATE TABLE IF NOT EXISTS participants (
    tournament_id TEXT NOT NULL,
    id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'USER' ou 'GUEST'
    PRIMARY KEY (tournament_id, id),
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Table des Matchs
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    player_a_id TEXT,
    player_b_id TEXT,
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    winner_id TEXT,
    status TEXT NOT NULL,
    win_reason TEXT, -- 'SCORE' ou 'WALKOVER'
    FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);
