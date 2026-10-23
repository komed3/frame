export function parseId ( value: string ) : number | null {
  const id = Number( value );
  return Number.isSafeInteger( id ) && id > 0 ? id : null;
}


export function parsePagination ( l: unknown, o: unknown ) : { limit: number; offset: number } | null {
  const limit = l === undefined ? 100 : typeof l === 'string' ? Number( l ) : NaN;
  const offset = o === undefined ? 0 : typeof o === 'string' ? Number( o ) : NaN;

  if ( ! Number.isSafeInteger( limit ) || limit < 1 || limit > 500 ||
    ! Number.isSafeInteger( offset ) || offset < 0 ) return null;

  return { limit, offset };
}
