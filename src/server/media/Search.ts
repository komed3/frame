import { assertId, normalizeString, validateEnum } from '@/src/server/utils';
import type { MediaRecord, MediaRow } from '@/src/shared/types/media';
import type {
  MediaSearchAssetKind, MediaSearchDateField, MediaSearchDateFilter, MediaSearchFilterLike,
  MediaSearchMetadataFilter, MediaSearchNumberField, MediaSearchNumberFilter, MediaSearchOptions,
  MediaSearchQueryMode, MediaSearchSort, MediaSearchStringFilter, MediaSearchTextField,
  MediaSearchTrackFilter
} from '@/src/shared/types/search';
import { MEDIA_TYPES } from './Media';


const MAX_LIMIT = 500;

const TEXT_COLUMNS: Record< MediaSearchTextField, string > = {
  path: 'm.path', fileName: 'm.file_name', mimeType: 'm.mime_type', fileHash: 'm.file_hash',
  fingerprint: 'm.fingerprint', title: 'm.title', description: 'm.description',
  creator: 'm.creator', language: 'm.language', container: 'm.container',
  videoCodec: 'm.video_codec', audioCodec: 'm.audio_codec', encoding: 'm.encoding'
};

const NUMBER_COLUMNS: Record< MediaSearchNumberField, string > = {
  id: 'm.id', rootId: 'm.root_id', sizeBytes: 'm.size_bytes', rating: 'm.rating',
  durationMs: 'm.duration_ms', width: 'm.width', height: 'm.height', fps: 'm.fps',
  bitrate: 'm.bitrate', sampleRate: 'm.sample_rate', channels: 'm.channels'
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

    return { ...row, available: row.available === 1, data: data as Record< string, unknown > };
  }

  private static normalizeIds ( ids: number[], label: string ) : number[] {
    if ( ! Array.isArray( ids ) ) throw new Error( `${ label } must be an array` );

    const uniqueIds = [ ...new Set( ids ) ];
    uniqueIds.forEach( id => assertId( id, label ) );

    if ( uniqueIds.length > 500 ) throw new Error( `${ label } cannot contain more than 500 IDs` );
    return uniqueIds;
  }

  private static normalizeDate ( value: string, label: string, endOfDay = false ) : string {
    const normalized = normalizeString( value, label );

    if ( ! Number.isFinite( Date.parse( normalized ) ) )
      throw new Error( `Invalid ${ label }: ${ normalized }` );

    if ( /^\d{4}-\d{2}-\d{2}$/.test( normalized ) )
      return `${ normalized }T${ endOfDay ? '23:59:59.999' : '00:00:00.000' }Z`;

    return normalized;
  }

  private static escapeLike ( value: string ) : string {
    return value.replace( /[\\%_]/g, '\\$&' );
  }

  private static buildFtsQuery ( query: string, mode: MediaSearchQueryMode ) : string {
    const value = normalizeString( query, 'Search query' );

    if ( mode === 'phrase' ) {
      if ( ! /[\p{L}\p{N}]/u.test( value ) ) throw new Error( 'Search query contains no searchable terms' );
      return `"${ value.replace( /"/g, '""' ) }"`;
    }

    const terms = value.match( /[\p{L}\p{N}_]+/gu ) ?? [];
    if ( ! terms.length ) throw new Error( 'Search query contains no searchable terms' );

    const operator = mode === 'all' ? ' AND ' : ' OR ';
    return terms.map( term => `"${ term.replace( /"/g, '""' ) }"*` ).join( operator );
  }

  private static assertFilterArray ( filters: unknown[] ) : void {
    if ( ! Array.isArray( filters ) ) throw new Error( 'Track filters must be an array' );
  }

  private static filterNN ( cond: string[], filter: MediaSearchFilterLike, column: string, hasValue: boolean, label: string ) : void {
    if ( filter.isNull === undefined ) return;
    if ( typeof filter.isNull !== 'boolean' ) throw new Error( `${ label }.isNull must be a boolean` );
    if ( filter.isNull && hasValue ) throw new Error( `${ label } cannot combine isNull with text conditions` );

    cond.push( `${ column } IS ${ filter.isNull ? '' : 'NOT ' }NULL` );
  }

  private static appendTextFilter (
    cond: string[], values: ( string | number )[], column: string, filter: MediaSearchStringFilter, label: string
  ) : void {
    const hasValue = [ filter.equals, filter.contains, filter.startsWith, filter.endsWith ].some( v => v !== undefined );
    MediaSearch.filterNN( cond, filter, column, hasValue, label );

    if ( filter.equals !== undefined ) {
      cond.push( `${ column } = ? COLLATE NOCASE` );
      values.push( normalizeString( filter.equals, label ) );
    }

    if ( filter.contains !== undefined ) {
      cond.push( `${ column } LIKE ? ESCAPE '\\' COLLATE NOCASE` );
      values.push( `%${ MediaSearch.escapeLike( normalizeString( filter.contains, label ) ) }%` );
    }

    if ( filter.startsWith !== undefined ) {
      cond.push( `${ column } LIKE ? ESCAPE '\\' COLLATE NOCASE` );
      values.push( `${ MediaSearch.escapeLike( normalizeString( filter.startsWith, label ) ) }%` );
    }

    if ( filter.endsWith !== undefined ) {
      cond.push( `${ column } LIKE ? ESCAPE '\\' COLLATE NOCASE` );
      values.push( `%${ MediaSearch.escapeLike( normalizeString( filter.endsWith, label ) ) }` );
    }
  }

  private static appendNumberFilter (
    cond: string[], values: ( string | number )[], column: string, filter: MediaSearchNumberFilter, label: string
  ) : void {
    const hasValue = [ filter.equals, filter.min, filter.max ].some( v => v !== undefined );
    MediaSearch.filterNN( cond, filter, column, hasValue, label );

    for ( const [ k, v ] of [ [ 'equals', filter.equals ], [ 'min', filter.min ], [ 'max', filter.max ] ] as const ) {
      if ( v === undefined ) continue;

      if ( typeof v !== 'number' || ! Number.isFinite( v ) )
        throw new Error( `${ label }.${ k } must be a finite number` );
    }

    if ( filter.min !== undefined && filter.max !== undefined && filter.min > filter.max )
      throw new Error( `${ label }.min cannot exceed max` );

    if ( filter.equals !== undefined ) cond.push( `${ column } = ?` ), values.push( filter.equals );
    if ( filter.min !== undefined ) cond.push( `${ column } >= ?` ), values.push( filter.min );
    if ( filter.max !== undefined ) cond.push( `${ column } <= ?` ), values.push( filter.max );
  }

  private static appendDateFilter (
    cond: string[], values: ( string | number )[], column: string, filter: MediaSearchDateFilter, label: string
  ) : void {
    const hasValue = [ filter.equals, filter.from, filter.to ].some( v => v !== undefined );
    MediaSearch.filterNN( cond, filter, column, hasValue, label );

    const equals = filter.equals === undefined ? undefined : MediaSearch.normalizeDate( filter.equals, label );
    const from = filter.from === undefined ? undefined : MediaSearch.normalizeDate( filter.from, `${ label }.from` );
    const to = filter.to === undefined ? undefined : MediaSearch.normalizeDate( filter.to, `${ label }.to`, true );

    if ( from !== undefined && to !== undefined && from > to )
      throw new Error( `${ label }.from cannot be after to` );

    if ( equals !== undefined ) cond.push( `${ column } = ?` ), values.push( equals );
    if ( from !== undefined ) cond.push( `${ column } >= ?` ), values.push( from );
    if ( to !== undefined ) cond.push( `${ column } <= ?` ), values.push( to );
  }

  private static appendIn (
    cond: string[], values: ( string | number )[], column: string, items: ( string | number )[], negate = false
  ) : void {
    if ( ! items.length ) { if ( ! negate ) cond.push( '0 = 1' ); return }

    cond.push( `${ column } ${ negate ? 'NOT IN' : 'IN' } ( ${ items.map( () => '?' ).join( ', ' ) } )` );
    values.push( ...items );
  }

  private static appendTaxFilters ( cond: string[], values: ( string | number )[], options: MediaSearchOptions ) : void {
    const tagIds = options.tagIds ? MediaSearch.normalizeIds( options.tagIds, 'tag' ) : [];
    const exTagIds = options.excludeTagIds ? MediaSearch.normalizeIds( options.excludeTagIds, 'tag' ) : [];
    const catIds = options.categoryIds ? MediaSearch.normalizeIds( options.categoryIds, 'category' ) : [];
    const exCatIds = options.excludeCategoryIds ? MediaSearch.normalizeIds( options.excludeCategoryIds, 'category' ) : [];

    const appendExists = ( ids: ( string | number )[], table: string, mode: string ) => {
      if ( mode === 'all' ) ids.forEach( id => {
        cond.push( `EXISTS ( SELECT 1 FROM ${ table } WHERE media_id = m.id AND id = ? )` );
        values.push( id );
      } );

      else {
        cond.push( `EXISTS ( SELECT 1 FROM ${ table } WHERE media_id = m.id AND id IN ( ${
          ids.map( () => '?' ).join( ', ' )
        } ) )` );
        values.push( ...ids );
      }
    };

    if ( tagIds.length ) appendExists( tagIds, 'media_tags', validateEnum(
      options.tagMode ?? 'any', 'tag mode', [ 'any', 'all' ]
    ) );

    if ( exTagIds.length ) {
      cond.push( `NOT EXISTS ( SELECT 1 FROM media_tags WHERE media_id = m.id AND tag_id IN ( ${
        exTagIds.map( () => '?' ).join( ', ' )
      } ) )` );
      values.push( ...exTagIds );
    }

    if ( catIds.length ) appendExists( catIds, 'media_categories', validateEnum(
      options.categoryMode ?? 'any', 'category mode', ['any', 'all']
    ) );

    if ( exCatIds.length ) {
      cond.push( `NOT EXISTS ( SELECT 1 FROM media_categories WHERE media_id = m.id AND category_id IN ( ${
        exCatIds.map( () => '?' ).join( ', ' )
      } ) )` );
      values.push( ...exCatIds );
    }
  }

  private static appendMetaFilters ( cond: string[], values: ( string | number )[], filters: MediaSearchMetadataFilter[] ) : void {
    MediaSearch.assertFilterArray( filters );

    for ( const filter of filters ) {
      const key = normalizeString( filter.key, 'Metadata key' );
      const match = validateEnum( filter.match ?? 'exact', 'metadata match', [
        'exact', 'contains', 'startsWith'
      ] );

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

      values.push( key );

      if ( filter.source !== undefined ) values.push( validateEnum(
        filter.source, 'metadata source', [ 'manual', 'scan' ]
      ) );

      if ( filter.value !== undefined ) {
        const value = normalizeString( filter.value, 'Metadata value' );

        values.push( match === 'exact' ? value : match === 'contains'
          ? `%${ MediaSearch.escapeLike( value ) }%`
          : `${ MediaSearch.escapeLike( value ) }%`
        );
      }
    }
  }

  private static appendTrackFilters ( cond: string[], values: ( string | number )[], filters: MediaSearchTrackFilter[] ) : void {
    MediaSearch.assertFilterArray( filters );

    for ( const filter of filters ) {
      const parts: string[] = [];

      if ( filter.kind !== undefined ) {
        parts.push( 't.kind = ?' );
        values.push( validateEnum( filter.kind, 'track kind', [ 'video', 'audio', 'subtitle', 'data' ] ) );
      }

      for ( const key of [ 'codec', 'language', 'title' ] as const ) {
        const value = filter[ key ];
        if ( value === undefined ) continue;

        parts.push( `t.${ key } = ? COLLATE NOCASE` );
        values.push( normalizeString( value, `track ${ key }` ) );
      }

      for ( const key of [ 'isDefault', 'isForced' ] as const ) {
        const value = filter[ key ];
        if ( value === undefined ) continue;
        if ( typeof value !== 'boolean' ) throw new Error( `Track ${ key } must be a boolean` );

        parts.push( `t.${ key === 'isDefault' ? 'is_default' : 'is_forced' } = ?` );
        values.push( Number( value ) );
      }

      for ( const [ key, column ] of [
        [ 'minWidth', 'width' ], [ 'maxWidth', 'width' ], [ 'minHeight', 'height' ],
        [ 'maxHeight', 'height' ], [ 'minChannels', 'channels' ], [ 'maxChannels', 'channels' ]
      ] as const ) {
        const value = filter[ key ];

        if ( value === undefined ) continue;
        if ( ! Number.isFinite( value ) || value < 0 )
          throw new Error( `Track ${ key } must be a non-negative number` );

        parts.push( `t.${ column } ${ key.startsWith( 'min' ) ? '>=' : '<=' } ?` );
        values.push( value );
      }

      if ( ! parts.length ) throw new Error( 'A track filter must contain at least one condition' );

      cond.push( `
        EXISTS (
          SELECT 1 FROM tracks t
          WHERE t.media_id = m.id AND ${ parts.join( ' AND ' ) }
        )
      ` );
    }
  }

  private static appendAssetFilters ( cond: string[], values: ( string | number )[], options: MediaSearchOptions ) : void {
    for ( const [ key, mode ] of [
      [ 'assetKindsAny', 'any' ], [ 'assetKindsAll', 'all' ], [ 'missingAssetKinds', 'missing' ]
    ] as const ) {
      const kinds = options[ key ];
      if ( kinds === undefined ) continue;
      if ( ! Array.isArray( kinds ) ) throw new Error( `${ key } must be an array` );

      const uniqueKinds = [ ...new Set( kinds ) ].map( k => validateEnum( k, 'asset kind', ASSET_KINDS ) );
      if ( ! uniqueKinds.length ) continue;

      if ( mode === 'all' ) for ( const kind of uniqueKinds ) {
        cond.push( 'EXISTS ( SELECT 1 FROM assets a WHERE a.media_id = m.id AND a.kind = ? )' );
        values.push( kind );
      }

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

  private static appendUserFilters ( cond: string[], values: ( string | number )[], options: MediaSearchOptions ) : void {
    const needsUser = options.favorite !== undefined || options.played !== undefined || options.progress !== undefined;
    if ( options.userId !== undefined ) assertId( options.userId, 'user' );

    if ( needsUser && options.userId === undefined )
      throw new Error( 'userId is required for favorite, played or progress filters' );

    if ( options.favorite !== undefined ) {
      if ( typeof options.favorite !== 'boolean' ) throw new Error( 'favorite must be a boolean' );

      cond.push( `
        ${ options.favorite ? 'EXISTS' : 'NOT EXISTS' } (
          SELECT 1 FROM favorites f
          WHERE f.user_id = ? AND f.media_id = m.id
        )
      ` );
      values.push( options.userId! );
    }

    if ( options.played !== undefined ) {
      if ( typeof options.played !== 'boolean' ) throw new Error( 'played must be a boolean' );

      cond.push( `
        ${ options.played ? 'EXISTS' : 'NOT EXISTS' } (
          SELECT 1 FROM plays p
          WHERE p.user_id = ? AND p.media_id = m.id
        )
      ` );
      values.push( options.userId! );
    }

    if ( options.progress !== undefined ) {
      const progress = validateEnum( options.progress, 'progress', [
        'not-started', 'started', 'in-progress', 'completed'
      ] );

      const expression = {
        'not-started': `
          NOT EXISTS (
            SELECT 1 FROM progress p
            WHERE p.user_id = ? AND p.media_id = m.id
              AND ( p.position_ms > 0 OR p.completed = 1 )
          )
        `,
        started: `
          EXISTS (
            SELECT 1 FROM progress p
            WHERE p.user_id = ? AND p.media_id = m.id
              AND ( p.position_ms > 0 OR p.completed = 1 )
          )
        `,
        'in-progress': `
          EXISTS (
            SELECT 1 FROM progress p
            WHERE p.user_id = ? AND p.media_id = m.id
              AND p.position_ms > 0 AND p.completed = 0
          )
        `,
        completed: `
          EXISTS (
            SELECT 1 FROM progress p
            WHERE p.user_id = ? AND p.media_id = m.id AND p.completed = 1
          )
        `
      }[ progress ];

      cond.push( expression );
      values.push( options.userId! );
    }
  }

  private static buildWhere ( options: MediaSearchOptions ) : { where: string; values: ( string | number )[]; hasQuery: boolean } {
    const cond: string[] = [], values: ( string | number )[] = [];
    const hasQuery = options.query !== undefined && options.query.trim().length > 0;

    if ( hasQuery ) {
      cond.push( 'media_fts MATCH ?' );
      values.push( MediaSearch.buildFtsQuery( options.query!, validateEnum(
        options.queryMode ?? 'all', 'query mode', [ 'all', 'any', 'phrase' ]
      ) ) );
    }

    if ( options.ids !== undefined ) MediaSearch.appendIn(
      cond, values, 'm.id', MediaSearch.normalizeIds( options.ids, 'media' )
    );

    if ( options.excludeIds !== undefined ) MediaSearch.appendIn(
      cond, values, 'm.id', MediaSearch.normalizeIds( options.excludeIds, 'media' ), true
    );

    if ( options.rootIds !== undefined ) MediaSearch.appendIn(
      cond, values, 'm.root_id', MediaSearch.normalizeIds( options.rootIds, 'media root' )
    );

    if ( options.types !== undefined ) {
      if ( ! Array.isArray( options.types ) ) throw new Error( 'types must be an array' );

      MediaSearch.appendIn( cond, values, 'm.type', [ ...new Set( options.types ) ].map(
        type => validateEnum( type, 'media type', MEDIA_TYPES )
      ) );
    }

    if ( options.available !== undefined ) {
      if ( typeof options.available !== 'boolean' ) throw new Error( 'available must be a boolean' );

      cond.push( 'm.available = ?' );
      values.push( Number( options.available ) );
    }

    if ( options.rootEnabled !== undefined ) {
      if ( typeof options.rootEnabled !== 'boolean' ) throw new Error( 'rootEnabled must be a boolean' );

      cond.push( 'r.enabled = ?' );
      values.push( Number( options.rootEnabled ) );
    }

    if ( options.text !== undefined ) {
      for ( const [ field, filter ] of Object.entries( options.text ) ) {
        if ( filter === undefined ) continue;

        if ( ! Object.hasOwn( TEXT_COLUMNS, field ) ) throw new Error( `Invalid text search field: ${ field }` );
        if ( ! filter || typeof filter !== 'object' || Array.isArray( filter ) )
          throw new Error( `Invalid text filter: ${ field }` );

        MediaSearch.appendTextFilter(
          cond, values, TEXT_COLUMNS[ field as MediaSearchTextField ], filter, field
        );
      }
    }

    if ( options.numbers !== undefined ) {
      for ( const [ field, filter ] of Object.entries( options.numbers ) ) {
        if ( filter === undefined ) continue;

        if ( ! Object.hasOwn( NUMBER_COLUMNS, field ) )
          throw new Error( `Invalid numeric search field: ${ field }` );

        if ( ! filter || typeof filter !== 'object' || Array.isArray( filter ) )
          throw new Error( `Invalid numeric filter: ${ field }` );

        MediaSearch.appendNumberFilter(
          cond, values, NUMBER_COLUMNS[ field as MediaSearchNumberField ], filter, field
        );
      }
    }

    if ( options.dates !== undefined ) {
      for ( const [ field, filter ] of Object.entries( options.dates ) ) {
        if ( filter === undefined ) continue;

        if ( ! Object.hasOwn( DATE_COLUMNS, field ) )
          throw new Error( `Invalid date search field: ${ field }` );

        if ( ! filter || typeof filter !== 'object' || Array.isArray( filter ) )
          throw new Error( `Invalid date filter: ${ field }` );

        MediaSearch.appendDateFilter(
          cond, values, DATE_COLUMNS[ field as MediaSearchDateField ], filter, field
        );
      }
    }

    MediaSearch.appendTaxFilters( cond, values, options );
    if ( options.metadata !== undefined ) MediaSearch.appendMetaFilters( cond, values, options.metadata );
    if ( options.tracks !== undefined ) MediaSearch.appendTrackFilters( cond, values, options.tracks );
    MediaSearch.appendAssetFilters( cond, values, options );
    MediaSearch.appendUserFilters( cond, values, options );

    return { where: cond.length ? `WHERE ${ cond.join( ' AND ' ) }` : '', values, hasQuery };
  }
}
