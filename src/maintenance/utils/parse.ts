import { assertStringId, validateNumber } from '@/src/server/utils';


export const resolveId = ( value: unknown, label: string ) : string => {
  assertStringId( value as string, label );
  return value as string;
};


export const parseNumber = ( value: string, label: string, min = 0, max = Number.MAX_SAFE_INTEGER ) : number =>
  validateNumber( value, label, min, max, true, true );


export const parseValue = ( value: unknown ) : string =>
  value === null ? '—' : typeof value === 'object' ? JSON.stringify( value ) : String( value );


export const parseJSON = ( value: string ) : unknown => {
  try { return JSON.parse( value ) }
  catch { return value }
};
