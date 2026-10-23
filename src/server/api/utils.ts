export function parseId ( value: string ) : number | null {
  const id = Number( value );
  return Number.isSafeInteger( id ) && id > 0 ? id : null;
}


export function parsePagination ( limitValue: unknown, offsetValue: unknown ) : { limit: number; offset: number } | null {
  const limit = limitValue === undefined ? 100 : typeof limitValue === 'string' ? Number( limitValue ) : NaN;
  const offset = offsetValue === undefined ? 0 : typeof offsetValue === 'string' ? Number( offsetValue ) : NaN;

  if ( ! Number.isSafeInteger( limit ) || limit < 1 || limit > 500 ||
    ! Number.isSafeInteger( offset ) || offset < 0 ) return null;

  return { limit, offset };
}
