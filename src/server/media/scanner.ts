import { db } from '@/src/server/db';
import type { ExistingMedia, MediaRoot, MediaType, ScanResult, ScannedFile } from '@/src/shared/types';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { opendir, realpath, stat } from 'node:fs/promises';
import { basename, extname, relative, resolve, sep } from 'node:path';


interface ClassifiedFile {
  type: MediaType;
  mime: string;
}

interface ScanCounters {
  discovered: number;
  ignored: number;
  errors: number;
}
