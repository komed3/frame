import { db } from '@/src/server/db';
import {
  clearSessionCookie, createSession, hashPassword, readSessionToken,
  requireSession, revokeSession, setSessionCookie, verifyPassword
} from '@/src/server/auth';
import { jobQueue, enqueueJob } from '@/src/server/jobs/queue';
import { assetStorage } from '@/src/server/media/assets';
import { mediaRoots } from '@/src/server/media/roots';
import type {
  FramesManifest, MediaAssetType, MediaJobStatus, MediaJobType, MediaType
} from '@/src/shared/types';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';


const api = Router();

const mediaTypes: MediaType[] = [ 'video', 'audio', 'image', 'text' ];
const assetTypes: MediaAssetType[] = [ 'poster', 'thumb', 'frames', 'wave', 'text' ];
const jobTypes: MediaJobType[] = [ 'scan', 'metadata', ...assetTypes ];
const jobStatuses: MediaJobStatus[] = [ 'pending', 'running', 'completed', 'failed' ];


class ApiError extends Error {
  public constructor ( public readonly status: number, message: string ) {
    super( message );
  }
}
