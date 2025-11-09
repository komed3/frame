class VideoPlayer {

    constructor () {

        this.player = document.querySelector( '.video-wrapper' );
        this.video = this.player.querySelector( 'video' );

        this.videoId = this.player.getAttribute( 'videoId' );
        this.videoDir = '/media/' + this.videoId + '/';
        this.videoData = {};

        this.loaded = false;
        this.ready = false;

        this.loadMeta().then( this.initVideo.bind( this ) );

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

    async stream () {

        if ( this.ready ) return;

        const chunkSize = 512 * 1024;
        const res = await fetch( this.videoDir + this.videoData.fileName );
        const reader = res.body.getReader();

        const stream = new ReadableStream( { async pull( controller ) {

            let { done, value } = await reader.read();
            if ( done ) return controller.close();

            for ( let i = 0; i < value.length; i += chunkSize ) controller.enqueue(
                value.slice( i, i + chunkSize )
            );

        } } );

        const blob = await new Response( stream ).blob();
        const blobUrl = URL.createObjectURL( blob );
        this.video.src = blobUrl;

    }

    async initVideo () {

        if ( this.ready ) return;
        if ( ! this.loaded ) await this.loadMeta();

        await this.stream();

        this.video.poster = this.videoDir + 'poster.jpg';
        this.video.load();

        this.ready = true;

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
