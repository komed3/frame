const formatTime = ( seconds ) => {

    if ( isNaN( seconds ) ) return '00:00';

    const h = Math.floor( seconds / 3600 );
    const m = Math.floor( ( seconds % 3600 ) / 60 );
    const s = Math.floor( seconds % 60 );

    return ( h > 0 ? h.toString().padStart( 2, '0' ) + ':' : '' ) +
           m.toString().padStart( 2, '0' ) + ':' +
           s.toString().padStart( 2, '0' );

};
