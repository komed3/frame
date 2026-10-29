import { as, conn, db } from '@/src/server/core/Database';
import { assertId, validateNumber } from '@/src/server/utils';
import type {
  EnqueueJob, JobKind, JobListFilters, JobRecord,
  JobRow, JobStats, JobStatus
} from '@/src/shared/types/job';


export const JOB_PRIORITIES: Record< JobKind, number > = {
  scan: 10, metadata: 8, tracks: 7, text: 5, preview: 5, wave: 3, frames: 1
};

export const JOB_KINDS = Object.keys( JOB_PRIORITIES ) as JobKind[];
export const JOB_STATUSES: JobStatus[] = [ 'pending', 'running', 'done', 'failed', 'cancelled' ];


const SELECT_JOB = `
  SELECT
    id, root_id AS rootId, media_id AS mediaId, kind, status, priority,
    attempts, max_attempts AS maxAttempts, run_after_ms AS runAfterMs,
    locked_at_ms AS lockedAtMs, worker, error, payload_json AS payloadJson,
    created_at AS createdAt, updated_at AS updatedAt, finished_at AS finishedAt
  FROM jobs
`;


export class JobQueue {
  private static isUniqueConstraint ( err: unknown ) : boolean {
    return typeof err === 'object' && err !== null && 'errcode' in err && err.errcode === 2067;
  }

  private static mapRow ( row: JobRow ) : JobRecord {
    const payload = JSON.parse( row.payloadJson ) as unknown;
    if ( ! payload || typeof payload !== 'object' || Array.isArray( payload ) )
      throw new Error( `Invalid payload for job ${ row.id }` );

    const { payloadJson: _, ...job } = row;
    return { ...job, payload: payload as Record< string, unknown > };
  }

  public static list ( status?: JobStatus, limit = 100, offset = 0, filters: JobListFilters = {} ) : JobRecord[] {
    if ( status !== undefined && ! JOB_STATUSES.includes( status ) )
      throw new Error( `Invalid job status: ${ status }` );

    if ( filters.kind !== undefined && ! JOB_KINDS.includes( filters.kind ) )
      throw new Error( `Invalid job kind: ${ filters.kind }` );

    if ( filters.rootId !== undefined ) assertId( filters.rootId, 'root' );
    if ( filters.mediaId !== undefined ) assertId( filters.mediaId, 'media' );
    if ( filters.rootId !== undefined && filters.mediaId !== undefined )
      throw new Error( 'A job list cannot target both a root and a media record' );

    validateNumber( limit, 'Job limit', 1, 1000, true );
    validateNumber( offset, 'Job offset', 0, Number.MAX_SAFE_INTEGER, true );

    const conditions: string[] = [], values: ( string | number )[] = [];

    if ( status !== undefined ) conditions.push( 'status = ?' ), values.push( status );
    if ( filters.rootId !== undefined ) conditions.push( 'root_id = ?' ), values.push( filters.rootId );
    if ( filters.mediaId !== undefined ) conditions.push( 'media_id = ?' ), values.push( filters.mediaId );
    if ( filters.kind !== undefined ) conditions.push( 'kind = ?' ), values.push( filters.kind );

    const rows = as< JobRow[] >( conn().prepare( `
      ${ SELECT_JOB } ${ conditions.length ? `WHERE ${ conditions.join( ' AND ' ) }` : '' }
      ORDER BY updated_at DESC, finished_at DESC, created_at DESC, priority DESC, id LIMIT ? OFFSET ?
    ` ).all( ...values, limit, offset ) );

    return rows.map( JobQueue.mapRow );
  }

  public static get ( id: string ) : JobRecord | null {
    assertId( id, 'job' );

    const row = as< JobRow | undefined >( conn().prepare( `${ SELECT_JOB } WHERE id = ?` ).get( id ) );
    return row ? JobQueue.mapRow( row ) : null;
  }

  public static enqueue ( input: EnqueueJob ) : string {
    if ( ! JOB_KINDS.includes( input.kind ) ) throw new Error( `Invalid job kind: ${ input.kind }` );
    if ( input.rootId !== undefined ) assertId( input.rootId, 'root' );
    if ( input.mediaId !== undefined ) assertId( input.mediaId, 'media' );

    if ( input.rootId !== undefined && input.mediaId !== undefined )
      throw new Error( 'A job cannot target both a root and a media record' );

    if ( input.kind === 'scan' && ( input.rootId === undefined || input.mediaId !== undefined ) )
      throw new Error( 'A scan job must target exactly one root' );

    if ( input.kind !== 'scan' && ( input.mediaId === undefined || input.rootId !== undefined ) )
      throw new Error( `A ${ input.kind } job must target exactly one media record` );

    const priority = validateNumber( input.priority ?? JOB_PRIORITIES[ input.kind ], 'Job priority', -1e6, 1e6, true );
    const maxAttempts = validateNumber( input.maxAttempts ?? 3, 'Maximum job attempts', 1, 100, true );
    const runAfterMs = validateNumber( input.runAfterMs ?? Date.now(), 'Job run time', 0, Number.MAX_SAFE_INTEGER, true );
    const payload = input.payload ?? {};

    if ( ! payload || typeof payload !== 'object' || Array.isArray( payload ) )
      throw new Error( 'Job payload must be an object' );

    try {
      return db.createWithId( id => {
        conn().prepare( `
          INSERT INTO jobs ( id, root_id, media_id, kind, priority, max_attempts, run_after_ms, payload_json )
          VALUES ( ?, ?, ?, ?, ?, ?, ?, ? )
        ` ).run(
          id, input.rootId ?? null, input.mediaId ?? null, input.kind, priority,
          maxAttempts, runAfterMs, JSON.stringify( payload )
        );

        return id;
      } );
    } catch ( err ) {
      if ( ! JobQueue.isUniqueConstraint( err ) ) throw err;
    }

    const existing = as< { id: string } | undefined >( conn().prepare( `
      SELECT id FROM jobs
      WHERE kind = ? AND root_id IS ? AND media_id IS ?
        AND status IN ( 'pending', 'running' )
    ` ).get( input.kind, input.rootId ?? null, input.mediaId ?? null ) );

    if ( existing ) return existing.id;
    throw new Error( `Could not enqueue job: ${ input.kind }` );
  }

  public static claim ( workerId: string ) : JobRecord | null {
    return db.transaction( tx => {
      const row = as< JobRow | undefined >( tx.prepare( `
        ${ SELECT_JOB }
        WHERE status = 'pending' AND run_after_ms <= ?
          AND (
            kind NOT IN ( 'preview', 'frames', 'wave' )
            OR NOT EXISTS (
              SELECT 1 FROM jobs AS prerequisite
              WHERE prerequisite.media_id = jobs.media_id
                AND prerequisite.kind = 'metadata'
                AND prerequisite.status IN ( 'pending', 'running' )
            )
          )
        ORDER BY priority DESC, run_after_ms, id
        LIMIT 1
      ` ).get( Date.now() ) );

      if ( ! row ) return null;

      const result = tx.prepare( `
        UPDATE jobs SET
          status = 'running',
          attempts = attempts + 1,
          locked_at_ms = ?,
          worker = ?,
          error = NULL,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
        WHERE id = ? AND status = 'pending'
      ` ).run( Date.now(), workerId, row.id );

      if ( Number( result.changes ) !== 1 ) return null;

      const claimed = as< JobRow | undefined >( tx.prepare( `${ SELECT_JOB } WHERE id = ?` ).get( row.id ) );
      return claimed ? JobQueue.mapRow( claimed ) : null;
    } );
  }

  public static complete ( id: string, workerId: string ) : void {
    assertId( id, 'job' );

    const result = conn().prepare( `
      UPDATE jobs SET
        status = 'done',
        locked_at_ms = NULL,
        worker = NULL,
        error = NULL,
        finished_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ),
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'running' AND worker = ?
    ` ).run( id, workerId );

    if ( Number( result.changes ) !== 1 )
      throw new Error( `Could not complete job ${ id }: worker ownership was lost` );
  }

  public static retry ( id: string, workerId: string, error: unknown, delayMs: number ) : void {
    assertId( id, 'job' );
    validateNumber( delayMs, 'Retry delay', 0, Number.MAX_SAFE_INTEGER, true );

    const job = JobQueue.get( id );
    if ( ! job || job.status !== 'running' || job.worker !== workerId )
      throw new Error( `Could not retry job ${ id }: worker ownership was lost` );

    const failed = job.attempts >= job.maxAttempts;
    const message = error instanceof Error ? error.message : String( error );

    conn().prepare( `
      UPDATE jobs SET
        status = ?,
        run_after_ms = ?,
        locked_at_ms = NULL,
        worker = NULL,
        error = ?,
        finished_at = CASE WHEN ? = 'failed'
          THEN strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
          ELSE NULL END,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'running' AND worker = ?
    ` ).run(
      failed ? 'failed' : 'pending', Date.now() + delayMs, message.slice( 0, 8000 ),
      failed ? 'failed' : 'pending', id, workerId
    );
  }

  public static release ( id: string, workerId: string ) : void {
    assertId( id, 'job' );

    const result = conn().prepare( `
      UPDATE jobs SET
        status = 'pending',
        attempts = MAX( 0, attempts - 1 ),
        run_after_ms = ?,
        locked_at_ms = NULL,
        worker = NULL,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'running' AND worker = ?
    ` ).run( Date.now(), id, workerId );

    if ( Number( result.changes ) !== 1 )
      throw new Error( `Could not release job ${ id }: worker ownership was lost` );
  }

  public static recover () : number {
    return db.transaction( tx => {
      const result = tx.prepare( `
        UPDATE jobs SET
          status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
          worker = NULL,
          locked_at_ms = NULL,
          error = CASE
            WHEN attempts >= max_attempts THEN COALESCE( error, 'Worker stopped before completion; retry limit reached' )
            ELSE COALESCE( error, 'Recovered after an interrupted worker run' )
          END,
          finished_at = CASE WHEN attempts >= max_attempts
            THEN strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
            ELSE NULL END,
          updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
        WHERE status = 'running'
      ` ).run();

      return Number( result.changes );
    } );
  }

  public static cancel ( id: string ) : void {
    assertId( id, 'job' );

    const result = conn().prepare( `
      UPDATE jobs SET
        status = 'cancelled',
        finished_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ),
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'pending'
    ` ).run( id );

    if ( Number( result.changes ) === 1 ) return;

    const job = JobQueue.get( id );
    if ( ! job ) throw new Error( `Job ${ id } does not exist` );
    throw new Error( `Cannot cancel job ${ id } with status '${ job.status }'` );
  }

  public static retryNow ( id: string ) : void {
    assertId( id, 'job' );

    const result = conn().prepare( `
      UPDATE jobs SET
        status = 'pending',
        attempts = 0,
        run_after_ms = ?,
        locked_at_ms = NULL,
        worker = NULL,
        error = NULL,
        finished_at = NULL,
        updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
      WHERE id = ? AND status = 'failed'
    ` ).run( Date.now(), id );

    if ( Number( result.changes ) === 1 ) return;

    const job = JobQueue.get( id );
    if ( ! job ) throw new Error( `Job ${ id } does not exist` );
    throw new Error( `Cannot retry job ${ id } with status '${ job.status }'` );
  }

  public static getStats () : JobStats {
    const byStatus = Object.fromEntries( JOB_STATUSES.map( status => [ status, 0 ] ) ) as Record< JobStatus, number >;
    const byKind = Object.fromEntries( JOB_KINDS.map( kind => [ kind, 0 ] ) ) as Record< JobKind, number >;

    const statuses = as< { status: JobStatus; count: number }[] >( conn().prepare(
      'SELECT status, COUNT(*) AS count FROM jobs GROUP BY status'
    ).all() );

    const kinds = as< { kind: JobKind; count: number }[] >( conn().prepare(
      'SELECT kind, COUNT(*) AS count FROM jobs GROUP BY kind'
    ).all() );

    for ( const row of statuses ) byStatus[ row.status ] = row.count;
    for ( const row of kinds ) byKind[ row.kind ] = row.count;

    const now = Date.now(), pending = as< { ready: number; scheduled: number } >( conn().prepare( `
      SELECT
        COALESCE( SUM( run_after_ms <= ? ), 0 ) AS ready,
        COALESCE( SUM( run_after_ms > ? ), 0 ) AS scheduled
      FROM jobs
      WHERE status = 'pending'
    ` ).get( now, now ) );

    return {
      total: Object.values( byStatus ).reduce( ( sum, count ) => sum + count, 0 ),
      byStatus, byKind, pendingReady: pending.ready, pendingScheduled: pending.scheduled
    };
  }
}
