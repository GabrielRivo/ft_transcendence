import dotenv from 'dotenv';

dotenv.config();

export default {
  accessTokenName: process.env.ACCESS_TOKEN_NAME,
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  gameServiceUrl: process.env.GAME_SERVICE_URL,
  // Constantes métier
  tournament: {
    minPlayers: 4,
    matchAcceptTimeout: 120000, // 2 minutes
    matchReadyTimeout: 30000,   // 30 secondes
  },
};
