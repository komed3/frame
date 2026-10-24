import { as, conn } from '@/src/server/core/Database';
import { assertId, validateBoolean, validateEnum, validateNumber } from '@/src/server/utils';
import type { PrefName, PrefRow, PrefSchema, PrefTable, PrefValue } from '@/src/shared/types/pref';


export class Pref {
  public static readonly schema = {
    PLAYER_VOLUME: { type: 'number', desc: 'Default player volume', default: 1, min: 0, max: 1 },
    PLAYER_MUTED: { type: 'boolean', desc: 'Start playback muted', default: false },
    PLAYER_PLAYBACK_RATE: { type: 'number', desc: 'Default playback speed', default: 1, min: 0.25, max: 4 },
    PLAYER_AUTOPLAY_NEXT: { type: 'boolean', desc: 'Automatically play the next item', default: false },
    PLAYER_SUBTITLE_MODE: { type: 'enum', desc: 'Default subtitle behavior', default: 'auto', values: [ 'auto', 'on', 'off' ] }
  } satisfies PrefTable;

  private static isName ( name: string ) : name is PrefName {
    return Object.hasOwn( this.schema, name );
  }

  public static resolveName ( name: string ) : PrefName {
    if ( ! this.isName( name ) ) throw new Error( `Unknown preference key: ${ name }` );
    return name;
  }

  private static parseValue < K extends PrefName > ( name: K, valueJson: string ) : PrefValue< K > {
    let value: unknown;

    try { value = JSON.parse( valueJson) }
    catch { throw new Error( `Stored preference ${ name } contains invalid JSON` ) }

    return this.validate( name, value );
  }

  public static validate < K extends PrefName > ( name: K, value: unknown ) : PrefValue< K > {
    const key = this.resolveName( name ), def = this.schema[ key ];

    if ( def.type === 'boolean' ) return validateBoolean( value, key ) as PrefValue< K >;
    if ( def.type === 'number' ) return validateNumber( value, key, def.min, def.max ) as PrefValue< K >;

    return validateEnum( value, key, def.values ) as PrefValue< K >;
  }

  public static get < K extends PrefName > ( userId: string, name: K ) : PrefValue< K > {
    assertId( userId, 'user' );

    const key = this.resolveName( name ), row = as< PrefRow | null >( conn().prepare(
      'SELECT key, value_json, updated_at FROM user_preferences WHERE user_id = ? AND key = ?'
    ).get( userId, key ) );

    return ( row ? this.parseValue( key, row.value_json ) : this.schema[ key ].default ) as PrefValue< K >;
  }

  public static all ( userId: string ) : PrefSchema {
    assertId( userId, 'user' );

    const result = Object.fromEntries( Object.entries( this.schema ).map(
      ( [ name, def ] ) => [ name, def.default ] )
    ) as unknown as PrefSchema;

    const rows = as< PrefRow[] >( conn().prepare(
      'SELECT key, value_json, updated_at FROM user_preferences WHERE user_id = ?'
    ).all( userId ) );

    for ( const row of rows ) {
      if ( ! this.isName( row.key ) ) continue;

      const key = this.resolveName( row.key );
      Object.assign( result, { [ key ]: this.parseValue( key, row.value_json ) } );
    }

    return result;
  }

  public static set < K extends PrefName > ( userId: string, name: K, value: PrefValue< K > ) : PrefValue< K > {
    assertId( userId, 'user' );

    const key = this.resolveName( name );
    const parsed = this.validate( key, value ) as PrefValue< K >;

    conn().prepare( `
      INSERT INTO user_preferences ( user_id, key, value_json )
      VALUES ( ?, ?, ? )
      ON CONFLICT ( user_id, key ) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
    ` ).run( userId, key, JSON.stringify( parsed ) );

    return parsed;
  }

  public static reset ( userId: string, name: PrefName ) : boolean {
    assertId( userId, 'user' );

    const key = this.resolveName( name );
    const result = conn().prepare( 'DELETE FROM user_preferences WHERE user_id = ? AND key = ?' ).run( userId, key );

    return Number( result.changes ) > 0;
  }

  public static resetAll ( userId: string ) : number {
    assertId( userId, 'user' );

    const result = conn().prepare( 'DELETE FROM user_preferences WHERE user_id = ?' ).run( userId );
    return Number( result.changes );
  }
}
