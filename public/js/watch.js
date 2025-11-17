const rateVideo = async ( videoId, rate ) => {

    const res = await fetch( '/api/rate/' + videoId, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( { rating: rate } )
    } );

    if ( ! res.ok ) return;
    const { rating } = await res.json();

    for ( let i = 1; i <= 5; i++ ) {

        const star = document.querySelector( `[v="${ videoId }"][r="${ i }"]` );
        star.className = 'icon ';

        if ( i <= rating ) star.classList.add( 'icon-star-full' );
        else star.classList.add( 'icon-star' );

    }

};

document.addEventListener( 'DOMContentLoaded', function () {

    document.querySelectorAll( '[v][r]' ).forEach( ( el ) =>
        el.addEventListener( 'click', async () => await rateVideo(
            el.getAttribute( 'v' ), el.getAttribute( 'r' )
        ) )
    );

} );
