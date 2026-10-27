const tokens = new Map();

self.addEventListener( 'install', e => e.waitUntil( self.skipWaiting() ) );
self.addEventListener( 'activate', e => e.waitUntil( self.clients.claim() ) );

self.addEventListener( 'message', e => {
  if ( e.data?.type !== 'FRAME_AUTH' || ! e.source?.id ) return;
  const clientId = e.source.id;

  if ( e.data.token ) tokens.set( clientId, e.data.token );
  else tokens.delete( clientId );

  e.ports[ 0 ]?.postMessage( { ready: true } );
} );
