import { readdir, stat } from 'node:fs/promises';
import { basename, extname, relative, sep } from 'node:path';
import { db } from '../db';
import type { MediaRoot } from './roots';


type MediaType = 'video' | 'audio' | 'image' | 'text';


const extensions: Record< string, { type: MediaType, mime: string } > = {};
