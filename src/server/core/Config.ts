import { normalizeString, validateBoolean, validateEnum, validateNumber } from '@/src/server/utils';
import type { ConfigName, ConfigSchema, ConfigTable, ConfigValue } from '@/src/shared/types/config';
import dotenv from 'dotenv';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

dotenv.config( { override: true, quiet: true } );


export class Config {
  public static readonly schema = {
    NODE_ENV: { type: 'enum', desc: 'Runtime environment', default: 'dev', values: [ 'dev', 'development', 'test', 'prod', 'production' ] },
    HOST: { type: 'string', desc: 'HTTP bind address', default: '0.0.0.0' },
    PORT: { type: 'integer', desc: 'HTTP port', default: 3e3, min: 1, max: 65535 },
    WORKER_CONCURRENCY: { type: 'integer', desc: 'Maximum number of concurrent background jobs', default: 1, min: 1, max: 16 },
    WORKER_POLL_INTERVAL_MS: { type: 'integer', desc: 'Background job polling interval in milliseconds', default: 1e3, min: 100, max: 6e4 },
    WORKER_RETRY_DELAY_MS: { type: 'integer', desc: 'Background job retry delay in milliseconds', default: 1e3, min: 100, max: 6e4 },
    WORKER_MAX_RETRY_DELAY_MS: { type: 'integer', desc: 'Maximum background job retry delay in milliseconds', default: 6e4, min: 1e3, max: 6e4 },
    DB_PATH: { type: 'path', desc: 'SQLite database path', default: 'data/frame.sqlite' },
    DB_BUSY_TIMEOUT_MS: { type: 'integer', desc: 'SQLite busy timeout', default: 5e3, min: 0, max: 6e4 },
    SESSION_LIFETIME_MS: { type: 'integer', desc: 'Session lifetime', default: 2592e6, min: 6e4, max: 31536e6 },
    PASSWORD_STRICT: { type: 'boolean', desc: 'Enforce strong password requirements', default: true },
    ASSETS_PATH: { type: 'path', desc: 'Generated assets path', default: 'data/assets' },
    ASSETS_TIMEOUT_MS: { type: 'integer', desc: 'Asset job timeout in milliseconds', default: 1.5e6, min: 1e3, max: 86.4e6 },
    FFMPEG_TIMEOUT_MS: { type: 'integer', desc: 'FFmpeg timeout in milliseconds', default: 1.5e6, min: 1e3, max: 86.4e6 },
    FFPROBE_TIMEOUT_MS: { type: 'integer', desc: 'FFprobe timeout in milliseconds', default: 1.2e5, min: 1e3, max: 86.4e6 },
    WAVE_TIMEOUT_MS: { type: 'integer', desc: 'Waveform extraction timeout in milliseconds', default: 1.5e6, min: 1e3, max: 86.4e6 },
    SCRUBBER_FPS: { type: 'number', desc: 'Scrubber frames per second', default: 1, min: 0.1, max: 10 },
    SCRUBBER_MAX_FRAMES: { type: 'integer', desc: 'Maximum scrubber frames per video', default: 450, min: 1, max: 500 },
    SCRUBBER_MIN_FRAMES: { type: 'integer', desc: 'Minimum scrubber frames per video', default: 24, min: 1, max: 500 },
  } satisfies ConfigTable;

  private static isName ( name: string ) : name is ConfigName {
    return Object.hasOwn( this.schema, name );
  }

  public static resolveName ( name: string ) : ConfigName {
    if ( ! this.isName( name ) ) throw new Error( `Unknown configuration key: ${ name }` );
    return name;
  }

  public static validate < K extends ConfigName > ( name: K, value: unknown ) : ConfigValue< K > {
    const key = this.resolveName( name ), def = this.schema[ key ];

    if ( def.type === 'boolean' ) return validateBoolean( value, key, true ) as ConfigValue< K >;
    if ( def.type === 'integer' || def.type === 'number' ) return validateNumber(
      value, key, def.min, def.max, def.type === 'integer', true
    ) as ConfigValue< K >;

    const parsed = normalizeString( value, key );
    if ( def.type === 'enum' ) return validateEnum( parsed, key, def.values ) as ConfigValue< K >;

    return ( def.type === 'path'
      ? key === 'DB_PATH' && parsed === ':memory:' ? parsed : resolve( parsed )
      : parsed ) as ConfigValue< K >;
  }

  public static get < K extends ConfigName > ( name: K ) : ConfigValue< K > {
    const key = this.resolveName( name );
    return this.validate( key, process.env[ key ] ?? this.schema[ key ].default ) as ConfigValue< K >;
  }

  public static set < K extends ConfigName > ( name: K, value: ConfigValue< K > ) : ConfigValue< K > {
    const key = this.resolveName( name ), parsed = this.validate( key, value ) as ConfigValue< K >;
    const file = resolve( '.env' );
    const lines = ( existsSync( file ) ? readFileSync( file, 'utf8' ) : '' ).split( /\r?\n/ );
    const pattern = new RegExp( `^\\s*(?:export\\s+)?${ key }\\s*=` );
    const matches = lines.reduce( ( idx, line, i ) => pattern.test( line ) ? [ ...idx, i ] : idx, [] as number[] );
    const line = `${ key }=${ JSON.stringify( parsed ) }`;

    if ( matches.length ) {
      lines[ matches[ 0 ] ] = line;
      for ( const index of matches.slice( 1 ).reverse() ) lines.splice( index, 1 );
    } else lines.push( line );

    writeFileSync( file, `${ lines.filter( line => line.trim() !== '' ).join( '\n' ) }\n`, { mode: 0o600 } );
    chmodSync( file, 0o600 );
    process.env[ key ] = String( parsed );

    return parsed;
  }

  public static reset ( name: ConfigName ) : void {
    const key = this.resolveName( name );
    this.set( key, this.schema[ key ].default as ConfigValue< typeof key > );
  }

  public static all () : ConfigSchema {
    const result = Object.create( null ) as ConfigSchema;
    const values = result as Record< ConfigName, ConfigSchema[ ConfigName ] >;

    for ( const name of Object.keys( this.schema ) ) {
      const key = this.resolveName( name );
      values[ key ] = this.get( key );
    }

    return result;
  }
}
