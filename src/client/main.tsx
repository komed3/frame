import { App } from '@/src/client/App';
import { ApiProvider } from '@/src/client/context/ApiContext';
import { initializeAssetAuth } from '@/src/client/context/assetAuth';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router';

import '@/src/client/index.css';


async function start () {
  await initializeAssetAuth();

  createRoot( document.getElementById( 'root' )! ).render(
    <StrictMode>
      <ApiProvider>
        <Router>
          <App />
        </Router>
      </ApiProvider>
    </StrictMode>
  );
}


start().catch( err => console.error( '[Frame] Failed to initialize:', err ) );
