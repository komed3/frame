import { App } from '@/src/client/App';
import { ApiProvider } from '@/src/client/context/ApiContext';
import { useTooltips } from '@/src/client/hooks/useTooltips';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router';

import '@/src/client/index.css';


function Root () {
  const tooltips = useTooltips();

  return (
    <>
      <App />
      { tooltips }
    </>
  );
}


createRoot( document.getElementById( 'root' )! ).render(
  <StrictMode>
    <ApiProvider>
      <Router>
        <Root />
      </Router>
    </ApiProvider>
  </StrictMode>
);
