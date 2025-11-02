class VideoPlayer {

    bindings = [
        ' ', 'F11', 'Escape',
        'f', 'F', 'k', 'K'
    ];

    constructor () {

        this.player = document.getElementById( 'player' );
        this.container = document.querySelector( '.player-container' );
        this.videoContainer = this.container.querySelector( '.player-inner' );
        this.video = this.container.querySelector( 'video' );
        this.controls = this.initControls();

        this.controlsTimeout = null;

        this.initEventHandlers();
        this.initKeyBindings();

    }

    initControls () {

        const controls = {};

        this.container.querySelectorAll( '.player-controls [action]' ).forEach( el => {
            controls[ el.getAttribute( 'action' ) ] = el;
        } );

        return controls;

    }

    initEventHandlers () {

        document.addEventListener( 'fullscreenchange', this.toggleFullscreenBtn.bind( this ) );

        this.container.addEventListener( 'mousemove', this.showControls.bind( this ) );
        this.container.addEventListener( 'mouseleave', this.hideControls.bind( this ) );

        this.controls.play.addEventListener( 'click', this.play.bind( this ) );
        this.controls.pause.addEventListener( 'click', this.pause.bind( this ) );
        this.controls.maximize.addEventListener( 'click', this.maximize.bind( this ) );
        this.controls.minimize.addEventListener( 'click', this.minimize.bind( this ) );

    }

    initKeyBindings () {

        document.addEventListener( 'keydown', ( e ) => {

            if ( e.target.tagName === 'input' || ! this.bindings.includes( e.key ) ) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            switch ( e.key ) {

                case ' ': case 'k': case 'K': this.togglePlay(); break;
                case 'F11': case 'f': case 'F': this.toggleFullscreen(); break;
                case 'Escape': this.minimize(); break;

            }

        } );

    }

    showControls () {

        this.container.classList.add( 'show-controls' );
        clearTimeout( this.controlsTimeout );

        if ( ! this.video.paused ) this.controlsTimeout = setTimeout(
            this.hideControls.bind( this ), 3000
        );

    }

    hideControls() {

        if ( ! this.video.paused ) this.container.classList.remove( 'show-controls' );

    }

    async play () {

        await this.video.play();

        this.controls.play.disabled = true;
        this.controls.pause.disabled = false;

    }

    pause () {

        this.video.pause();

        this.controls.play.disabled = false;
        this.controls.pause.disabled = true;

    }

    async togglePlay () {

        if ( this.video.paused ) await this.play();
        else this.pause();

    }

    isFullscreen () {

        return document.fullscreenElement ||
               document.webkitFullscreenElement ||
               document.mozFullScreenElement;

    }

    toggleFullscreenBtn () {

        const fs = !! this.isFullscreen();

        this.controls.maximize.disabled = fs;
        this.controls.minimize.disabled = ! fs;

    }

    async maximize () {

        if ( this.isFullscreen() ) return;

        const vc = this.videoContainer;

        if ( vc.requestFullscreen ) await vc.requestFullscreen();
        else if ( vc.webkitRequestFullscreen ) await vc.webkitRequestFullscreen();
        else if ( vc.mozRequestFullScreen ) await vc.mozRequestFullScreen();

    }

    async minimize () {

        if ( ! this.isFullscreen() ) return;

        if ( document.exitFullscreen ) await document.exitFullscreen();
        else if ( document.webkitExitFullscreen ) await document.webkitExitFullscreen();
        else if ( document.mozCancelFullScreen ) await document.mozCancelFullScreen();

    }

    async toggleFullscreen () {

        if ( this.isFullscreen() ) await this.minimize();
        else await this.maximize();

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
