import type { ConfigDefinition, ConfigName, ConfigValue } from '@/src/shared/types/config';
import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';


export class Config {
  public static readonly ENV_FILE = resolve( '.env' );
  private static readonly SCHEMA = {
    NODE_ENV: {
      type: 'enum',
      default: 'dev',
      values: [ 'dev', 'development', 'test', 'prod', 'production' ],
      description: 'Runtime environment'
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0',
      description: 'Server bind address'
    },
    PORT: {
      type: 'integer',
      default: 3000,
      min: 1,
      max: 65535,
      description: 'Server port'
    },
    DB_PATH: {
      type: 'path',
      default: 'data/frame.sqlite',
      description: 'SQLite database path'
    },
    DB_BUSY_TIMEOUT_MS: {
      type: 'integer',
      default: 5000,
      min: 0,
      max: 60000,
      description: 'SQLite busy timeout in milliseconds'
    },
    ASSETS_PATH: {
      type: 'path',
      default: 'data/assets',
      description: 'Media assets directory'
    },
    SESSION_LIFETIME_MS: {
      type: 'integer',
      default: 2592000000,
      min: 0,
      description: 'Session lifetime in milliseconds'
    }
  } satisfies Record< string, ConfigDefinition >;
}
