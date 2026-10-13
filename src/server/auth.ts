import { db } from '@/src/server/db';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { envInteger } from '@/src/server/utils';


const cookieName = 'frame_session';
const sessionLifetimeMs = envInteger( 'SESSION_LIFETIME_MS', 30 * 24 * 60 * 60_000, 0, Infinity );
const passwordCost = 16_384;
const passwordBlockSize = 8;
const passwordParallelization = 1;
const passwordKeyLength = 64;
const sessionTouchIntervalMs = 5 * 60 * 1000;
