import { db } from '@/src/server/db';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { envInteger } from '@/src/server/utils';
import type { SessionUser } from '@/src/shared/types';


declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

interface SessionRecord {
  session_id: number;
  user_id: number;
  username: string;
  disabled_at: string | null;
}


const cookieName = 'frame_session';
const sessionLifetimeMs = envInteger( 'SESSION_LIFETIME_MS', 30 * 24 * 60 * 60_000, 0, Infinity );
const passwordCost = 16_384;
const passwordBlockSize = 8;
const passwordParallelization = 1;
const passwordKeyLength = 64;
const sessionTouchIntervalMs = 5 * 60 * 1000;


function deriveKey (
  password: string, salt: Buffer, length: number,
  options: { N: number, r: number, p: number, maxmem: number }
) : Promise< Buffer > {
  return new Promise( ( resolve, reject ) => {
    scrypt( password, salt, length, options, ( err, key ) => {
      if ( err ) { reject( err ); return }
      resolve( key as Buffer );
    } );
  } );
}

function hashToken ( token: string ) : string {
  return createHash( 'sha256' ).update( token ).digest( 'hex' );
}


export async function hashPassword ( password: string ) : Promise< string > {
  const salt = randomBytes( 16 );
  const key = await deriveKey( password, salt, passwordKeyLength, {
    N: passwordCost, r: passwordBlockSize, p: passwordParallelization,
    maxmem: 64 * 1024 * 1024
  } );

  return [
    'scrypt', passwordCost, passwordBlockSize, passwordParallelization,
    salt.toString( 'base64url' ), key.toString( 'base64url' )
  ].join( '$' );
}

export async function verifyPassword ( password: string, storedHash: string ) : Promise< boolean > {
  const [ algorithm, n, r, p, saltValue, keyValue, ...extra ] = storedHash.split( '$' );

  if ( algorithm !== 'scrypt' || extra.length > 0 || ! n || ! r || ! p || ! saltValue || ! keyValue )
    return false;

  const N = Number( n ), blockSize = Number( r ), parallelization = Number( p );

  if (
    ! Number.isSafeInteger( N ) || N < 2 || ! Number.isSafeInteger( blockSize ) || blockSize < 1 ||
    ! Number.isSafeInteger( parallelization ) || parallelization < 1
  ) return false;

  try {
    const salt = Buffer.from( saltValue, 'base64url' );
    const expected = Buffer.from( keyValue, 'base64url' );

    if ( salt.length !== 16 || expected.length !== passwordKeyLength ) return false;

    const actual = await deriveKey( password, salt, expected.length, {
      N, r: blockSize, p: parallelization, maxmem: 64 * 1024 * 1024
    } );

    return timingSafeEqual( actual, expected );
  } catch {
    return false;
  }
}

export function readSessionToken ( req: Request ) : string | undefined {
  const cookie = req.headers.cookie;
  if ( ! cookie ) return;

  for ( const part of cookie.split( ';' ) ) {
    const separator = part.indexOf( '=' );

    if ( separator < 0 ) continue;
    if ( part.slice( 0, separator ).trim() === cookieName ) return part.slice( separator + 1 ).trim();
  }
}

export function createSession ( userId: number ) : { token: string, expiresAt: string } {
  const token = randomBytes( 32 ).toString( 'base64url' );
  const expiresAt = new Date( Date.now() + sessionLifetimeMs ).toISOString();
  const now = new Date().toISOString();

  db.prepare( 'DELETE FROM sessions WHERE expires_at <= ?' ).run( now );

  db.prepare( `
    INSERT INTO sessions ( user_id, token_hash, expires_at, last_seen_at )
    VALUES ( ?, ?, ?, ? )
  ` ).run( userId, hashToken( token ), expiresAt, now );

  return { token, expiresAt };
}

export function revokeSession ( token: string ) : void {
  db.prepare( 'DELETE FROM sessions WHERE token_hash = ?' ).run( hashToken( token ) );
}

export function setSessionCookie ( res: Response, token: string ) : void {
  const maxAge = Math.floor( sessionLifetimeMs / 1000 );
  const secure = process.env.FRAME_COOKIE_SECURE === '1' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `${ cookieName }=${ token }; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ maxAge }${ secure }`
  );
}

export function clearSessionCookie ( res: Response ) : void {
  const secure = process.env.FRAME_COOKIE_SECURE === '1' ? '; Secure' : '';

  res.setHeader(
    'Set-Cookie',
    `${ cookieName }=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${ secure }`
  );
}
