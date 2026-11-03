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


export function VideoMarkerControl ( { markers, currentTime, onSeek, onCreate, onUpdate, onDelete }: VideoMarkerControlProps ) {
  const [ open, setOpen ] = useState( false );
  const [ selected, setSelected ] = useState< string | null >( null );
  const [ position, setPosition ] = useState( '0' );
  const [ title, setTitle ] = useState( '' );
  const [ description, setDescription ] = useState( '' );
  const [ saving, setSaving ] = useState( false );
  const [ error, setError ] = useState< string | null >( null );


  const reset = () => {
    setSelected( null ), setPosition( String( currentTime ) );
    setTitle( '' ), setDescription( '' ), setError( null );
  };

  const create = () => { reset(), setOpen( true ) };
}
