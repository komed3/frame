const TOKEN_KEY = 'frame.session';
let ready: Promise< ServiceWorkerContainer > | null = null;


async function sendToken ( worker: ServiceWorker, token: string | null ) {
  const channel = new MessageChannel();

  await new Promise< void >( ( resolve, reject ) => {
    const timeout = window.setTimeout( () => reject(
      new Error( 'Frame Service Worker did not acknowledge authentication.' )
    ), 5000 );

    channel.port1.onmessage = e => {
      window.clearTimeout( timeout );
      channel.port1.close();

      if ( e.data?.ready ) resolve();
      else reject( new Error( 'Frame Service Worker authentication failed.' ) );
    };

    worker.postMessage( { type: 'FRAME_AUTH', token }, [ channel.port2 ] );
  } );
}


export function initializeAssetAuth () : Promise< ServiceWorkerContainer > {
  if ( ! ( 'serviceWorker' in navigator ) ) return Promise.reject( new Error( 'Service Workers are not supported.' ) );

  if ( ! ready ) ready = ( async () => {
    await navigator.serviceWorker.register( '/frame-sw.js' );
    await navigator.serviceWorker.ready;

    if ( ! navigator.serviceWorker.controller ) await new Promise< void >( resolve => {
      navigator.serviceWorker.addEventListener( 'controllerchange', () => resolve(), { once: true } );
    } );

    const controller = navigator.serviceWorker.controller;
    if ( ! controller ) throw new Error( 'Frame Service Worker is not controlling this page.' );

    await sendToken( controller, localStorage.getItem( TOKEN_KEY ) );
    return navigator.serviceWorker;
  } )();

  return ready;
}
