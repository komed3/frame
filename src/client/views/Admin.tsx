import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { DatabaseStats } from '@/src/shared/types/database';
import type { JobRecord, JobStats } from '@/src/shared/types/job';
import type { MediaRoot } from '@/src/shared/types/roots';
import { useRef, useState } from 'react';


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


  return (
    <div className= 'mx-auto my-12 max-w-6xl px-6 space-y-8'>
      <div className= 'flex flex-wrap justify-between items-center gap-4'>
        <h1 className= 'text-2xl font-light tracking-wide'>
          Server Administration
        </h1>
      </div>
    </div>
  );
}
