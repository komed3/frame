import { useEffect, useRef } from 'react';
import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react';


interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onVolumeChange: ( value: number ) => void;
  onVolumeCommit: () => void;
  onToggleMute: () => void;
  sliderClassName?: string;
}
