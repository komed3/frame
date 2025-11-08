const formatTime = ( seconds, includeHrs = false ) => {

    if ( isNaN( seconds ) ) return '00:00';

    const h = Math.floor( seconds / 3600 );
    const m = Math.floor( seconds % 3600 / 60 );
    const s = Math.floor( seconds % 60 );

    return ( h > 0 || includeHrs ? h.toString().padStart( 2, '0' ) + ':' : '' ) +
        m.toString().padStart( 2, '0' ) + ':' + s.toString().padStart( 2, '0' );

};

const formatFileSize = ( bytes, digits = 1 ) => {

    const units = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
    let i = 0;

    while ( bytes >= 1024 && i < units.length - 1 ) bytes /= 1024, i++;

    return `${ new Intl.NumberFormat( 'en-US', {
        maximumFractionDigits: digits
    } ).format( bytes ) } ${ units[ i ] }`;

};
