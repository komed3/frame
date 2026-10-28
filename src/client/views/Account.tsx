import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDate } from '@/src/client/utils/format';


export function Account () {
  const { user } = useApi();
  if ( ! user ) return null;

  usePageTitle( 'My Account' );


  const details = [
    [ 'Username', user.username ],
    [ 'User ID', user.id ],
    [ 'Role', user.isAdmin ? 'Administrator' : 'User' ],
    [ 'Created', formatDate( user.createdAt ) ],
    [ 'Account Status', user.disabledAt ? 'Disabled' : 'Active' ]
  ];
}
