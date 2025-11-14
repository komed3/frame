const setRating = ( videoId, rating ) => {

    document.querySelectorAll( `.rating[id="${videoId}"]` ).forEach( ( el ) =>
        el.textContent = rating.toFixed( 1 )
    );

};

const likeVideo = async ( videoId ) => {

    const res = await fetch( '/api/like/' + videoId, { method: 'post' } );
    if ( ! res.ok ) return;

    const { rating } = await res.json();
    if ( ! isNaN( rating ) ) setRating( videoId, rating );

};

const dislikeVideo = async ( videoId ) => {

    const res = await fetch( '/api/dislike/' + videoId, { method: 'post' } );
    if ( ! res.ok ) return;

    const { rating } = await res.json();
    if ( ! isNaN( rating ) ) setRating( videoId, rating );

};

document.addEventListener( 'DOMContentLoaded', function () {

    document.querySelectorAll( '[action="like"]' ).forEach( ( el ) =>
        el.addEventListener( 'click', () => likeVideo( el.getAttribute( 'id' ) ) )
    );

    document.querySelectorAll( '[action="dislike"]' ).forEach( ( el ) =>
        el.addEventListener( 'click', () => dislikeVideo( el.getAttribute( 'id' ) ) )
    );

} );
