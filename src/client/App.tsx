import { useApi } from '@/src/client/context/ApiContext';
import { Footer } from '@/src/client/layout/Footer';
import { Header } from '@/src/client/layout/Header';
import { Sidebar } from '@/src/client/layout/Sidebar';
import { Routing } from '@/src/client/Routing';
import { Login } from '@/src/client/views/Login';
import { useLocation } from 'react-router';


export function App () {
  const { user } = useApi();
  const { pathname } = useLocation();

  return ! user ? <Login /> : (
    <>
      <Header />
      <Sidebar />

      <main key= { pathname } className= 'min-h-screen mt-38'>
        <Routing />
      </main>

      <Footer />
    </>
  );
}
