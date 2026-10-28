import { Loading } from '@/src/client/components/Loading';
import { Pagination } from '@/src/client/components/Pagination';
import { Select } from '@/src/client/components/Select';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatBytes, formatDate, formatNumber } from '@/src/client/utils/format';
import type { DatabaseStats } from '@/src/shared/types/database';
import type { JobKind, JobRecord, JobStats, JobStatus } from '@/src/shared/types/job';
import type { MediaRoot } from '@/src/shared/types/roots';
import { ClockIcon, DatabaseIcon, FolderIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';


const PAGE_SIZE = 25;
const REFRESH_INTERVAL = 10000;

const JOB_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const JOB_KIND_OPTIONS = [
  { value: '', label: 'All job types' },
  { value: 'scan', label: 'Scan' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'tracks', label: 'Tracks' },
  { value: 'preview', label: 'Preview' },
  { value: 'frames', label: 'Frames' },
  { value: 'wave', label: 'Waveform' },
  { value: 'text', label: 'Text' }
];


export function Admin () {
  const { database, jobs, roots } = useApi();

  const [ stats, setStats ] = useState< JobStats | null >( null );
  const [ db, setDb ] = useState< DatabaseStats | null >( null );
  const [ mediaRoots, setMediaRoots ] = useState< MediaRoot[] >( [] );
  const [ jobList, setJobList ] = useState< JobRecord[] >( [] );
  const [ status, setStatus ] = useState( '' );
  const [ kind, setKind ] = useState( '' );
  const [ offset, setOffset ] = useState( 0 );
  const [ loading, setLoading ] = useState( true );
  const [ scanning, setScanning ] = useState( false );
  const [ error, setError ] = useState< string | null >( null );
  const refreshing = useRef( false );

  usePageTitle( 'Server Administration' );


  const refresh = useCallback( async () => {
    if ( refreshing.current ) return;
    refreshing.current = true;

    try {
      const [ stats, db, mediaRoots, jobList ] = await Promise.all( [
        jobs.stats(), database.stats(), roots.list(), jobs.list( {
          limit: PAGE_SIZE, offset, status: status ? status as JobStatus : undefined,
          kind: kind ? kind as JobKind : undefined
        } )
      ] );

      setStats( stats ), setDb( db ), setMediaRoots( mediaRoots );
      setJobList( jobList ), setError( null );
    } catch ( err ) {
      setError( err instanceof Error ? err.message : 'Could not load server information.' );
    } finally {
      setLoading( false );
      refreshing.current = false;
    }
  }, [ database, jobs, roots, offset, status, kind ] );

  const scanAll = async () => {
    setScanning( true );

    try { await roots.scanAll(), await refresh() }
    catch ( err ) { setError( err instanceof Error ? err.message : 'Could not start scan.' ) }
    finally { setScanning( false ) }
  };


  useEffect( () => {
    refresh();
    const timer = window.setInterval( refresh, REFRESH_INTERVAL );
    return () => window.clearInterval( timer );
  }, [ refresh ] );


  return (
    <div className= 'mx-auto my-12 max-w-6xl px-6 space-y-8'>
      <div className= 'flex flex-wrap justify-between items-center gap-4'>
        <h1 className= 'text-2xl font-light tracking-wide'>
          Server Administration
        </h1>

        <button
          onClick= { scanAll }
          disabled= { scanning }
          className= {
            'px-4 py-2 text-sm font-medium text-slate-900 bg-slate-200 rounded ' +
            'hover:bg-white disabled:opacity-50'
          }
        >
          { scanning ? 'Starting scan …' : 'Scan all roots' }
        </button>
      </div>

      { error && (
        <p role= 'alert' className= 'font-semibold text-red-400'>
          { error }
        </p>
      ) }

      <div className= 'p-6 space-y-5 bg-slate-800 rounded shadow-lg'>
        <h2 className= 'flex items-center gap-3 text-lg font-medium'>
          <ClockIcon size= { 18 } />
          <span>Background Jobs</span>
        </h2>

        { ! stats ? <Loading /> : (
          <div className= 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4'>
            { [
              [ 'Total', formatNumber( stats.total ) ],
              [ 'Pending', formatNumber( stats.byStatus.pending ) ],
              [ 'Running', formatNumber( stats.byStatus.running ) ],
              [ 'Failed', formatNumber( stats.byStatus.failed ) ],
              [ 'Scheduled', formatNumber( stats.pendingScheduled ) ]
            ].map( ( [ label, value ] ) => (
              <div key= { label } className= 'p-4 space-y-0.5 text-right bg-slate-900/50 rounded'>
                <div className= 'uppercase text-xs text-slate-400'>{ label }</div>
                <div className= 'text-3xl font-extralight'>{ value }</div>
              </div>
            ) ) }
          </div>
        ) }

        <div className= 'grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded'>
          <Select
            label= 'Status'
            value= { status }
            options= { JOB_STATUS_OPTIONS }
            onChange= { v => { setStatus( v ); setOffset( 0 ) } }
          />

          <Select
            label= 'Job Type'
            value= { kind }
            options= { JOB_KIND_OPTIONS }
            onChange= { v => { setKind( v ); setOffset( 0 ) } }
          />
        </div>

        <Pagination
          offset= { offset }
          limit= { PAGE_SIZE }
          itemCount= { jobList.length }
          hasNext= { jobList.length === PAGE_SIZE }
          onChange= { setOffset }
        />
      </div>

      <div className= 'p-6 space-y-5 bg-slate-800 rounded shadow-lg'>
        <h2 className= 'flex items-center gap-3 text-lg font-medium'>
          <FolderIcon size= { 18 } />
          <span>Media Roots</span>
        </h2>

        <div className= 'divide-y divide-dashed divide-slate-700/70'>
          { mediaRoots.map( root => (
            <div key= { root.id } className= 'flex flex-wrap justify-between items-start gap-3 py-4'>
              <div className= 'min-w-0 space-y-1'>
                <div className= 'break-all'>{ root.path }</div>
                <div className= 'text-xs text-slate-400'>
                  Last scan: { formatDate( root.scannedAt ) }
                </div>
              </div>

              <span className= { root.enabled ? 'text-green-400' : 'text-slate-400' }>
                { root.enabled ? 'Enabled' : 'Disabled' }
              </span>
            </div>
          ) ) }
        </div>

        { ! mediaRoots.length && (
          <p className= 'py-4 text-sm text-slate-400'>
            No media roots configured.
          </p>
        ) }
      </div>

      <div className= 'p-6 space-y-5 bg-slate-800 rounded shadow-lg'>
        <h2 className= 'flex items-center gap-3 text-lg font-medium'>
          <DatabaseIcon size= { 18 } />
          <span>Database</span>
        </h2>

        { ! db ? <Loading /> : (
          <div className= 'divide-y divide-dashed divide-slate-700/70'>
            { [
              [ 'Integrity', db.integrityCheck.toUpperCase() ],
              [ 'SQLite version', db.sqliteVersion ],
              [ 'Database size', formatBytes( db.sizeBytes ) ],
              [ 'Tables', formatNumber( db.tableCount ) ],
              [ 'Rows', formatNumber( db.rowCount ) ],
              [ 'Migrations', formatNumber( db.migrationCount ) ],
              [ 'Free pages', formatNumber( db.freePages ) ]
            ].map( ( [ label, value ] ) => (
              <div key= { label } className= 'flex justify-between items-center gap-6 py-4'>
                <span className= 'font-extralight'>{ label }</span>
                <b className= 'text-right font-medium break-all'>{ value }</b>
              </div>
            ) ) }
          </div>
        ) }
      </div>
    </div>
  );
}
