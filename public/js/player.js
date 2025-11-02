class VideoPlayer {

    bindings = [
        ' ', 'k', 'K'
    ];

    constructor () {

        this.container = document.getElementById( 'player' );
        this.video = this.container.querySelector( 'video' );
        this.controls = this.initControls();

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

        this.controls.play.addEventListener( 'click', this.play.bind( this ) );
        this.controls.pause.addEventListener( 'click', this.pause.bind( this ) );

    }

    initKeyBindings () {

        document.addEventListener( 'keydown', ( e ) => {

            if ( e.target.tagName === 'input' || ! this.bindings.includes( e.key ) ) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            switch ( e.key ) {

                case ' ': case 'k': case 'K':
                    this.togglePlay();
                    break;

            }

        } );

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

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
