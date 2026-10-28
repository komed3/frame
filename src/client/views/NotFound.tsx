import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { Link } from 'react-router';


export function NotFound () {
  usePageTitle( 'Page Not Found' );

  return (
    <div className= 'flex flex-col justify-center items-center h-[calc(100vh-64px)] px-6 text-center'>
      <p className= 'text-9xl font-extralight tracking-widest text-slate-700'>
        404
      </p>

      <h1 className= 'mt-8 text-3xl tracking-wide'>
        Page Not Found
      </h1>

      <p className= 'mt-3 max-w-md tracking-wide text-slate-400'>
        The page you are looking for does not exist or is no longer available.
      </p>

      <Link
        to= '/'
        className= {
          'mt-8 px-5 py-2.5 text-sm font-medium text-slate-900 bg-slate-200 ' +
          'rounded transition hover:bg-white'
        }
      >
        Back to Home
      </Link>
    </div>
  );
}
