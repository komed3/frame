import { as, conn, db } from '@/src/server/core/Database';
import type { CategoryRecord, TagRecord, TaxonomyKind } from '@/src/shared/types/taxonomy';


export class MediaTaxonomy {
  private static normalizeName ( name: string ) : string {
    if ( typeof name !== 'string' || ! name.trim() || name.includes( '\0' ) )
      throw new Error( 'Name must not be empty' );

    return name.trim();
  }
}
