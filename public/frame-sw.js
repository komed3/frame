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

self.addEventListener( 'fetch', e => {
  const { request: r, clientId } = e, url = new URL( r.url );
  if ( r.method !== 'GET' || url.origin !== self.location.origin || ! /^\/api\/(?:assets|stream)\//.test( url.pathname ) ) return;

  const token = tokens.get( clientId );
  if ( ! token ) return;

  const headers = new Headers( r.headers );
  headers.set( 'Authorization', `Bearer ${ token }` );

  e.respondWith( fetch( new Request( r, { headers } ) ) );
} );
