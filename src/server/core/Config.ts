import 'dotenv/config';
import { resolve } from 'node:path';


export class Config {
  private static getNodeEnv () : string {
    const value = process.env.NODE_ENV?.trim() || 'dev';

    if ( ! [ 'dev', 'development', 'test', 'prod', 'production' ].includes( value ) )
      throw new Error( `Invalid environment name: ${ value }` );

    return value;
  }

  private static getPath ( name: string, fallback: string ) : string {
    const value = process.env[ name ]?.trim() || fallback;
    return value === ':memory:' ? value : resolve( value );
  }

  private static getInteger ( name: string, fallback: number, min: number = 0, max: number = Infinity ) : number {
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

  public static readonly DB_PATH = Config.getPath( 'DB_PATH', 'data/frame.sqlite' );
  public static readonly DB_BUSY_TIMEOUT_MS = Config.getInteger( 'DB_BUSY_TIMEOUT_MS', 5000, 0, 60000 );

  public static readonly ASSETS_PATH = Config.getPath( 'ASSETS_PATH', 'data/assets' );

  public static readonly SESSION_LIFETIME_MS = Config.getInteger( 'SESSION_LIFETIME_MS', 2592000000 );
}
