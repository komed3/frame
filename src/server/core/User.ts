import { conn } from '@/src/server/core/Database';
import type { UserRecord, UserRow } from '@/src/shared/types/user';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';


export class User {
  private getRow ( userId: number ) : UserRow | null {
    return conn.prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) as unknown as UserRow | null;
  }

  private toRecord ( row: UserRow ) : UserRecord {
    return {
      id: row.id, username: row.username, isAdmin: row.is_admin === 1,
      createdAt: row.created_at, disabledAt: row.disabled_at
    };
  }

  private validateUsername ( username: string ) : string {
    const value = username.trim();
    if ( ! value || value.length > 64 ) throw new Error( 'Username must contain between 1 and 64 characters' );
    if ( ! /^[a-zA-Z0-9_]+$/.test( value ) ) throw new Error( 'Username can only contain letters, numbers and underscores' );
    if ( !/^[a-zA-Z]/.test( value ) ) throw new Error( 'Username must start with a letter' );

    return value;
  }

  private validatePassword ( password: string ) : void {
    if ( password.length < 12 ) throw new Error( 'Password must contain at least 12 characters' );
    if ( ! /[a-z]/.test( password ) ) throw new Error( 'Password must contain at least one lowercase letter' );
    if ( ! /[A-Z]/.test( password ) ) throw new Error( 'Password must contain at least one uppercase letter' );
    if ( ! /[0-9]/.test( password ) ) throw new Error( 'Password must contain at least one number' );
    if ( ! /[^a-zA-Z0-9]/.test( password ) ) throw new Error( 'Password must contain at least one special character' );
  }

  private hashPassword ( password: string ) : Promise< string > {
    const salt = randomBytes( 16 );

    return new Promise( ( resolve, reject ) => {
      scrypt( password, salt, 64, ( err, key ) => {
        if ( err ) return reject( err );
        resolve( `scrypt$${ salt.toString( 'base64url' ) }$${ key.toString( 'base64url' ) }` );
      } );
    } );
  }

  private async verifyHash ( password: string, hash: string ) : Promise< boolean > {
    const [ algorithm, saltValue, keyValue ] = hash.split( '$' );
    if ( algorithm !== 'scrypt' || ! saltValue || ! keyValue ) return false;

    const salt = Buffer.from( saltValue, 'base64url' );
    const expected = Buffer.from( keyValue, 'base64url' );
    if ( salt.length !== 16 || expected.length !== 64 ) return false;

    const actual = await new Promise< Buffer >( ( resolve, reject ) => {
      scrypt( password, salt, expected.length, ( err, key ) => {
        if ( err ) return reject( err );
        resolve( key );
      } );
    } );

    return timingSafeEqual( actual, expected );
  }

  private assertAdmin ( actorId: number ) : void {
    const actor = this.getRow( actorId );

    if ( ! actor || actor.disabled_at || actor.is_admin !== 1 )
      throw new Error( 'Administrator privileges are required' );
  }
}
