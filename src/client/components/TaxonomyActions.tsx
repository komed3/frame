interface TaxonomyActionsProps {
  kind: 'category' | 'tag';
  name: string;
  onRename: ( name: string ) => Promise< void >;
  onDelete: () => Promise< void >;
  onSwap: () => Promise< void >;
}


export function TaxonomyActions ( { kind, name, onRename, onDelete, onSwap }: TaxonomyActionsProps ) {
  return (
    <></>
  );
}
