import { parseNumber, parseValue } from '@/src/maintenance/utils/parse';
import { ui } from '@/src/maintenance/utils/ui';
import { JobQueue, JOB_KINDS, JOB_STATUSES } from '@/src/server/job/Queue';
import { Media } from '@/src/server/media/Media';
import { MediaRoots } from '@/src/server/media/Roots';
import { resolveId, validateEnum } from '@/src/server/utils';
import type { JobKind, JobStatus } from '@/src/shared/types/job';
import { Command } from 'commander';


export const registerJobCommands = ( program: Command ) : void => {
  const jobCommand = program
    .command( 'job' )
    .description( 'Manage background jobs' );

  jobCommand
    .command( 'list' )
    .description( 'List background jobs' )
    .option( '--status <status>', 'Filter by status' )
    .option( '--kind <kind>', 'Filter by job kind' )
    .option( '--root <id>', 'Filter by media root' )
    .option( '--media <id>', 'Filter by media record' )
    .option( '--limit <number>', 'Maximum number of results', '100' )
    .option( '--offset <number>', 'Skip results', '0' )
    .action( ( options: {
      status?: string, kind?: string, root?: string, media?: string,
      limit: string, offset: string
    } ) => {
      const status = options.status === undefined ? undefined : validateEnum( options.status, 'job status', JOB_STATUSES );
      const kind = options.kind === undefined ? undefined : validateEnum( options.kind, 'job kind', JOB_KINDS );

      const jobs = JobQueue.list( status, parseNumber( options.limit, 'limit', 1 ), parseNumber( options.offset, 'offset' ), {
        kind, rootId: options.root === undefined ? undefined : resolveId( options.root, 'media root' ),
        mediaId: options.media === undefined ? undefined : resolveId( options.media, 'media' )
      } );

      if ( ! jobs.length ) return ui.info( 'No jobs found.' );

      console.table( jobs.map( job => ( {
        id: job.id, kind: job.kind, status: job.status, priority: job.priority,
        rootId: job.rootId, mediaId: job.mediaId,
        attempts: `${ job.attempts }/${ job.maxAttempts }`,
        runAfter: new Date( job.runAfterMs ).toISOString(),
        createdAt: job.createdAt
      } ) ) );
    } );

  jobCommand
    .command( 'get <id>' )
    .description( 'Show job details' )
    .action( ( id: string ) => {
      const job = JobQueue.get( resolveId( id, 'job' ) );
      if ( ! job ) throw new Error( `Job ${ id } does not exist` );

      for ( const [ key, value ] of Object.entries( job ) )
        console.log( `${ ui.key( key ) }: ${ ui.value( parseValue( value ) ) }` );
    } );

  jobCommand
    .command( 'add <kind> <target-id>' )
    .description( 'Enqueue a job for a root or media record' )
    .option( '--priority <number>', 'Override the default priority' )
    .option( '--attempts <number>', 'Maximum number of attempts', '3' )
    .action( ( kindValue: string, target: string, options: { priority?: string, attempts: string } ) => {
      const kind = validateEnum( kindValue, 'job kind', JOB_KINDS ) as JobKind;
      const targetId = resolveId( target, kind === 'scan' ? 'media root' : 'media' );
      const priority = options.priority === undefined ? undefined : parseNumber( options.priority, 'priority' );
      const maxAttempts = parseNumber( options.attempts, 'attempts', 1 );

      if ( kind === 'scan' ) {
        const root = MediaRoots.list().find( root => root.id === targetId );

        if ( ! root ) throw new Error( `Media root ${ targetId } does not exist` );
        if ( ! root.enabled ) throw new Error( `Media root ${ targetId } is disabled` );

        const id = JobQueue.enqueue( { kind, rootId: targetId, priority, maxAttempts } );
        return ui.success( `Scan job ${ id } queued for root ${ targetId }.` );
      }

      const media = Media.get( targetId );
      if ( ! media ) throw new Error( `Media ${ targetId } does not exist` );
      if ( ! media.available ) throw new Error( `Media ${ targetId } is unavailable` );

      const id = JobQueue.enqueue( { kind, mediaId: targetId, priority, maxAttempts } );
      ui.success( `Job ${ id } (${ kind }) queued for media ${ targetId }.` );
    } );
}
