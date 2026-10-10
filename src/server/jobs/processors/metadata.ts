import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { relative, resolve, sep, isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import { db } from '../../db';
import type { MediaJob } from '../queue';


const execFileAsync = promisify( execFile );
const textSampleSize = 4096;
