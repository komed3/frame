import { Loading } from '@/src/client/components/Loading';
import { MediaIcon } from '@/src/client/components/MediaIcon';
import { MEDIA_PAGE_SIZE, Pagination } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDuration } from '@/src/client/utils/format';
import type { MarkerRecord } from '@/src/shared/types/markers';
import type { MediaRecord } from '@/src/shared/types/media';
import { FlagIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';


interface MarkerPageData {
  markers: MarkerRecord[];
  media: Record< string, MediaRecord | null >;
}


export function Markers () {
  const { markers, media } = useApi();

  const [ refresh, setRefresh ] = useState( 0 );
  const [ offset, setOffset ] = useState( 0 );
  const [ actionError, setActionError ] = useState< string | null >( null );
  const [ deleting, setDeleting ] = useState< string | null >( null );


  const { data, loading, error } = useApiData< MarkerPageData >( `${ offset }:${ refresh }`, async () => {
    const items = await markers.list( { limit: MEDIA_PAGE_SIZE, offset } );
    return { markers: items, media: Object.fromEntries( await Promise.all(
      [ ...new Set( items.map( m => m.mediaId ) ) ].map( async id => [ id, await media.get( id ) ] )
    ) ) };
  } );


  usePageTitle( 'Markers' );


  const remove = async ( id: string ) => {
    setDeleting( id ), setActionError( null );

    try { await markers.delete( id ); setRefresh( v => v + 1 ) }
    catch ( err ) { setActionError( err instanceof Error ? err.message : 'Could not delete marker.' ) }
    finally { setDeleting( null ) }
  };


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-6'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Markers
      </h1>

      { actionError && (
        <p role= 'alert' className= 'text-sm text-red-400'>
          { actionError }
        </p>
      ) }

      { loading ? (
        <Loading className= 'min-h-64' />
      ) : error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : ! data?.markers.length ? (
        <p className= 'py-16 text-center text-slate-400'>
          No markers found.
        </p>
      ) : (
        <>
          <div className= 'overflow-x-auto bg-slate-900/40 rounded shadow-lg'>
            <table className= 'w-full text-sm text-left'>
              <thead className= 'text-xs text-slate-400 uppercase tracking-wider bg-slate-700/40'>
                <tr className= '*:px-5 *:py-4 *:font-medium'>
                  <th>Marker</th>
                  <th>Media</th>
                  <th className= 'text-right'>Position</th>
                  <th className= 'w-px' />
                </tr>
              </thead>

              <tbody className= 'divide-y divide-slate-700/70'>
                { data.markers.map( ( { id, title, mediaId, positionMs } ) => {
                  const item = data.media[ mediaId ];

                  return (
                    <tr key= { id } className= '*:px-5 *:py-4'>
                      <td className= 'min-w-56 p-0!'>
                        { item ? (
                          <Link
                            to= { `/watch/${ item.id }#pos:${ positionMs }` }
                            className= 'group flex items-center gap-2 px-5 py-4 font-medium'
                          >
                            <FlagIcon size= { 16 } />

                            <span className= 'transition-colors group-hover:text-sky-400'>
                              { title || 'Untitled marker' }
                            </span>
                          </Link>
                        ) : (
                          <span className= 'px-5 py-4 text-slate-500'>
                            { title || 'Untitled marker' }
                          </span>
                        ) }
                      </td>

                      <td className= 'min-w-64'>
                        { item ? (
                          <div className= 'flex items-center gap-2'>
                            <MediaIcon type= { item.type } size= { 16 } />
                            <span>{ item.title || item.fileName }</span>
                          </div>
                        ) : (
                          <span className= 'text-slate-500'>
                            Unavailable media
                          </span>
                        ) }
                      </td>

                      <td className= 'text-right whitespace-nowrap tabular-nums'>
                        { formatDuration( positionMs ) }
                      </td>

                      <td className= 'w-px px-3! py-2!'>
                        <button
                          onClick= { () => remove( id ) }
                          disabled= { deleting !== null }
                          aria-label= 'Delete marker'
                          title= 'Delete marker'
                          className= {
                            'p-2 text-slate-400 rounded transition-colors hover:bg-slate-50/10 ' +
                            'hover:text-red-400 disabled:opacity-40'
                          }
                        >
                          <Trash2Icon size= { 16 } />
                        </button>
                      </td>
                    </tr>
                  );
                } ) }
              </tbody>
            </table>
          </div>

          <Pagination
            offset= { offset }
            limit= { MEDIA_PAGE_SIZE }
            itemCount= { data.markers.length }
            onChange= { v => { setOffset( v ), window.scrollTo( 0, 0 ) } }
          />
        </>
      ) }
    </div>
  );
}
