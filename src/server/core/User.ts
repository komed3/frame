import { Config } from '@/src/server/core/Config';
import { as, conn, db } from '@/src/server/core/Database';
import type { UserRecord, UserRow } from '@/src/shared/types/user';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';


export class User {
  private static getRow ( userId: number ) : UserRow | null {
    return as< UserRow | null >( conn().prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) );
  }

  private static toRecord ( row: UserRow ) : UserRecord {
    return {
      id: row.id, username: row.username, isAdmin: row.is_admin === 1,
      createdAt: row.created_at, disabledAt: row.disabled_at
    };
  }

  private static hashPassword ( pw: string ) : Promise< string > {
    const salt = randomBytes( 16 );

    return new Promise( ( resolve, reject ) => {
      scrypt( pw, salt, 64, ( err, key ) => {
        if ( err ) return reject( err );
        resolve( `scrypt$${ salt.toString( 'base64url' ) }$${ key.toString( 'base64url' ) }` );
      } );
    } );
  }

  private static async verifyHash ( pw: string, hash: string ) : Promise< boolean > {
    const [ algorithm, saltValue, keyValue ] = hash.split( '$' );
    if ( algorithm !== 'scrypt' || ! saltValue || ! keyValue ) return false;

    const salt = Buffer.from( saltValue, 'base64url' );
    const expected = Buffer.from( keyValue, 'base64url' );
    if ( salt.length !== 16 || expected.length !== 64 ) return false;

    const actual = await new Promise< Buffer >( ( resolve, reject ) => {
      scrypt( pw, salt, expected.length, ( err, key ) => {
        if ( err ) return reject( err );
        resolve( key );
      } );
    } );

    return timingSafeEqual( actual, expected );
  }

  private static assertAdmin ( actorId: number ) : void {
    const actor = User.getRow( actorId );

    if ( ! actor || actor.disabled_at || actor.is_admin !== 1 )
      throw new Error( 'Administrator privileges are required' );
  }

  private static assertCanManage ( actorId: number, userId: number ) : UserRow {
    const actor = User.getRow( actorId ), target = User.getRow( userId );
    if ( ! actor || actor.disabled_at ) throw new Error( 'User is not available' );
    if ( ! target ) throw new Error( 'User does not exist' );

    if ( actorId !== userId && actor.is_admin !== 1 )
      throw new Error( 'Administrator privileges are required' );

    return target;
  }

  private static assertCanDestructive ( target: UserRow, errMsg: string ) : void {
    if ( target.is_admin === 1 && ! target.disabled_at && as< { count: number } >( conn().prepare(
      'SELECT COUNT(*) AS count FROM users WHERE is_admin = 1 AND disabled_at IS NULL'
    ).get() ).count <= 1 ) throw new Error( errMsg );
  }

  public static validateUsername ( username: string ) : string {
    const value = username.trim();
    if ( ! value || value.length > 64 ) throw new Error( 'Username must contain between 1 and 64 characters' );
    if ( ! /^[a-zA-Z0-9_]+$/.test( value ) ) throw new Error( 'Username can only contain letters, numbers and underscores' );
    if ( ! /^[a-zA-Z]/.test( value ) ) throw new Error( 'Username must start with a letter' );

    return value;
  }

  public static validatePassword ( pw: string ) : void {
    if ( ! pw ) throw new Error( 'Password must not be empty' );
    if ( ! Config.get( 'PASSWORD_STRICT' ) ) return;

    if ( pw.length < 12 ) throw new Error( 'Password must contain at least 12 characters' );
    if ( ! /[a-z]/.test( pw ) ) throw new Error( 'Password must contain at least one lowercase letter' );
    if ( ! /[A-Z]/.test( pw ) ) throw new Error( 'Password must contain at least one uppercase letter' );
    if ( ! /[0-9]/.test( pw ) ) throw new Error( 'Password must contain at least one number' );
    if ( ! /[^a-zA-Z0-9]/.test( pw ) ) throw new Error( 'Password must contain at least one special character' );
  }

  public static list () : UserRecord[] {
    return as< UserRow[] >( conn().prepare(
      'SELECT * FROM users ORDER BY username COLLATE NOCASE'
    ).all() ).map( row => User.toRecord( row ) );
  }

  public static get ( userId: number ) : UserRecord | null {
    const row = User.getRow( userId );
    return row ? User.toRecord( row ) : null;
  }

  public static getByUsername ( username: string ) : UserRecord | null {
    const row = as< UserRow | null >( conn().prepare(
      'SELECT * FROM users WHERE username = ? COLLATE NOCASE'
    ).get( username.trim() ) );

    return row ? User.toRecord( row ) : null;
  }

  public static async create ( username: string, pw: string, isAdmin = false ) : Promise< UserRecord > {
    const name = User.validateUsername( username );
    if ( User.getByUsername( name ) ) throw new Error( 'Username is already taken' );

    User.validatePassword( pw );
    const hash = await User.hashPassword( pw );

    const result = conn().prepare( `
      INSERT INTO users ( username, pw_hash, is_admin )
      VALUES ( ?, ?, ? )
    ` ).run( name, hash, +!! isAdmin );

    const user = User.get( Number( result.lastInsertRowid ) );
    if ( ! user ) throw new Error( 'Failed to create user' );

    return user;
  }

  
  public static delete ( userId: number ) : void {
    db.transaction( tx => {
      const target = as< UserRow | null >( tx.prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) );
      if ( ! target ) throw new Error( 'User does not exist' );

      User.assertCanDestructive( target, 'Cannot delete the last active administrator' );

      tx.prepare( 'DELETE FROM sessions WHERE user_id = ?' ).run( userId );
      tx.prepare( 'DELETE FROM users WHERE id = ?' ).run( userId );
    } );
  }

  public static changeUsername ( actorId: number, userId: number, username: string ) : UserRecord {
    const target = User.assertCanManage( actorId, userId );
    const name = User.validateUsername( username );

    const existing = User.getByUsername( name );
    if ( existing && existing.id !== target.id ) throw new Error( 'Username is already taken' );

    conn().prepare( 'UPDATE users SET username = ? WHERE id = ?' ).run( name, userId );

    const user = User.get( userId );
    if ( ! user ) throw new Error( 'User does not exist' );

    return user;
  }

  public static async changePassword ( actorId: number, userId: number, newPw: string, curPw?: string ) : Promise< void > {
    const target = User.assertCanManage( actorId, userId );
    User.validatePassword( newPw );

    if ( actorId === userId && ( ! curPw || ! await User.verifyHash( curPw, target.pw_hash ) ) )
      throw new Error( 'Current password is incorrect' );

    const hash = await User.hashPassword( newPw );

    db.transaction( tx => {
      tx.prepare( 'UPDATE users SET pw_hash = ? WHERE id = ?' ).run( hash, userId );
      tx.prepare( 'DELETE FROM sessions WHERE user_id = ?' ).run( userId );
    } );
  }

  public static setAdmin ( actorId: number, userId: number, isAdmin: boolean ) : void {
    User.assertAdmin( actorId );

    db.transaction( tx => {
      const target = as< UserRow | null >( tx.prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) );
      if ( ! target ) throw new Error( 'User does not exist' );
      if ( ! isAdmin ) User.assertCanDestructive( target, 'Cannot remove privileges from the last active administrator' );

      tx.prepare( 'UPDATE users SET is_admin = ? WHERE id = ?' ).run( +!! isAdmin, userId );
    } );
  }

  public static setDisabled ( actorId: number, userId: number, disabled: boolean ) : void {
    User.assertAdmin( actorId );

    if ( actorId === userId ) throw new Error( 'You cannot disable your own account' );
    if ( ! User.getRow( userId ) ) throw new Error( 'User does not exist' );

    db.transaction( tx => {
      tx.prepare( 'UPDATE users SET disabled_at = ? WHERE id = ?' ).run(
        disabled ? new Date().toISOString() : null, userId
      );

      if ( disabled ) tx.prepare( 'DELETE FROM sessions WHERE user_id = ?' ).run( userId );
    } );
  }

  public static async verifyPassword ( userId: number, password: string ) : Promise< boolean > {
    const user = User.getRow( userId );
    return !! user && await User.verifyHash( password, user.pw_hash );
  }
}
