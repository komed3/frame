import { formatDuration } from '@/src/client/utils/format';
import type { MarkerRecord, MarkerUpdate } from '@/src/shared/types/markers';
import { FlagIcon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';


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

  const remove = async ( id: string ) => {
    if ( saving ) return;

    setSaving( true ), setError( null );

    try {
      await onDelete( id );
      if ( selected === id ) reset();
    }

    catch ( err ) { setError( err instanceof Error ? err.message : 'Could not delete marker.' ) }
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

            <button
              onClick= { () => setOpen( false ) }
              aria-label= 'Close markers'
            >
              <XIcon size= { 18 } />
            </button>
          </div>

          <button
            onClick= { create }
            className= { BUTTON + ' w-full mb-3' }
          >
            <PlusIcon size= { 16 } />
            <span>New marker at current position</span>
          </button>

          { markers.length > 0 && (
            <div className= 'mb-4 space-y-1'>
              { markers.map( marker => (
                <div
                  key= { marker.id }
                  className= {
                    'flex items-center gap-2 rounded ' +
                    ( selected === marker.id ? 'bg-slate-50/10' : 'hover:bg-slate-50/5' )
                  }
                >
                  <button
                    onClick= { () => { select( marker ), onSeek( marker.positionMs / 1000 ) } }
                    className= 'flex-1 min-w-0 flex items-center gap-3 px-3 py-2 text-left'
                  >
                    <span className= 'shrink-0 text-xs text-slate-400 tabular-nums'>
                      { formatDuration( marker.positionMs ) }
                    </span>
                    <span className= 'truncate text-sm'>
                      { marker.title || 'Untitled marker' }
                    </span>
                  </button>

                  <button
                    onClick= { () => remove( marker.id ) }
                    disabled= { saving }
                    aria-label= 'Delete marker'
                    title= 'Delete marker'
                    className= {
                      'p-2 text-slate-400 transition-colors ' +
                      'hover:text-red-400 disabled:opacity-50'
                    }
                  >
                    <Trash2Icon size= { 16 } />
                  </button>
                </div>
              ) ) }
            </div>
          ) }

          <form onSubmit= { save } className= 'space-y-3 border-t border-slate-600 pt-3'>
            <h3 className= 'text-sm font-medium'>
              { selected ? 'Edit marker' : 'New marker' }
            </h3>

            <div className= 'space-y-1'>
              <label className= 'block text-xs text-slate-400'>
                Position (seconds)
              </label>

              <input
                type= 'number'
                min= { 0 } step= { 0.001 } value= { position }
                onChange= { e => setPosition( e.target.value ) }
                required
                className= { INPUT }
              />
            </div>

            <div className= 'space-y-1'>
              <label className= 'block text-xs text-slate-400'>
                Title
              </label>

              <input
                value= { title }
                onChange= { e => setTitle( e.target.value ) }
                maxLength= { 200 }
                className= { INPUT }
              />
            </div>

            <div className= 'space-y-1'>
              <label className= 'block text-xs text-slate-400'>
                Description
              </label>

              <textarea
                value= { description }
                onChange= { e => setDescription( e.target.value ) }
                rows= { 3 }
                className= { INPUT + ' resize-y' }
              />
            </div>

            { error && (
              <p role= 'alert' className= 'text-sm text-red-400'>
                { error }
              </p>
            ) }

            <div className= 'flex justify-between items-center'>
              { selected ? (
                <button
                  onClick= { reset }
                  className= { BUTTON }
                >
                  Cancel
                </button>
              ) : <span /> }

              <button
                type= 'submit'
                disabled= { saving }
                className= { BUTTON + ' bg-slate-50/10' }
              >
                <SaveIcon size= { 16 } />
                <span>{ saving ? 'Saving …' : 'Save marker' }</span>
              </button>
            </div>
          </form>
        </div>
      ) }
    </div>
  );
}
