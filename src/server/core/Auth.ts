import { Config } from '@/src/server/core/Config';
import { as, conn, db } from '@/src/server/core/Database';
import { User } from '@/src/server/core/User';
import type { ActiveSession, ActiveSessionRow, AuthResult, SessionRow } from '@/src/shared/types/auth';
import type { UserRecord } from '@/src/shared/types/user';
import { createHash, randomBytes } from 'node:crypto';


export class Auth {
  private static hashToken ( token: string ) : string {
    return createHash( 'sha256' ).update( token ).digest( 'hex' );
  }

  public static async login ( username: string, pw: string ) : Promise< AuthResult > {
    const user = User.getByUsername( username );
    if ( ! user || user.disabledAt || ! await User.verifyPassword( user.id, pw ) )
      throw new Error( 'Invalid username or password' );

    const token = randomBytes( 32 ).toString( 'base64url' );
    const now = new Date(), createdAt = now.toISOString();
    const expiresAt = new Date( now.getTime() + Config.get( 'SESSION_LIFETIME_MS' ) ).toISOString();

    db.transaction( db => {
      db.prepare( 'DELETE FROM sessions WHERE expires_at <= ?' ).run( createdAt );

      db.prepare( `
        INSERT INTO sessions ( user_id, token_hash, created_at, expires_at, last_seen_at )
        VALUES ( ?, ?, ?, ?, ? )
      ` ).run( user.id, Auth.hashToken( token ), createdAt, expiresAt, createdAt );
    } );

    return { token, expiresAt, user };
  }

  public static logout ( token: string | null | undefined ) : void {
    if ( ! token ) return;
    conn().prepare( 'DELETE FROM sessions WHERE token_hash = ?' ).run( Auth.hashToken( token ) );
  }

  public static validateSession ( token: string | null | undefined ) : UserRecord | null {
    if ( ! token ) return null;

    const now = new Date();
    const session = as< SessionRow | null >( conn().prepare(
      'SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?'
    ).get( Auth.hashToken( token ), now.toISOString() ) );

    if ( ! session ) return null;

    const user = User.get( session.user_id );

    if ( ! user || user.disabledAt ) {
      conn().prepare( 'DELETE FROM sessions WHERE id = ?' ).run( session.id );
      return null;
    }

    if ( now.getTime() - Date.parse( session.last_seen_at ) >= 5 * 60 * 1000 ) conn().prepare(
      'UPDATE sessions SET last_seen_at = ? WHERE id = ?'
    ).run( now.toISOString(), session.id );

    return user;
  }

  public static listSessions () : ActiveSession[] {
    const rows = as< ActiveSessionRow[] >( conn().prepare( `
      SELECT
        s.id,
        s.user_id AS userId,
        u.username,
        u.is_admin AS isAdmin,
        s.created_at AS createdAt,
        s.expires_at AS expiresAt,
        s.last_seen_at AS lastSeenAt
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > ?
        AND u.disabled_at IS NULL
      ORDER BY s.last_seen_at DESC, s.created_at DESC
    ` ).all( new Date().toISOString() ) );

    return rows.map( row => ( { ...row, isAdmin: row.isAdmin === 1 } ) );
  }

  public static logoutAll () : number {
    return Number( conn().prepare( 'DELETE FROM sessions' ).run().changes );
  }
}
