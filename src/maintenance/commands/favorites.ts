import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Favorites } from '@/src/server/core/Favorites';
import { resolveId, validateNumber } from '@/src/server/utils';
import { Command } from 'commander';


const parseNumber = ( value: string, label: string, min = 0 ) : number =>
  validateNumber( value, label, min, Number.MAX_SAFE_INTEGER, true, true );
