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
    PORT: { type: 'integer', desc: 'HTTP port', default: 3000, min: 1, max: 65535 },
    DB_PATH: { type: 'path', desc: 'SQLite database path', default: 'data/frame.sqlite' },
    DB_BUSY_TIMEOUT_MS: { type: 'integer', desc: 'SQLite busy timeout', default: 5000, min: 0, max: 6e4 },
    ASSETS_PATH: { type: 'path', desc: 'Generated assets path', default: 'data/assets' },
    SESSION_LIFETIME_MS: { type: 'integer', desc: 'Session lifetime', default: 2592e6, min: 6e4, max: 31536e6 },
    PASSWORD_STRICT: { type: 'boolean', desc: 'Enforce strong password requirements', default: true }
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
    if ( def.type === 'integer' ) return validateNumber( value, key, def.min, def.max, true, true ) as ConfigValue< K >;

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

    for ( const name of Object.keys( this.schema ) ) {
      const key = this.resolveName( name );
      result[ key ] = this.get( key );
    }

    return result;
  }
}
