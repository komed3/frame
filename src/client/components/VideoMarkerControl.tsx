import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import { FlagIcon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { formatDuration } from '@/src/client/utils/format';


interface VideoMarkerControlProps {
  markers: MarkerRecord[];
  currentTime: number;
  onSeek: ( time: number ) => void;
  onCreate: ( positionMs: number, title: string, description: string ) => Promise< void >;
  onUpdate: ( id: string, data: MarkerUpdate ) => Promise< void >;
  onDelete: ( id: string ) => Promise< void >;
}
