import type { ConfigName, ConfigSchema, ConfigTable, ConfigValue } from '@/src/shared/types/config';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import 'dotenv/config';


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

  public static validate < K extends ConfigName > ( name: K, value: unknown ) : ConfigValue< K > {
    const def = this.schema[ name ];

    if ( def.type === 'boolean' ) {
      if ( typeof value === 'boolean' ) return value as ConfigValue< K >;

      if ( typeof value === 'string' ) {
        if ( value.trim().toLowerCase() === 'true' ) return true as ConfigValue< K >;
        if ( value.trim().toLowerCase() === 'false' ) return false as ConfigValue< K >;
      }

      if ( typeof value === 'number' ) {
        if ( value === 1 ) return true as ConfigValue< K >;
        else return false as ConfigValue< K >;
      }

      throw new Error( `${ name } must be true or false` );
    }

    if ( def.type === 'integer' ) {
      const parsed = typeof value === 'number' ? value : Number( value );

      if ( ! Number.isInteger( parsed ) || parsed < def.min || parsed > def.max )
        throw new Error( `${ name } must be an integer between ${ def.min } and ${ def.max }` );

      return parsed as ConfigValue< K >;
    }

    if ( typeof value !== 'string' || ! value.trim() )
      throw new Error( `${ name } must be a non-empty string` );

    const parsed = value.trim();

    if ( def.type === 'enum' && ! def.values.includes( parsed ) )
      throw new Error( `Invalid value for ${ name }: ${ parsed }` );

    return ( def.type === 'path'
      ? name === 'DB_PATH' && parsed === ':memory:' ? parsed : resolve( parsed )
      : parsed ) as ConfigValue< K >;
  }

  public static get < K extends ConfigName > ( name: K ) : ConfigValue< K > {
    return this.validate( name, process.env[ name ] ?? this.schema[ name ].default );
  }

  public static set < K extends ConfigName > ( name: K, value: ConfigValue< K > ) : ConfigValue< K > {
    const parsed = this.validate( name, value ), file = resolve( '.env' );
    const lines = ( existsSync( file ) ? readFileSync( file, 'utf8' ) : '' ).split( /\r?\n/ );
    const pattern = new RegExp( `^\\s*(?:export\\s+)?${ name }\\s*=` );
    const matches = lines.reduce( ( idx, l, i ) => pattern.test( l ) ? [ ...idx, i ] : idx, [] as number[] );
    const line = `${ name }=${ JSON.stringify( parsed ) }`;

    if ( matches.length ) {
      lines[ matches[ 0 ] ] = line;
      for ( const index of matches.slice( 1 ).reverse() ) lines.splice( index, 1 );
    } else lines.push( line );

    writeFileSync( file, `${ lines.filter( l => l.trim() !== '' ).join( '\n' ) }\n`, { mode: 0o600 } );
    chmodSync( file, 0o600 );
    process.env[ name ] = String( parsed );

    return parsed;
  }

  public static reset ( name: ConfigName ) : void {
    this.set( name, this.schema[ name ].default as ConfigValue< typeof name > );
  }

  public static all () : ConfigSchema {
    return Object.assign( Object.create( null ), ...Object.keys( this.schema ).map(
      name => ( { [ name ]: this.get( name as ConfigName ) } )
    ) );
  }
}
