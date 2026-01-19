import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load configuration from environment variables', async () => {
    process.env.ACCESS_TOKEN_NAME = 'test_token';
    process.env.JWT_SECRET = 'test_secret';
    process.env.GAME_SERVICE_URL = 'http://test-game:3000';
    process.env.RABBITMQ_URI = 'amqp://guest:guest@localhost:5672';
    process.env.DB_PATH = '/tmp/db.sqlite';
    process.env.INIT_SQL_PATH = '/tmp/init.sql';

    const config = (await import('./config.js')).default;

    expect(config.accessTokenName).toBe('test_token');
    expect(config.jwt.secret).toBe('test_secret');
    expect(config.gameServiceUrl).toBe('http://test-game:3000');
    expect(config.rabbitmqUri).toBe('amqp://guest:guest@localhost:5672');
    expect(config.db.path).toBe('/tmp/db.sqlite');
    expect(config.db.initSqlPath).toBe('/tmp/init.sql');
  });

  it('should trim environment variable values', async () => {
    process.env.ACCESS_TOKEN_NAME = '  token  ';
    process.env.JWT_SECRET = '  secret  ';
    process.env.GAME_SERVICE_URL = ' http://test-game:3000 ';
    process.env.DB_PATH = ' /tmp/db.sqlite ';
    process.env.INIT_SQL_PATH = ' /tmp/init.sql ';

    const configModule = await import('./config.js');
    const config = configModule.default;

    expect(config.accessTokenName).toBe('token');
    expect(config.jwt.secret).toBe('secret');
    expect(config.gameServiceUrl).toBe('http://test-game:3000');
    expect(config.db.path).toBe('/tmp/db.sqlite');
    expect(config.db.initSqlPath).toBe('/tmp/init.sql');
  });

  it('should throw when required environment variables are missing', async () => {
    delete process.env.ACCESS_TOKEN_NAME;
    delete process.env.JWT_SECRET;
    delete process.env.GAME_SERVICE_URL;
    delete process.env.DB_PATH;
    delete process.env.INIT_SQL_PATH;

    await expect(import('./config.js')).rejects.toThrow('Configuration validation failed');
    await expect(import('./config.js')).rejects.toThrow('Missing required environment variable');
  });

  it('should throw when GAME_SERVICE_URL is invalid', async () => {
    process.env.ACCESS_TOKEN_NAME = 'token';
    process.env.JWT_SECRET = 'secret';
    process.env.GAME_SERVICE_URL = 'not-a-url';
    process.env.DB_PATH = '/tmp/db.sqlite';
    process.env.INIT_SQL_PATH = '/tmp/init.sql';

    await expect(import('./config.js')).rejects.toThrow('GAME_SERVICE_URL must be a valid URL');
  });
});
