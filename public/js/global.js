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

const formatUnit = ( value, digits = 1, unit = '', f = 1000 ) => {

    const units = [ '', 'k', 'M', 'G', 'T' ];
    let i = 0;

    while ( value >= f && i < units.length - 1 ) value /= f, i++;

    return `${ new Intl.NumberFormat( lang, {
        maximumFractionDigits: digits
    } ).format( value ) } ${ units[ i ] }${unit}`;

};

const formatFileSize = ( bytes, digits = 1 ) => formatUnit( bytes, digits, 'B', 1024 );
const formatFrequency = ( hz, digits = 1 ) => formatUnit( hz, digits, 'Hz' );
const formatBitrate = ( rate, digits = 1 ) => formatUnit( rate, digits, 'b/s' );

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
