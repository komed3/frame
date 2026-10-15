import { Config } from '@/src/server/core/Config';
import { as, conn, db } from '@/src/server/core/Database';
import type { UserRecord, UserRow } from '@/src/shared/types/user';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';


export class User {
  private getRow ( userId: number ) : UserRow | null {
    return as< UserRow | null >( conn().prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) );
  }

  private toRecord ( row: UserRow ) : UserRecord {
    return {
      id: row.id, username: row.username, isAdmin: row.is_admin === 1,
      createdAt: row.created_at, disabledAt: row.disabled_at
    };
  }

  private hashPassword ( pw: string ) : Promise< string > {
    const salt = randomBytes( 16 );

    return new Promise( ( resolve, reject ) => {
      scrypt( pw, salt, 64, ( err, key ) => {
        if ( err ) return reject( err );
        resolve( `scrypt$${ salt.toString( 'base64url' ) }$${ key.toString( 'base64url' ) }` );
      } );
    } );
  }

  private async verifyHash ( pw: string, hash: string ) : Promise< boolean > {
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

  private assertAdmin ( actorId: number ) : void {
    const actor = this.getRow( actorId );

    if ( ! actor || actor.disabled_at || actor.is_admin !== 1 )
      throw new Error( 'Administrator privileges are required' );
  }

  private assertCanManage ( actorId: number, userId: number ) : UserRow {
    const actor = this.getRow( actorId ), target = this.getRow( userId );
    if ( ! actor || actor.disabled_at ) throw new Error( 'User is not available' );
    if ( ! target ) throw new Error( 'User does not exist' );

    if ( actorId !== userId && actor.is_admin !== 1 )
      throw new Error( 'Administrator privileges are required' );

    return target;
  }

  private assertCanDestructive ( target: UserRow, errMsg: string ) : void {
    if ( target.is_admin === 1 && ! target.disabled_at && as< { count: number } >( conn().prepare(
      'SELECT COUNT(*) AS count FROM users WHERE is_admin = 1 AND disabled_at IS NULL'
    ).get() ).count <= 1 ) throw new Error( errMsg );
  }

  public validateUsername ( username: string ) : string {
    const value = username.trim();
    if ( ! value || value.length > 64 ) throw new Error( 'Username must contain between 1 and 64 characters' );
    if ( ! /^[a-zA-Z0-9_]+$/.test( value ) ) throw new Error( 'Username can only contain letters, numbers and underscores' );
    if ( ! /^[a-zA-Z]/.test( value ) ) throw new Error( 'Username must start with a letter' );

    return value;
  }

  public validatePassword ( pw: string ) : void {
    if ( ! pw ) throw new Error( 'Password must not be empty' );
    if ( ! Config.get( 'PASSWORD_STRICT' ) ) return;

    if ( pw.length < 12 ) throw new Error( 'Password must contain at least 12 characters' );
    if ( ! /[a-z]/.test( pw ) ) throw new Error( 'Password must contain at least one lowercase letter' );
    if ( ! /[A-Z]/.test( pw ) ) throw new Error( 'Password must contain at least one uppercase letter' );
    if ( ! /[0-9]/.test( pw ) ) throw new Error( 'Password must contain at least one number' );
    if ( ! /[^a-zA-Z0-9]/.test( pw ) ) throw new Error( 'Password must contain at least one special character' );
  }

  public list () : UserRecord[] {
    return as< UserRow[] >( conn().prepare(
      'SELECT * FROM users ORDER BY username COLLATE NOCASE'
    ).all() ).map( row => this.toRecord( row ) );
  }

  public get ( userId: number ) : UserRecord | null {
    const row = this.getRow( userId );
    return row ? this.toRecord( row ) : null;
  }

  public getByUsername ( username: string ) : UserRecord | null {
    const row = as< UserRow | null >( conn().prepare(
      'SELECT * FROM users WHERE username = ? COLLATE NOCASE'
    ).get( username.trim() ) );

    return row ? this.toRecord( row ) : null;
  }

  public async create ( username: string, pw: string, isAdmin = false ) : Promise< UserRecord > {
    const name = this.validateUsername( username );
    if ( this.getByUsername( name ) ) throw new Error( 'Username is already taken' );

    this.validatePassword( pw );
    const hash = await this.hashPassword( pw );

    const result = conn().prepare( `
      INSERT INTO users ( username, pw_hash, is_admin )
      VALUES ( ?, ?, ? )
    ` ).run( name, hash, isAdmin ? 1 : 0 );

    const user = this.get( Number( result.lastInsertRowid ) );
    if ( ! user ) throw new Error( 'Failed to create user' );

    return user;
  }

  
  public delete ( userId: number ) : void {
    db.transaction( db => {
      const target = as< UserRow | null >( db.prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) );
      if ( ! target ) throw new Error( 'User does not exist' );

      this.assertCanDestructive( target, 'Cannot delete the last active administrator' );

      db.prepare( 'DELETE FROM sessions WHERE user_id = ?' ).run( userId );
      db.prepare( 'DELETE FROM users WHERE id = ?' ).run( userId );
    } );
  }

  public changeUsername ( actorId: number, userId: number, username: string ) : UserRecord {
    const target = this.assertCanManage( actorId, userId );
    const name = this.validateUsername( username );

    const existing = this.getByUsername( name );
    if ( existing && existing.id !== target.id ) throw new Error( 'Username is already taken' );

    conn().prepare( 'UPDATE users SET username = ? WHERE id = ?' ).run( name, userId );

    const user = this.get( userId );
    if ( ! user ) throw new Error( 'User does not exist' );

    return user;
  }

  public async changePassword ( actorId: number, userId: number, newPw: string, curPw?: string ) : Promise< void > {
    const target = this.assertCanManage( actorId, userId );
    this.validatePassword( newPw );

    if ( actorId === userId && ( ! curPw || ! await this.verifyHash( curPw, target.pw_hash ) ) )
      throw new Error( 'Current password is incorrect' );

    const hash = await this.hashPassword( newPw );

    db.transaction( db => {
      db.prepare( 'UPDATE users SET pw_hash = ? WHERE id = ?' ).run( hash, userId );
      db.prepare( 'DELETE FROM sessions WHERE user_id = ?' ).run( userId );
    } );
  }

  public setAdmin ( actorId: number, userId: number, isAdmin: boolean ) : void {
    this.assertAdmin( actorId );

    db.transaction( db => {
      const target = as< UserRow | null >( db.prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) );
      if ( ! target ) throw new Error( 'User does not exist' );
      if ( ! isAdmin ) this.assertCanDestructive( target, 'Cannot remove privileges from the last active administrator' );

      db.prepare( 'UPDATE users SET is_admin = ? WHERE id = ?' ).run( isAdmin ? 1 : 0, userId );
    } );
  }

  public setDisabled ( actorId: number, userId: number, disabled: boolean ) : void {
    this.assertAdmin( actorId );

    if ( actorId === userId ) throw new Error( 'You cannot disable your own account' );
    if ( ! this.getRow( userId ) ) throw new Error( 'User does not exist' );

    db.transaction( db => {
      db.prepare( 'UPDATE users SET disabled_at = ? WHERE id = ?' ).run(
        disabled ? new Date().toISOString() : null, userId
      );

      if ( disabled ) db.prepare( 'DELETE FROM sessions WHERE user_id = ?' ).run( userId );
    } );
  }

  public async verifyPassword ( userId: number, password: string ) : Promise< boolean > {
    const user = this.getRow( userId );
    return !! user && await this.verifyHash( password, user.pw_hash );
  }
}


export const users = new User();
