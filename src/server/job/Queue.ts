import { as, conn, db } from '@/src/server/core/Database';
import { assertId, validateNumber } from '@/src/server/utils';
import type { EnqueueJob, JobKind, JobRecord, JobRow, JobStatus } from '@/src/shared/types/job';


export const JOB_KINDS: JobKind[] = [ 'scan', 'metadata', 'preview', 'frames', 'wave', 'text' ];

const SELECT_JOB = `
  SELECT
    id, root_id AS rootId, media_id AS mediaId, kind, status, priority,
    attempts, max_attempts AS maxAttempts, run_after_ms AS runAfterMs,
    locked_at_ms AS lockedAtMs, worker, error, payload_json AS payloadJson,
    created_at AS createdAt, updated_at AS updatedAt, finished_at AS finishedAt
  FROM jobs
`;


export class JobQueue {
  private static mapRow ( row: JobRow ) : JobRecord {
    const payload = JSON.parse( row.payloadJson ) as unknown;
    if ( ! payload || typeof payload !== 'object' || Array.isArray( payload ) )
      throw new Error( `Invalid payload for job ${ row.id }` );

    const { payloadJson: _, ...job } = row;
    return { ...job, payload: payload as Record< string, unknown > };
  }

  public static list ( status?: JobStatus, limit = 100, offset = 0 ) : JobRecord[] {
    if ( status !== undefined && ! [ 'pending', 'running', 'done', 'failed', 'cancelled' ].includes( status ) )
      throw new Error( `Invalid job status: ${ status }` );

    validateNumber( limit, 'Job limit', 1, 1000, true );
    validateNumber( offset, 'Job offset', 0, Number.MAX_SAFE_INTEGER, true );

    const rows = as< JobRow[] >( conn().prepare( `
      ${ SELECT_JOB } ${ status === undefined ? '' : 'WHERE status = ?' }
      ORDER BY priority DESC, created_at, id LIMIT ? OFFSET ?
    ` ).all( ...( status === undefined ? [ limit, offset ] : [ status, limit, offset ] ) ) );

    return rows.map( JobQueue.mapRow );
  }

  public static get ( id: number ) : JobRecord | null {
    assertId( id, 'job' );

    const row = as< JobRow | undefined >( conn().prepare( `${ SELECT_JOB } WHERE id = ?` ).get( id ) );
    return row ? JobQueue.mapRow( row ) : null;
  }

  public static enqueue ( input: EnqueueJob ) : number {
    if ( ! JOB_KINDS.includes( input.kind ) ) throw new Error( `Invalid job kind: ${ input.kind }` );
    if ( input.rootId !== undefined ) assertId( input.rootId, 'root' );
    if ( input.mediaId !== undefined ) assertId( input.mediaId, 'media' );
    if ( input.rootId !== undefined && input.mediaId !== undefined )
      throw new Error( 'A job cannot target both a root and a media record' );

    const priority = validateNumber( input.priority ?? 0, 'Job priority', -1e6, 1e6, true );
    const maxAttempts = validateNumber( input.maxAttempts ?? 3, 'Maximum job attempts', 1, 100, true );
    const runAfterMs = validateNumber( input.runAfterMs ?? Date.now(), 'Job run time', 0, Number.MAX_SAFE_INTEGER, true );
    const payload = input.payload ?? {};

    if ( ! payload || typeof payload !== 'object' || Array.isArray( payload ) )
      throw new Error( 'Job payload must be an object' );

    const result = conn().prepare( `
      INSERT OR IGNORE INTO jobs ( root_id, media_id, kind, priority, max_attempts, run_after_ms, payload_json )
      VALUES ( ?, ?, ?, ?, ?, ?, ? )
    ` ).run(
      input.rootId ?? null, input.mediaId ?? null, input.kind, priority,
      maxAttempts, runAfterMs, JSON.stringify( payload )
    );

    if ( Number( result.changes ) === 1 ) return Number( result.lastInsertRowid );

    const existing = as< { id: number } | undefined >( conn().prepare( `
      SELECT id FROM jobs
      WHERE kind = ? AND root_id IS ? AND media_id IS ? AND status IN ( 'pending', 'running' )
    ` ).get( input.kind, input.rootId ?? null, input.mediaId ?? null ) );

    if ( existing ) return existing.id;
    throw new Error( `Could not enqueue job: ${ input.kind }` );
  }
}
