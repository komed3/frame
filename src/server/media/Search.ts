import { as, conn } from '@/src/server/core/Database';
import { assertLimitOffset, assertStringId } from '@/src/server/utils';
import type { MediaRecord, MediaRow } from '@/src/shared/types/media';
import type {
  MediaSearchDateFilter as DF, MediaSearchAssetKind, MediaSearchDateField, MediaSearchFilterLike,
  MediaSearchNumberField, MediaSearchQueryMode, MediaSearchResult, MediaSearchSort, MediaSearchTextField,
  MediaSearchMetadataFilter as MF, MediaSearchNumberFilter as NF, MediaSearchOptions as O,
  MediaSearchStringFilter as SF, MediaSearchTrackFilter as TF
} from '@/src/shared/types/search';


const MAX_LIMIT = 500;

const TEXT_COLUMNS: Record< MediaSearchTextField, string > = {
  path: 'm.path', fileName: 'm.file_name', mimeType: 'm.mime_type', fileHash: 'm.file_hash',
  fingerprint: 'm.fingerprint', title: 'm.title', description: 'm.description',
  creator: 'm.creator', language: 'm.language', container: 'm.container',
  videoCodec: 'm.video_codec', audioCodec: 'm.audio_codec', encoding: 'm.encoding'
};

const NUMBER_COLUMNS: Record< MediaSearchNumberField, string > = {
  sizeBytes: 'm.size_bytes', rating: 'm.rating', durationMs: 'm.duration_ms',
  width: 'm.width', height: 'm.height', fps: 'm.fps', bitrate: 'm.bitrate',
  sampleRate: 'm.sample_rate', channels: 'm.channels'
};

const DATE_COLUMNS: Record< MediaSearchDateField, string > = {
  modifiedAt: 'm.modified_at', releasedAt: 'm.released_at', recordedAt: 'm.recorded_at',
  scannedAt: 'm.scanned_at', createdAt: 'm.created_at', updatedAt: 'm.updated_at'
};

const SORT_COLUMNS: Record< Exclude< MediaSearchSort, 'relevance' >, string > = {
  id: 'm.id', rootId: 'm.root_id', type: 'm.type',
  title: 'COALESCE( NULLIF( m.title, \'\' ), m.file_name ) COLLATE NOCASE',
  fileName: 'm.file_name COLLATE NOCASE', path: 'm.path COLLATE NOCASE',
  mimeType: 'm.mime_type COLLATE NOCASE', sizeBytes: 'm.size_bytes',
  modifiedAt: 'm.modified_at', fileHash: 'm.file_hash', fingerprint: 'm.fingerprint',
  creator: 'm.creator COLLATE NOCASE', rating: 'm.rating', releasedAt: 'm.released_at',
  recordedAt: 'm.recorded_at', language: 'm.language COLLATE NOCASE',
  durationMs: 'm.duration_ms', width: 'm.width', height: 'm.height', fps: 'm.fps',
  bitrate: 'm.bitrate', container: 'm.container COLLATE NOCASE',
  videoCodec: 'm.video_codec COLLATE NOCASE', audioCodec: 'm.audio_codec COLLATE NOCASE',
  sampleRate: 'm.sample_rate', channels: 'm.channels',
  encoding: 'm.encoding COLLATE NOCASE', scannedAt: 'm.scanned_at',
  createdAt: 'm.created_at', updatedAt: 'm.updated_at'
};

const ASSET_KINDS: MediaSearchAssetKind[] = [ 'poster', 'thumb', 'frames', 'wave', 'text', 'subtitle' ];


export class MediaSearch {
  private static mapRow ( row: MediaRow ) : MediaRecord {
    const data = JSON.parse( row.dataJson ) as unknown;
    if ( ! data || typeof data !== 'object' || Array.isArray( data ) )
      throw new Error( `Invalid media data JSON for media ${ row.id }` );

    return { ...row, available: Boolean( row.available ), data: data as Record< string, unknown > };
  }

  private static normalizeIds ( ids: string[] ) : string[] {
    return [ ...new Set( ids ) ];
  }

  private static normalizeDate ( value: string, endOfDay = false ) : string {
    const d = value.trim().replace( ' ', 'T' );
    const date = /^\d{4}-\d{2}-\d{2}/.exec( d )?.[ 0 ];

    if ( date && new Date( `${ date }T00:00:00.000Z` ).toISOString().slice( 0, 10 ) !== date )
      throw new Error( `Invalid date: ${ value }` );

    return /^\d{4}-\d{2}-\d{2}$/.test( d ) ? `${ d }T${ endOfDay ? '23:59:59.999' : '00:00:00.000' }Z`
      : new Date( Date.parse( /(?:Z|[+-]\d{2}:?\d{2})$/i.test( d ) ? d : `${ d }Z` ) ).toISOString();
  }

  private static escapeLike ( value: string ) : string {
    return value.replace( /[\\%_]/g, '\\$&' );
  }

  private static buildFtsQuery ( query: string, mode: MediaSearchQueryMode ) : string {
    const value = query.trim();
    if ( ! value ) return '';

    if ( mode === 'phrase' ) return /[\p{L}\p{N}]/u.test( value ) ? `"${ value.replace( /"/g, '""' ) }"` : '';

    const terms = value.match( /[\p{L}\p{N}_]+/gu ) ?? [];
    return terms.map( term => `"${ term }"*` ).join( mode === 'any' ? ' OR ' : ' AND ' );
  }

  private static filterNotNull ( cond: string[], filter: MediaSearchFilterLike, column: string ) : void {
    if ( filter.isNull !== undefined ) cond.push( `${ column } IS ${ filter.isNull ? '' : 'NOT ' }NULL` );
  }

  private static textFilter ( cond: string[], values: ( string | number )[], column: string, filter: SF ) : void {
    MediaSearch.filterNotNull( cond, filter, column );

    for ( const key of [ 'equals', 'contains', 'startsWith', 'endsWith' ] as const ) {
      if ( filter[ key ] === undefined ) continue;

      const value = filter[ key ];
      const escaped = MediaSearch.escapeLike( value.trim() );

      cond.push( key === 'equals' ? `${ column } = ? COLLATE NOCASE`
        : `${ column } LIKE ? ESCAPE '\\' COLLATE NOCASE`
      );

      values.push( key === 'equals' ? value.trim() : key === 'contains' ? `%${ escaped }%`
        : key === 'startsWith' ? `${ escaped }%` : `%${ escaped }`
      );
    }
  }

  private static numberFilter ( cond: string[], values: ( string | number )[], column: string, filter: NF ) : void {
    MediaSearch.filterNotNull( cond, filter, column );

    for ( const [ key, operator ] of [ [ 'equals', '=' ], [ 'min', '>=' ], [ 'max', '<=' ] ] as const ) {
      if ( filter[ key ] === undefined ) continue;

      cond.push( `${ column } ${ operator } ?` );
      values.push( filter[ key ] );
    }
  }

  private static dateFilter ( cond: string[], values: ( string | number )[], column: string, filter: DF ) : void {
    MediaSearch.filterNotNull( cond, filter, column );

    for ( const [ key, operator ] of [ [ 'equals', '=' ], [ 'from', '>=' ], [ 'to', '<=' ] ] as const ) {
      const value = filter[ key ];
      if ( value === undefined ) continue;

      if ( key === 'equals' && /^\d{4}-\d{2}-\d{2}$/.test( value.trim() ) ) {
        cond.push( `( ${ column } >= ? AND ${ column } <= ? )` );
        values.push( MediaSearch.normalizeDate( value ), MediaSearch.normalizeDate( value, true ) );
        continue;
      }

      cond.push( `${ column } ${ operator } ?` );
      values.push( MediaSearch.normalizeDate( value, key === 'to' ) );
    }
  }

  private static appendIn (
    cond: string[], values: ( string | number )[], column: string,
    items: ( string | number )[], negate = false
  ) : void {
    if ( ! items.length ) { if ( ! negate ) cond.push( '0 = 1' ); return }

    cond.push( `${ column } ${ negate ? 'NOT IN' : 'IN' } ( ${ items.map( () => '?' ).join( ', ' ) } )` );
    values.push( ...items );
  }

  private static taxFilters ( cond: string[], values: ( string | number )[], options: O ) : void {
    const append = ( ids: string[] | undefined, table: string, key: string, mode: string ) => {
      if ( ! ids?.length ) return;
      const uniqueIds = MediaSearch.normalizeIds( ids );

      if ( mode === 'all' ) uniqueIds.forEach( id => {
        cond.push( `EXISTS ( SELECT 1 FROM ${ table } WHERE media_id = m.id AND ${ key } = ? )` );
        values.push( id );
      } );

      else {
        cond.push( `EXISTS (
          SELECT 1 FROM ${ table }
          WHERE media_id = m.id AND ${ key } IN ( ${ uniqueIds.map( () => '?' ).join( ', ' ) } )
        )` );
        values.push( ...uniqueIds );
      }
    };

    append( options.tagIds, 'media_tags', 'tag_id', options.tagMode ?? 'any' );
    append( options.categoryIds, 'media_categories', 'category_id', options.categoryMode ?? 'any' );

    for ( const [ ids, table, key ] of [
      [ options.excludeTagIds, 'media_tags', 'tag_id' ],
      [ options.excludeCategoryIds, 'media_categories', 'category_id' ]
    ] as const ) {
      if ( ! ids?.length ) continue;
      const uniqueIds = MediaSearch.normalizeIds( ids );

      cond.push( `NOT EXISTS (
        SELECT 1 FROM ${ table }
        WHERE media_id = m.id AND ${ key } IN ( ${ uniqueIds.map( () => '?' ).join( ', ' ) } )
      )` );
      values.push( ...uniqueIds );
    }
  }

  private static metaFilters ( cond: string[], values: ( string | number )[], filters: MF[] ) : void {
    for ( const filter of filters ) {
      const match = filter.match ?? 'exact';

      cond.push( `
        EXISTS (
          SELECT 1 FROM media_metadata mm
          WHERE mm.media_id = m.id
            AND mm.key = ? COLLATE NOCASE
            ${ filter.source === undefined ? '' : 'AND mm.source = ?' }
            ${ filter.value === undefined ? '' : match === 'exact'
              ? 'AND mm.value = ? COLLATE NOCASE'
              : 'AND mm.value LIKE ? ESCAPE \'\\\' COLLATE NOCASE' }
        )
      ` );

      values.push( filter.key.trim() );
      if ( filter.source !== undefined ) values.push( filter.source );

      if ( filter.value !== undefined ) {
        const value = MediaSearch.escapeLike( filter.value.trim() );
        values.push( match === 'exact' ? filter.value.trim()
          : match === 'contains' ? `%${ value }%` : `${ value }%`
        );
      }
    }
  }

  private static trackFilters ( cond: string[], values: ( string | number )[], filters: TF[] ) : void {
    const columns = {
      codec: 'codec', language: 'language', title: 'title', isDefault: 'is_default',
      isForced: 'is_forced', minWidth: 'width', maxWidth: 'width', minHeight: 'height',
      maxHeight: 'height', minChannels: 'channels', maxChannels: 'channels'
    } as const;

    for ( const filter of filters ) {
      const parts: string[] = [];

      if ( filter.kind !== undefined ) parts.push( 't.kind = ?' ), values.push( filter.kind );

      for ( const key of [ 'codec', 'language', 'title' ] as const ) {
        if ( filter[ key ] === undefined ) continue;

        parts.push( `t.${ columns[ key ] } = ? COLLATE NOCASE` );
        values.push( filter[ key ].trim() );
      }

      for ( const key of [ 'isDefault', 'isForced' ] as const ) {
        if ( filter[ key ] === undefined ) continue;

        parts.push( `t.${ columns[ key ] } = ?` );
        values.push( Number( filter[ key ] ) );
      }

      for ( const key of [ 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'minChannels', 'maxChannels' ] as const ) {
        if ( filter[ key ] === undefined ) continue;

        parts.push( `t.${ columns[ key ] } ${ key.startsWith( 'min' ) ? '>=' : '<=' } ?` );
        values.push( filter[ key ] );
      }

      if ( parts.length ) cond.push( `
        EXISTS (
          SELECT 1 FROM tracks t
          WHERE t.media_id = m.id AND ${ parts.join( ' AND ' ) }
        )
      ` );
    }
  }

  private static assetFilters ( cond: string[], values: ( string | number )[], options: O ) : void {
    for ( const [ key, mode ] of [
      [ 'assetKindsAny', 'any' ], [ 'assetKindsAll', 'all' ], [ 'missingAssetKinds', 'missing' ]
    ] as const ) {
      const kinds = options[ key ];
      if ( ! kinds?.length ) continue;

      const uniqueKinds = [ ...new Set( kinds ) ].filter( kind => ASSET_KINDS.includes( kind ) );
      if ( ! uniqueKinds.length ) continue;

      const append = ( kind: string ) => {
        cond.push( 'EXISTS ( SELECT 1 FROM assets a WHERE a.media_id = m.id AND a.kind = ? )' );
        values.push( kind );
      };

      if ( mode === 'all' ) uniqueKinds.forEach( append );
      else {
        cond.push( `
          ${ mode === 'any' ? 'EXISTS' : 'NOT EXISTS' } (
            SELECT 1 FROM assets a
            WHERE a.media_id = m.id AND a.kind IN ( ${ uniqueKinds.map( () => '?' ).join( ', ' ) } )
          )
        ` );
        values.push( ...uniqueKinds );
      }
    }
  }

  private static userFilters ( cond: string[], values: ( string | number )[], options: O ) : void {
    const { userId, favorite, played, progress } = options;

    if ( favorite === undefined && played === undefined && progress === undefined ) return;
    if ( userId === undefined ) throw new Error( 'userId is required for user-specific search filters' );
    assertStringId( userId, 'user' );

    const exists = ( table: string, value: boolean ) => {
      cond.push( `${ value ? 'EXISTS' : 'NOT EXISTS' } (
        SELECT 1 FROM ${ table }
        WHERE user_id = ? AND media_id = m.id
      )` );
      values.push( userId );
    };

    if ( favorite !== undefined ) exists( 'favorites', favorite );
    if ( played !== undefined ) exists( 'plays', played );

    if ( progress !== undefined ) {
      const expressions = {
        'not-started': 'NOT EXISTS ( SELECT 1 FROM progress p WHERE p.user_id = ? AND p.media_id = m.id AND ( p.position_ms > 0 OR p.completed = 1 ) )',
        started: 'EXISTS ( SELECT 1 FROM progress p WHERE p.user_id = ? AND p.media_id = m.id AND ( p.position_ms > 0 OR p.completed = 1 ) )',
        'in-progress': 'EXISTS ( SELECT 1 FROM progress p WHERE p.user_id = ? AND p.media_id = m.id AND p.position_ms > 0 AND p.completed = 0 )',
        completed: 'EXISTS ( SELECT 1 FROM progress p WHERE p.user_id = ? AND p.media_id = m.id AND p.completed = 1 )'
      } as const;

      const expression = expressions[ progress ];
      if ( expression ) cond.push( expression ), values.push( userId );
    }
  }

  private static buildWhere ( options: O ) : { where: string; values: ( string | number )[]; hasQuery: boolean } {
    const cond: string[] = [], values: ( string | number )[] = [];
    const query = options.query?.trim() ?? '', queryMode = options.queryMode ?? 'all';
    const ftsQuery = query ? MediaSearch.buildFtsQuery( query, queryMode ) : '';
    const hasQuery = Boolean( ftsQuery );

    if ( hasQuery ) cond.push( 'media_fts MATCH ?' ), values.push( ftsQuery );
    else if ( query ) cond.push( '0 = 1' );

    if ( options.ids !== undefined )
      MediaSearch.appendIn( cond, values, 'm.id', MediaSearch.normalizeIds( options.ids ) );

    if ( options.excludeIds !== undefined )
      MediaSearch.appendIn( cond, values, 'm.id', MediaSearch.normalizeIds( options.excludeIds ), true );

    if ( options.rootIds !== undefined )
      MediaSearch.appendIn( cond, values, 'm.root_id', MediaSearch.normalizeIds( options.rootIds ) );

    if ( options.types !== undefined )
      MediaSearch.appendIn( cond, values, 'm.type', options.types );

    if ( options.available !== undefined ) {
      cond.push( 'm.available = ?' );
      values.push( Number( options.available ) );
    }

    if ( options.rootEnabled !== undefined ) {
      cond.push( 'r.enabled = ?' );
      values.push( Number( options.rootEnabled ) );
    }

    for ( const [ field, filter ] of Object.entries( options.text ?? {} ) ) {
      if ( filter === undefined || ! Object.hasOwn( TEXT_COLUMNS, field ) ) continue;
      MediaSearch.textFilter( cond, values, TEXT_COLUMNS[ field as MediaSearchTextField ], filter );
    }

    for ( const [ field, filter ] of Object.entries( options.numbers ?? {} ) ) {
      if ( filter === undefined || ! Object.hasOwn( NUMBER_COLUMNS, field ) ) continue;
      MediaSearch.numberFilter( cond, values, NUMBER_COLUMNS[ field as MediaSearchNumberField ], filter );
    }

    for ( const [ field, filter ] of Object.entries( options.dates ?? {} ) ) {
      if ( filter === undefined || ! Object.hasOwn( DATE_COLUMNS, field ) ) continue;
      MediaSearch.dateFilter( cond, values, DATE_COLUMNS[ field as MediaSearchDateField ], filter );
    }

    MediaSearch.taxFilters( cond, values, options );
    if ( options.metadata?.length ) MediaSearch.metaFilters( cond, values, options.metadata );
    if ( options.tracks?.length ) MediaSearch.trackFilters( cond, values, options.tracks );
    MediaSearch.assetFilters( cond, values, options );
    MediaSearch.userFilters( cond, values, options );

    return { where: cond.length ? `WHERE ${ cond.join( ' AND ' ) }` : '', values, hasQuery };
  }

  public static search ( options: O = {} ) : MediaSearchResult {
    let limit = options.limit ?? 100, offset = options.offset ?? 0;
    assertLimitOffset( limit, offset );

    limit = Math.min( MAX_LIMIT, limit );
    const sortBy = options.sortBy ?? 'title', direction = options.sortDirection === 'desc' ? 'DESC' : 'ASC';
    const { where, values, hasQuery } = MediaSearch.buildWhere( options );

    const sortExpression = sortBy === 'relevance' && hasQuery ? 'bm25( media_fts )'
      : SORT_COLUMNS[ sortBy as Exclude< MediaSearchSort, 'relevance' > ] ?? SORT_COLUMNS.title;

    const from = `
      FROM media m JOIN roots r ON r.id = m.root_id
      ${ hasQuery ? 'JOIN media_fts ON media_fts.rowid = m.rowid' : '' }
    `;

    const totalRow = as< { total: number } >( conn().prepare(
      `SELECT COUNT(*) AS total ${ from } ${ where }`
    ).get( ...values ) );

    const rows = as< MediaRow[] >( conn().prepare( `
      SELECT
        m.id, m.root_id AS rootId, m.directory_id AS directoryId, m.path, m.file_name AS fileName,
        m.type, m.mime_type AS mimeType, m.size_bytes AS sizeBytes, m.modified_at AS modifiedAt,
        m.file_hash AS fileHash, m.fingerprint, m.available, m.title, m.description, m.creator,
        m.rating, m.released_at AS releasedAt, m.recorded_at AS recordedAt, m.language,
        m.duration_ms AS durationMs, m.width, m.height, m.fps, m.bitrate, m.container,
        m.video_codec AS videoCodec, m.audio_codec AS audioCodec, m.sample_rate AS sampleRate,
        m.channels, m.encoding, m.data_json AS dataJson, m.scanned_at AS scannedAt,
        m.created_at AS createdAt, m.updated_at AS updatedAt
      ${ from } ${ where }
      ORDER BY
        CASE WHEN ( ${ sortExpression } ) IS NULL THEN 1 ELSE 0 END,
        ${ sortExpression } ${ direction },
        m.id ASC
      LIMIT ? OFFSET ?
    ` ).all( ...values, limit, offset ) );

    return {
      items: rows.map( row => MediaSearch.mapRow( row ) ),
      total: totalRow.total, limit, offset
    };
  }
}
