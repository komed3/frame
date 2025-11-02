class VideoPlayer {

    constructor () {

        this.container = document.getElementById( 'player' );
        this.video = this.container.querySelector( 'video' );

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
