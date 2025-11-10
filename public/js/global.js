const lang = document.documentElement.getAttribute( 'lang' );
const template = document.documentElement.getAttribute( 'template' );

function throttle ( fnc, limit ) {

    let throttled;

    return function ( ...args ) {

        if ( ! throttled ) {

            fnc.apply( this, args );
            throttled = true;

            setTimeout( () => throttled = false, limit );

        }

    };

}

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

    return `${ new Intl.NumberFormat( lang, {
        maximumFractionDigits: digits
    } ).format( bytes ) } ${ units[ i ] }`;

};

const formatViews = ( views ) => {

    return new Intl.NumberFormat( 'en-US', {
        notation: 'compact', compactDisplay: 'short'
    } ).format( views );

}

document.addEventListener( 'DOMContentLoaded', function () {

    document.querySelectorAll( 'time' ).forEach(
        el => el.textContent = formatTime( el.textContent )
    );

    document.querySelectorAll( 'filesize' ).forEach(
        el => el.textContent = formatFileSize( el.textContent )
    );

    document.querySelectorAll( 'views' ).forEach(
        el => el.textContent = formatViews( el.textContent )
    );

} );
