import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import type { MediaRecord } from '@/src/shared/types/media';
import type { NextFunction, Request, Response } from 'express';
import type { ReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import type { Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';