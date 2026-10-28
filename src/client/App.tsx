import { useApi } from '@/src/client/context/ApiContext';
import { Footer } from '@/src/client/layout/Footer';
import { Header } from '@/src/client/layout/Header';
import { Routing } from '@/src/client/Routing';
import { Login } from '@/src/client/views/Login';
import { Loader2Icon } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router';


export function App () {
  const { user, loading } = useApi();
  const { pathname } = useLocation();

  useEffect( () => void window.scrollTo( 0, 0 ), [ pathname ] );


  if ( loading ) return (
    <div className= 'flex justify-center items-center min-h-screen'>
      <Loader2Icon size= { 60 } strokeWidth= { 0.8 } className= 'animate-spin' />
    </div>
  );

  return ! user ? <Login /> : (
    <>
      <Header />

      <main key= { pathname } className= 'min-h-screen pt-18'>
        <Routing />
      </main>

      <Footer />
    </>
  );
}
