class VideoPlayer {

    constructor () {

        this.player = document.querySelector( '.video-wrapper' );
        this.video = this.player.querySelector( 'video' );

        this.videoId = this.player.getAttribute( 'videoId' );
        this.videoDir = '/media/' + this.videoId + '/';
        this.videoBlob = null;
        this.videoObjectUrl = null;
        this.videoData = {};

        this.loaded = false;
        this.ready = false;

        this.loadMeta().then( this.initPlayer.bind( this ) );

    }

    async loadMeta () {

        if ( this.loaded ) return;

        try {

            const res = await fetch( '/api/video/' + this.videoId, {
                method: 'post', headers: { 'Content-Type': 'application/json' }
            } );

            if ( ! res.ok ) throw new Error( 'Error fetching video data' );

            this.videoData = await res.json();
            this.loaded = true;

        } catch ( err ) { throw new Error( err ) }

    }

    async fetchStream () {

        if ( this.videoBlob || this.videoObjectUrl ) return;

        try {

            const res = await fetch( this.videoDir + this.videoData.fileName );

            if ( ! res.ok ) throw new Error( 'Failed to fetch the video' );

            this.videoBlob = await res.blob();
            this.videoObjectUrl = URL.createObjectURL( this.videoBlob );

        } catch ( err ) { throw new Error( err ) }

    }

    async initPlayer () {

        if ( this.ready ) return;
        if ( ! this.loaded ) await this.loadMeta();

        await this.fetchStream();

        this.video.src = this.videoObjectUrl;
        this.video.poster = this.videoDir + 'poster.jpg';
        this.video.load();

        this.ready = true;

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
