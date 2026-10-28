import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDate } from '@/src/client/utils/format';


export function Account () {
  const { user } = useApi();

  usePageTitle( 'My Account' );


  return user && (
    <div className= 'mx-auto my-12 max-w-5xl px-6 space-y-8'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        My Account
      </h1>

      <div className= 'p-6 space-y-5 bg-slate-800 rounded shadow-lg'>
        <h2 className= 'text-lg font-medium'>
          Account Information
        </h2>

        <div className= 'divide-y divide-dashed divide-slate-700/70'>
          { [
            [ 'Username', user.username ],
            [ 'User ID', user.id ],
            [ 'Role', user.isAdmin ? 'Administrator' : 'User' ],
            [ 'Created', formatDate( user.createdAt ) ],
            [ 'Account Status', user.disabledAt ? 'Disabled' : 'Active' ]
          ].map( ( [ label, value ] ) => (
            <div key= { label } className= 'flex justify-between items-center gap-6 py-4'>
              <span className= 'text-sm font-light'>
                { label }
              </span>

              <b className= 'text-right text-sm font-medium break-all'>
                { value }
              </b>
            </div>
          ) ) }
        </div>
      </div>
    </div>
  );
}
