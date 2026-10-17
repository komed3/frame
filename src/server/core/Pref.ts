import { as, conn } from '@/src/server/core/Database';
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

  private static parseValue < K extends PrefName > ( name: K, valueJson: string ) : PrefValue< K > {
    let value: unknown;

    try { value = JSON.parse( valueJson ) }
    catch { throw new Error( `Stored preference ${ name } contains invalid JSON` ) }

    return this.validate( name, value );
  }

  public static validate < K extends PrefName > ( name: K, value: unknown ) : PrefValue< K > {
    const def = this.schema[ name ];

    if ( def.type === 'boolean' ) {
      if ( typeof value !== 'boolean' ) throw new Error( `${ name } must be a boolean` );
      return value as PrefValue< K >;
    }

    if ( def.type === 'number' ) {
      if ( typeof value !== 'number' || ! Number.isFinite( value ) || value < def.min || value > def.max )
        throw new Error( `${ name } must be a number between ${ def.min } and ${ def.max }` );

      return value as PrefValue< K >;
    }

    if ( typeof value !== 'string' || ! def.values.some( option => option === value ) )
      throw new Error( `Invalid value for ${ name }: ${ String( value ) }` );

    return value as PrefValue< K >;
  }

  public static get < K extends PrefName > ( userId: number, name: K ) : PrefValue< K > {
    const row = as< PrefRow | null >( conn().prepare(
      'SELECT key, value_json, updated_at FROM user_preferences WHERE user_id = ? AND key = ?'
    ).get( userId, name ) );

    return row ? this.parseValue( name, row.value_json ) : this.schema[ name ].default as PrefValue< K >;
  }

  public static all ( userId: number ) : PrefSchema {
    const result = Object.fromEntries( Object.entries( this.schema ).map(
      ( [ name, def ] ) => [ name, def.default ] )
    ) as unknown as PrefSchema;

    const rows = as< PrefRow[] >( conn().prepare(
      'SELECT key, value_json, updated_at FROM user_preferences WHERE user_id = ?'
    ).all( userId ) );

    for ( const row of rows ) {
      if ( ! this.isName( row.key ) ) continue;
      Object.assign( result, { [ row.key ]: this.parseValue( row.key, row.value_json ) } );
    }

    return result;
  }
}
