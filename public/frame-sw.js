let token = null;


self.addEventListener( 'install', e => e.waitUntil( self.skipWaiting() ) );
self.addEventListener( 'activate', e => e.waitUntil( self.clients.claim() ) );

self.addEventListener( 'message', e => {
  if ( e.data?.type !== 'FRAME_AUTH' ) return;

  token = e.data.token ?? null;
  e.ports[ 0 ]?.postMessage( { ready: true } );
} );

self.addEventListener( 'fetch', e => {
  const { request: r } = e, url = new URL( r.url );

  if ( r.method !== 'GET' || url.origin !== self.location.origin || ! /^\/api\/(?:assets|stream)\//.test( url.pathname ) ) return;
  if ( ! token ) return;

  const headers = new Headers( r.headers );
  headers.set( 'Authorization', `Bearer ${ token }` );

  e.respondWith( fetch( new Request( r, { headers } ) ) );
} );
