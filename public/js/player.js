class VideoPlayer {

    constructor () {

        this.container = document.getElementById( 'player' );
        this.video = this.container.querySelector( 'video' );
        this.controls = this.initControls();

        this.initEventHandlers();

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

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
