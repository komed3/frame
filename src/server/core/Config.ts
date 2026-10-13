import 'dotenv/config';
import { resolve } from 'node:path';


export class Config {
  private static getNodeEnv () : string {
    const value = process.env.NODE_ENV?.trim() || 'dev';

    if ( ! [ 'development', 'dev', 'test', 'prod', 'production' ].includes( value ) )
      throw new Error( `Invalid NODE_ENV: ${ value }` );

    return value;
  }

  private static getInteger ( name: string, fallback: number, min: number, max: number ) : number {
    const raw = process.env[ name ]?.trim();
    if ( ! raw ) return fallback;

    const value = Number( raw );
    if ( ! Number.isInteger( value ) || value < min || value > max )
      throw new Error( `${ name } must be an integer between ${ min } and ${ max }` );

    return value;
  }

  public static readonly NODE_ENV = Config.getNodeEnv();
  public static readonly HOST = process.env.HOST?.trim() || '0.0.0.0';
  public static readonly PORT = Config.getInteger( 'PORT', 3000, 1, 65535 );
  public static readonly DB_PATH = resolve( process.env.DB_PATH?.trim() || 'data/frame.sqlite' );
  public static readonly DB_BUSY_TIMEOUT_MS = Config.getInteger( 'DB_BUSY_TIMEOUT_MS', 5000, 0, 60000 );
  public static readonly ASSETS_PATH = resolve( process.env.ASSETS_PATH?.trim() || 'data/assets' );
}
