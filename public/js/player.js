class VideoPlayer {

    constructor () {

        this.container = document.getElementById( 'player' );
        this.video = this.container.querySelector( 'video' );

        this.controls = this.#initControls();

    }

    #initControls () {

        const controls = {};

        this.container.querySelectorAll( '.player-controls [action]' ).forEach( el => {
            controls[ el.getAttribute( 'action' ) ] = el;
        } );

        return controls;

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
