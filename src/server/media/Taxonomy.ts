import { as, conn, db } from '@/src/server/core/Database';
import type { CategoryRecord, TagRecord, TaxonomyKind } from '@/src/shared/types/taxonomy';
import { Media } from '@/src/server/media/Media';


export class MediaTaxonomy {
  private static normalizeName ( name: string ) : string {
    if ( typeof name !== 'string' || ! name.trim() || name.includes( '\0' ) )
      throw new Error( 'Name must not be empty' );

    return name.trim();
  }

  private static assertId ( id: number, label: string ) : void {
    if ( ! Number.isSafeInteger( id ) || id < 1 ) throw new Error( `Invalid ${ label } ID: ${ id }` );
  }

  private static replaceMediaRelations ( mediaId: number, ids: number[], kind: TaxonomyKind ) : void {
    Media.getMediaIdSafe( mediaId );

    const uniqueIds = [ ...new Set( ids ) ];
    uniqueIds.forEach( id => MediaTaxonomy.assertId( id, kind === 'tags' ? 'tag' : 'category' ) );

    const table = kind === 'tags' ? 'tags' : 'categories';
    const joinTable = kind === 'tags' ? 'media_tags' : 'media_categories';
    const idColumn = kind === 'tags' ? 'tag_id' : 'category_id';

    db.transaction( tx => {
      if ( uniqueIds.length ) {
        const placeholders = uniqueIds.map( () => '?' ).join( ', ' );
        const existing = as< { id: number }[] >( tx.prepare(
          `SELECT id FROM ${ table } WHERE id IN ( ${ placeholders } )`
        ).all( ...uniqueIds ) );

        if ( existing.length !== uniqueIds.length )
          throw new Error( `One or more ${ kind } do not exist` );
      }

      tx.prepare( `DELETE FROM ${ joinTable } WHERE media_id = ?` ).run( mediaId );
      const insert = tx.prepare( `INSERT INTO ${ joinTable } ( media_id, ${ idColumn } ) VALUES ( ?, ? )` );
      for ( const id of uniqueIds ) insert.run( mediaId, id );
    } );
  }
}
