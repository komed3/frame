import { ui } from '@/src/maintenance/utils/ui';
import type { CheckResult } from '@/src/shared/types/check';
import { accessSync, constants } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { spawnSync } from 'node:child_process';
