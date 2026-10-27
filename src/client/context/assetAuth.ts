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
