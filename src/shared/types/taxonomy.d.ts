export type TaxonomyKind = 'tags' | 'categories';

export interface TagRecord {
  id: string;
  name: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  parentId: string | null;
}
