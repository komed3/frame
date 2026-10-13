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
