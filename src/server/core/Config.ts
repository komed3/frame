import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConfigName, ConfigSchema, ConfigTable, ConfigValue } from '@/src/shared/types/config';


export class Config {
  public static readonly schema = {
    NODE_ENV: { type: 'enum', desc: 'Runtime environment', default: 'dev', values: [ 'dev', 'development', 'test', 'prod', 'production' ] },
    HOST: { type: 'string', desc: 'HTTP bind address', default: '0.0.0.0' },
    PORT: { type: 'integer', desc: 'HTTP port', default: 3000, min: 1, max: 65535 },
    DB_PATH: { type: 'path', desc: 'SQLite database path', default: 'data/frame.sqlite' },
    DB_BUSY_TIMEOUT_MS: { type: 'integer', desc: 'SQLite busy timeout', default: 5000, min: 0, max: 6e4 },
    ASSETS_PATH: { type: 'path', desc: 'Generated assets path', default: 'data/assets' },
    SESSION_LIFETIME_MS: { type: 'integer', desc: 'Session lifetime', default: 2592e6, min: 6e4, max: 31536e6 }
  } satisfies ConfigTable;

  public static validate < K extends ConfigName > ( name: K, value: unknown ) : ConfigValue< K > {
    const definition = this.schema[ name ];

    if ( definition.type === 'integer' ) {
      const parsed = typeof value === 'number' ? value : Number( value );

      if ( ! Number.isInteger( parsed ) || parsed < definition.min || parsed > definition.max )
        throw new Error( `${ name } must be an integer between ${ definition.min } and ${ definition.max }` );

      return parsed as ConfigValue< K >;
    }

    if ( typeof value !== 'string' || ! value.trim() )
      throw new Error( `${ name } must be a non-empty string` );

    const parsed = value.trim();

    if ( definition.type === 'enum' && ! definition.values.includes( parsed ) )
      throw new Error( `Invalid value for ${ name }: ${ parsed }` );

    return ( definition.type === 'path'
      ? name === 'DB_PATH' && parsed === ':memory:' ? parsed : resolve( parsed )
      : parsed ) as ConfigValue< K >;
  }

  public static get < K extends ConfigName > ( name: K ) : ConfigValue< K > {
    return this.validate( name, process.env[ name ] ?? this.schema[ name ].default );
  }
}
