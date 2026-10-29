import { useApi } from '@/src/client/context/ApiContext';
import { NotFound } from '@/src/client/views/NotFound';


export function Editor () {
  const { canEdit } = useApi();

  if ( ! canEdit ) return <NotFound />;

  return (
    <></>
  );
}
