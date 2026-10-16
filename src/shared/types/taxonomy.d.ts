export type TaxonomyKind = 'tags' | 'categories';

export interface TagRecord {
  id: number;
  name: string;
}

export interface CategoryRecord {
  id: number;
  name: string;
  parentId: number | null;
}
