import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';


interface MediaTaxonomyProps {
  items: ( CategoryRecord | TagRecord )[];
  label: string;
}
