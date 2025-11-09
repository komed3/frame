class VideoPlayer {

    constructor () {

        this.player = document.querySelector( '.video-wrapper' );
        this.videoId = this.player.getAttribute( 'videoId' );

        this.videoData = {};
        this.loaded = false;
        this.loadMeta();

    }

    async loadMeta () {

        try {

            const res = await fetch( '/api/video/' + this.videoId, {
                method: 'get',
                headers: { 'Content-Type': 'application/json' }
            } );

            if ( ! res.ok ) throw new Error( res.status );

            this.videoData = await res.json();
            this.loaded = true;

        } catch ( err ) { throw new Error( err ) }

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
