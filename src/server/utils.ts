export function assertId ( id: number, label: string ) : void {
  if ( ! Number.isSafeInteger( id ) || id < 1 ) throw new Error( `Invalid ${ label } ID: ${ id }` );
}


export function assertRelativePath ( path: string, label: string ) : void {
  if (
    typeof path !== 'string' || ! path || path.includes( '\0' ) || path.includes( '\\' ) ||
    path.startsWith( '/' ) || path.split( '/' ).some( part => ! part || part === '.' || part === '..' )
  ) throw new Error( `Invalid relative ${ label } path: ${ path }` );
}


export function assertLimitOffset ( limit: number, offset = 0 ) : void {
  if ( ! Number.isSafeInteger( limit ) || limit < 1 ) throw new Error( `Invalid plays limit: ${ limit }` );
  if ( ! Number.isSafeInteger( offset ) || offset < 0 ) throw new Error( `Invalid plays offset: ${ offset }` );
}


export function normalizeString ( value: unknown, label: string ) : string {
  if ( typeof value !== 'string' || ! value.trim() || value.includes( '\0' ) )
    throw new Error( `${ label } must not be empty` );

  return value.trim();
}


export function resolveId ( value: unknown, label: string ) : number {
  const id = Number( value );
  assertId( id, label );

  return id;
}


export function validateBoolean ( value: unknown, label: string, coerce = false ) : boolean {
  if ( typeof value === 'boolean' ) return value;

  if ( coerce && typeof value === 'string' ) {
    const parsed = value.trim().toLowerCase();

    if ( parsed === 'true' || parsed === '1' ) return true;
    if ( parsed === 'false' || parsed === '0' ) return false;
  }

  if ( coerce && ( value === 0 || value === 1 ) ) return !! value;
  throw new Error( `${ label } must be true or false` );
}


export function validateNumber ( value: unknown, label: string, min: number, max: number, integer = false, coerce = false ) : number {
  const parsed = typeof value === 'number' ? value : coerce && typeof value === 'string' && value.trim() ? Number( value ) : NaN;

  if ( ! Number.isFinite( parsed ) || ( integer && ! Number.isInteger( parsed ) ) || parsed < min || parsed > max )
    throw new Error( `${ label } must be ${ integer ? 'an integer' : 'a number' } between ${ min } and ${ max }` );

  return parsed;
}


export function validateEnum < T extends string > ( value: unknown, label: string, values: readonly T[] ) : T {
  if ( typeof value !== 'string' || ! values.includes( value as T ) )
    throw new Error( `Invalid value for ${ label }: ${ String( value ) }` );

  return value as T;
}
