import { Database } from '@/src/server/core/Database';
import type { UserRecord, UserRow } from '@/src/shared/types/user';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
