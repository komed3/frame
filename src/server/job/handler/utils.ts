import type { MediaRecord } from '@/src/shared/types/media';
import type { Stats } from 'node:fs';


export function parseNumber ( value: string | number | undefined ) : number | null {
  if ( value === undefined || value === '' ) return null;

  const parsed = Number( value );
  return Number.isFinite( parsed ) ? parsed : null;
}


export function parsePositive ( value: string | number | undefined ) : number | null {
  const parsed = parseNumber( value );
  return parsed !== null && parsed > 0 ? parsed : null;
}


export function parseRate ( value?: string ) : number | null {
  if ( ! value ) return null;

  const [ numerator, denominator ] = value.split( '/' ).map( Number );
  if ( ! denominator || ! Number.isFinite( numerator ) || ! Number.isFinite( denominator ) ) return null;

  const rate = numerator / denominator;
  return Number.isFinite( rate ) && rate > 0 ? rate : null;
}


export function parseDate ( tags: Record< string, string >, ...keys: string[] ) : string | null {
  for ( const key of keys ) {
    const value = Object.entries( tags ).find( ( [ name ] ) => name.toLowerCase() === key )?.[ 1 ];
    if ( ! value ) continue;

    const compact = value.match( /^(\d{4})(\d{2})(\d{2})$/ );
    if ( compact ) return `${ compact[ 1 ] }-${ compact[ 2 ] }-${ compact[ 3 ] }`;

    const match = value.match( /^\d{4}(?:-\d{2}(?:-\d{2})?)?/ );
    if ( match ) return match[ 0 ];
  }

  return null;
}


export function assertMediaUnchange ( path: string, media: Pick< MediaRecord, 'sizeBytes' | 'modifiedAt' >, info: Stats ) : void {
  if ( info.size !== media.sizeBytes ) throw new Error( `Media size changed since scan: ${ path }` );

  if ( media.modifiedAt !== null && info.mtime.toISOString() !== media.modifiedAt )
    throw new Error( `Media modification time changed since scan: ${ path }` );
}
