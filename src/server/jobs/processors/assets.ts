import { db } from '@/src/server/db';
import { assetStorage } from '@/src/server/media/assets';
import type { MediaAssetSource, MediaAssetType, MediaJob } from '@/src/shared/types';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';


const execFileAsync = promisify( execFile );
const frameRate = Number( process.env.FRAME_SCRUBBER_FPS || 1 );
const maxFrames = Number( process.env.FRAME_SCRUBBER_MAX_FRAMES || 600 );
const minFrames = Number( process.env.FRAME_SCRUBBER_MIN_FRAMES || 24 );
const waveformRate = 8000;
