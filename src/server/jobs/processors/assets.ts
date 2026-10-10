import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { db } from '../../db';
import type { MediaJob } from '../queue';
