import { prompt, promptPassword } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Config } from '@/src/server/core/Config';
import type { ConfigName, ConfigValue } from '@/src/shared/types/config';
import { users } from '@/src/server/core/User';
import { Command } from 'commander';
