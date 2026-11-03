import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import { FlagIcon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { formatDuration } from '@/src/client/utils/format';
