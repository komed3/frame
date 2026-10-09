import { readdir, stat } from 'node:fs/promises';
import { basename, extname, relative, sep } from 'node:path';
import { db } from '../db';
import type { MediaRoot } from './roots';
