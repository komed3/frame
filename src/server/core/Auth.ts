import { users } from '@/src/server/core/User';
import { as, conn, db } from '@/src/server/core/Database';
import type { AuthResult, SessionRow } from '@/src/shared/types/user';
import { createHash, randomBytes } from 'node:crypto';
import { Config } from '@/src/server/core/Config';


export class Auth {
  private hashToken ( token: string ) : string {
    return createHash( 'sha256' ).update( token ).digest( 'hex' );
  }

  public async login ( username: string, pw: string ) : Promise< AuthResult > {
    const user = users.getByUsername( username );
    if ( ! user || user.disabledAt || ! await users.verifyPassword( user.id, pw ) )
      throw new Error( 'Invalid username or password' );

    const token = randomBytes( 32 ).toString( 'base64url' );
    const now = new Date(), createdAt = now.toISOString();
    const expiresAt = new Date( now.getTime() + Config.SESSION_LIFETIME_MS ).toISOString();

    db.transaction( db => {
      db.prepare( 'DELETE FROM sessions WHERE expires_at <= ?' ).run( createdAt );

      db.prepare( `
        INSERT INTO sessions ( user_id, token_hash, created_at, expires_at, last_seen_at )
        VALUES ( ?, ?, ?, ?, ? )
      ` ).run( user.id, this.hashToken( token ), createdAt, expiresAt, createdAt );
    } );

    return { token, expiresAt, user };
  }
}


export const auth = new Auth();
