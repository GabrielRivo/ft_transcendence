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

    const config = (await import('./config.js')).default;

    expect(config.accessTokenName).toBe('test_token');
    expect(config.jwt.secret).toBe('test_secret');
    expect(config.gameServiceUrl).toBe('http://test-game:3000');
  });

  it('should return undefined for missing environment variables', async () => {
    delete process.env.ACCESS_TOKEN_NAME;
    delete process.env.JWT_SECRET;
    delete process.env.GAME_SERVICE_URL;

    const config = (await import('./config.js')).default;

    expect(config.accessTokenName).toBeUndefined();
    expect(config.jwt.secret).toBeUndefined();
    expect(config.gameServiceUrl).toBeUndefined();
  });
});
