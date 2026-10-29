import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { Footer } from '@/src/client/layout/Footer';
import { Header } from '@/src/client/layout/Header';
import { Routing } from '@/src/client/Routing';
import { Login } from '@/src/client/views/Login';
import { useEffect } from 'react';
import { useLocation } from 'react-router';


export function App () {
  const { user, loading } = useApi();
  const { pathname } = useLocation();

  useEffect( () => void window.scrollTo( 0, 0 ), [ pathname ] );


  if ( loading ) return <Loading className= 'min-h-screen' />;
  if ( ! user ) return <Login />;


  return (
    <>
      <Header />

      <main key= { pathname } className= 'min-h-screen py-16'>
        <Routing />
      </main>

      <Footer />
    </>
  );
}
