import { Loading } from '@/src/client/components/Loading';
import { MediaIcon } from '@/src/client/components/MediaIcon';
import { Pagination } from '@/src/client/components/Pagination';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDateTime, formatDuration } from '@/src/client/utils/format';
import { HistoryRecord } from '@/src/shared/types/plays';
import { CheckIcon, HourglassIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';


const PAGE_SIZE = 50;


export function History () {
  const { plays, user } = useApi();
  const navigate = useNavigate();

  const [ offset, setOffset ] = useState( 0 );
  const key = JSON.stringify( [ user?.id ?? null, offset ] );

  const { data, loading, error } = useApiData< HistoryRecord[] >( key, () => {
    if ( ! user ) return Promise.reject( new Error( 'User not found.' ) );
    return plays.list( { limit: PAGE_SIZE, offset } );
  } );


  usePageTitle( 'History' );


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-6'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        History
      </h1>

      { error ? (
        <p role= 'alert' className= 'py-16 text-center text-red-400'>
          { error }
        </p>
      ) : loading ? (
        <Loading className= 'min-h-64' />
      ) : ! data?.length ? (
        <p className= 'py-16 text-center text-slate-400'>
          No playback history found.
        </p>
      ) : (
        <>
          <div className= 'overflow-x-auto bg-slate-900/40 rounded shadow-lg'>
            <table className= 'w-full text-sm text-left'>
              <thead className= 'text-xs text-slate-400 uppercase tracking-wider bg-slate-700/40'>
                <tr className= '*:px-5 *:py-4 *:font-medium'>
                  <th>Date</th>
                  <th>Media</th>
                  <th className= 'text-right'>Watched</th>
                  <th className= 'text-right'>Status</th>
                </tr>
              </thead>

              <tbody className= 'divide-y divide-slate-700/70'>
                { data.map( ( { id, startedAt, media, watchedMs, completed } ) => (
                  <tr
                    key= { id }
                    onClick= { () => media && navigate( `/watch/${ media.id }` ) }
                    className= {
                      '*:px-5 *:py-4 ' +
                      ( media ? 'group cursor-pointer transition-colors hover:bg-slate-50/5' : '' )
                    }
                  >
                    <td className= 'whitespace-nowrap text-slate-400'>
                      { formatDateTime( startedAt ) }
                    </td>

                    <td className= 'min-w-64'>
                      { media ? (
                        <div className= 'group flex items-center gap-2'>
                          <MediaIcon type= { media.type } size= { 16 } />

                          <span className='font-medium transition-colors group-hover:text-sky-400'>
                            { media.title || media.fileName }
                          </span>
                        </div>
                      ) : (
                        <span className= 'text-slate-500'>
                          Unavailable media
                        </span>
                      ) }
                    </td>

                    <td className= 'text-right tabular-nums text-slate-300'>
                      { watchedMs ? formatDuration( watchedMs ) : '—' }
                    </td>

                    <td className= 'text-right *:inline'>
                      { completed ? <CheckIcon size= { 15 } /> : <HourglassIcon size= { 15 } /> }
                    </td>
                  </tr>
                ) ) }
              </tbody>
            </table>
          </div>

          <Pagination
            offset= { offset }
            limit= { PAGE_SIZE }
            itemCount= { data.length }
            onChange= { v => { setOffset( v ), window.scrollTo( 0, 0 ) } }
          />
        </>
      ) }
    </div>
  );
}
