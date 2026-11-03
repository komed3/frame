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


const BUTTON =
  'flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ' +
  'hover:bg-slate-50/10 disabled:opacity-50 disabled:pointer-events-none';

const INPUT =
  'w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded ' +
  'outline-none focus:border-slate-500';


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

  const select = ( marker: MarkerRecord ) => {
    setSelected( marker.id );
    setPosition( String( marker.positionMs / 1000 ) );
    setTitle( marker.title ?? '' );
    setDescription( marker.description ?? '' );
    setError( null );
  };

  const save = async ( e: SubmitEvent< HTMLFormElement > ) => {
    e.preventDefault();

    const posMs = Math.round( Number( position ) * 1000 );
    if ( ! Number.isFinite( posMs ) || posMs < 0 ) { setError( 'Invalid marker position.' ); return }

    setSaving( true ), setError( null );

    try {
      if ( selected ) await onUpdate( selected, { positionMs: posMs, title, description } );
      else await onCreate( posMs, title, description );

      reset();
    }

    catch ( err ) { setError( err instanceof Error ? err.message : 'Could not save marker.' ) }
    finally { setSaving( false ) }
  };


  return (
    <div className= 'relative'>
      <button
        onClick= { () => open ? setOpen( false ) : create() }
        aria-expanded= { open }
        title= 'Markers'
        aria-label= 'Markers'
        className= {
          'flex justify-center items-center size-10 bg-slate-50/10 rounded-full ' +
          'transition-colors hover:bg-slate-50/20'
        }
      >
        <FlagIcon size= { 20 } />
      </button>

      { open && (
        <div
          className= {
            'absolute right-0 bottom-full z-30 mb-2 w-80 max-h-[70vh] p-4 bg-slate-700 ' +
            'rounded shadow-lg overflow-y-auto'
          }
        >
          <div className= 'flex justify-between items-center mb-3'>
            <h2 className= 'font-medium'>Markers</h2>
          </div>
        </div>
      ) }
    </div>
  );
}
