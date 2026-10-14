import { Config } from '@/src/server/core/Config';
import { as, conn, db } from '@/src/server/core/Database';
import { type User, users } from '@/src/server/core/User';
import type { AuthResult, SessionRow } from '@/src/shared/types/user';
import { createHash, randomBytes } from 'node:crypto';


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

  public logout ( token: string | null | undefined ) : void {
    if ( ! token ) return;
    conn().prepare( 'DELETE FROM sessions WHERE token_hash = ?' ).run( this.hashToken( token ) );
  }

  public validateSession ( token: string | null | undefined ) : ReturnType< User[ 'get' ] > {
    if ( ! token ) return null;

    const now = new Date();
    const session = as< SessionRow | null >( conn().prepare(
      'SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?'
    ).get( this.hashToken( token ), now.toISOString() ) );

    if ( ! session ) return null;

    const user = users.get( session.user_id );

    if ( ! user || user.disabledAt ) {
      conn().prepare( 'DELETE FROM sessions WHERE id = ?' ).run( session.id );
      return null;
    }

    if ( now.getTime() - Date.parse( session.last_seen_at ) >= 5 * 60 * 1000 ) conn().prepare(
      'UPDATE sessions SET last_seen_at = ? WHERE id = ?'
    ).run( now.toISOString(), session.id );

    return user;
  }
}


export const auth = new Auth();
