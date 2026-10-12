import { execFile } from 'node:child_process';
import { promisify } from 'node:util';


export const execFileAsync = promisify( execFile );

export function envNumber ( name: string, fallback: number, min: number, max: number ) : number {
  const value = process.env[ name ];
  if ( ! value?.trim() ) return fallback;

  const number = Number( value );
  return Number.isFinite( number ) ? Math.min( max, Math.max( min, number ) ) : fallback;
}

export function envInteger ( name: string, fallback: number, min: number, max: number ) : number {
  return Math.trunc( envNumber( name, fallback, min, max ) );
}
