import { as, conn, db } from '@/src/server/core/Database';
import { Media } from '@/src/server/media/Media';
import { assertId } from '@/src/server/utils';
import type { TagRecord, TaxonomyKind } from '@/src/shared/types/taxonomy';


export class MediaTaxonomy {
  private static normalizeName ( name: string ) : string {
    if ( typeof name !== 'string' || ! name.trim() || name.includes( '\0' ) )
      throw new Error( 'Name must not be empty' );

    return name.trim();
  }

  private static replaceMediaRelations ( mediaId: number, ids: number[], kind: TaxonomyKind ) : void {
    Media.assertMediaIdSafe( mediaId );

    const uniqueIds = [ ...new Set( ids ) ];
    uniqueIds.forEach( id => assertId( id, kind === 'tags' ? 'tag' : 'category' ) );

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

  public static listTags () : TagRecord[] {
    return as< TagRecord[] >( conn().prepare(
      'SELECT id, name FROM tags ORDER BY name COLLATE NOCASE, id'
    ).all() );
  }

  public static getTag ( id: number ) : TagRecord | null {
    assertId( id, 'tag' );

    return as< TagRecord | undefined >( conn().prepare(
      'SELECT id, name FROM tags WHERE id = ?'
    ).get( id ) ) ?? null;
  }

  public static createTag ( name: string ) : number {
    const value = MediaTaxonomy.normalizeName( name );
    const row = as< { id: number } | undefined >( conn().prepare( `
      INSERT INTO tags ( name ) VALUES ( ? )
      ON CONFLICT ( name ) DO UPDATE SET name = tags.name
      RETURNING id
    ` ).get( value ) );

    if ( ! row ) throw new Error( `Could not create tag: ${ value }` );
    return row.id;
  }

  public static renameTag ( id: number, name: string ) : void {
    assertId( id, 'tag' );

    const value = MediaTaxonomy.normalizeName( name );
    const result = conn().prepare( 'UPDATE tags SET name = ? WHERE id = ?' ).run( value, id );

    if ( Number( result.changes ) !== 1 ) throw new Error( `Tag ${ id } does not exist` );
  }

  public static deleteTag ( id: number ) : void {
    assertId( id, 'tag' );

    const result = conn().prepare( 'DELETE FROM tags WHERE id = ?' ).run( id );
    if ( Number( result.changes ) !== 1 ) throw new Error( `Tag ${ id } does not exist` );
  }

  public static getMediaTags ( mediaId: number ) : TagRecord[] {
    Media.assertMediaIdSafe( mediaId );

    return as< TagRecord[] >( conn().prepare( `
      SELECT t.id, t.name
      FROM tags t
      JOIN media_tags mt ON mt.tag_id = t.id
      WHERE mt.media_id = ?
      ORDER BY t.name COLLATE NOCASE, t.id
    ` ).all( mediaId ) );
  }

  public static setMediaTags ( mediaId: number, tagIds: number[] ) : void {
    MediaTaxonomy.replaceMediaRelations( mediaId, tagIds, 'tags' );
  }
}
