import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { Link } from 'react-router';


export function Account () {
  const { user } = useApi();

  usePageTitle( 'My Account' );
}
