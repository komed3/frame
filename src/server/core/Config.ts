import type { ConfigDefinition, ConfigName, ConfigValue } from '@/src/shared/types/config';
import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
