import 'dotenv/config';
import { resolve } from 'node:path';


export class Config {
  private static getNodeEnv () : string {
    const value = process.env.NODE_ENV?.trim() || 'dev';

    if ( ! [ 'development', 'dev', 'test', 'prod', 'production' ].includes( value ) )
      throw new Error( `Invalid NODE_ENV: ${ value }` );

    return value;
  }

  static readonly NODE_ENV = Config.getNodeEnv();
  static readonly HOST = process.env.FRAME_HOST?.trim() || '0.0.0.0';
  static readonly PORT = Config.getInteger( 'FRAME_PORT', 3000, 1, 65535 );
  static readonly DATABASE_PATH = resolve( process.env.FRAME_DATABASE_PATH?.trim() || 'data/frame.sqlite' );
  static readonly DB_BUSY_TIMEOUT_MS = Config.getInteger( 'FRAME_DB_BUSY_TIMEOUT_MS', 5000, 0, 60000 );
}
