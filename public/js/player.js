class VideoPlayer {

    bindings = [
        'F11', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'f', 'F', 'k', 'K', 'm', 'M', ' ', ',', '.', 'Home', 'End'
    ];

    constructor () {

        this.player = document.getElementById( 'player' );
        this.container = document.querySelector( '.player-container' );
        this.videoContainer = this.container.querySelector( '.player-inner' );
        this.video = this.container.querySelector( 'video' );
        this.actionContainer = this.container.querySelector( '.action-container' );
        this.controls = this.initControls();

        this.previousVolume = 1;
        this.controlsTimeout = null;
        this.frameRate = 30;

        this.initProgressBar();
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

    initProgressBar () {

        this.progress = this.container.querySelector( '.progress-container' );
        this.progressBar = this.container.querySelector( '.progress-bar' );
        this.bufferBar = this.container.querySelector( '.buffer-bar' );
        this.timeDisplay = this.container.querySelector( '.player-time' );

    }

    initEventHandlers () {

        // Document event listener
        document.addEventListener( 'fullscreenchange', this.updateFullscreenBtn.bind( this ) );

        // Mouse actions
        this.container.addEventListener( 'mousemove', this.showControls.bind( this ) );
        this.container.addEventListener( 'mouseleave', this.hideControls.bind( this ) );
        this.actionContainer.addEventListener( 'click', this.togglePlay.bind( this ) );
        this.actionContainer.addEventListener( 'dblclick', this.toggleFullscreen.bind( this ) );

        // Controls
        this.controls.play.addEventListener( 'click', this.play.bind( this ) );
        this.controls.pause.addEventListener( 'click', this.pause.bind( this ) );
        this.controls.begin.addEventListener( 'click', this.begin.bind( this ) );
        this.controls.rewind.addEventListener( 'click', () => this.skip( -5 ) );
        this.controls.fastForward.addEventListener( 'click', () => this.skip( 5 ) );
        this.controls.end.addEventListener( 'click', this.end.bind( this ) );
        this.controls.mute.addEventListener( 'click', this.mute.bind( this ) );
        this.controls.unmute.addEventListener( 'click', this.unmute.bind( this ) );
        this.controls.volume.addEventListener( 'input', ( e ) => this.changeVolume( e.target.value ) );
        this.controls.maximize.addEventListener( 'click', this.maximize.bind( this ) );
        this.controls.minimize.addEventListener( 'click', this.minimize.bind( this ) );

        // Loading state
        this.video.addEventListener( 'waiting', this.showLoading.bind( this ) );
        this.video.addEventListener( 'canplay', this.hideLoading.bind( this ) );
        this.video.addEventListener( 'playing', this.hideLoading.bind( this ) );

        // Video state
        this.video.addEventListener( 'play', this.updatePlayBtn.bind( this ) );
        this.video.addEventListener( 'pause', this.updatePlayBtn.bind( this ) );
        this.video.addEventListener( 'pause', this.showControls.bind( this ) );
        this.video.addEventListener( 'ended', this.updatePlayBtn.bind( this ) );
        this.video.addEventListener( 'ended', this.showControls.bind( this ) );

        // Video events
        this.video.addEventListener( 'volumechange', this.updateVolume.bind( this ) );

        // Time / loading update
        this.video.addEventListener( 'timeupdate', this.updateProgress.bind( this ) );
        this.video.addEventListener( 'loadedmetadata', this.updateTimeDisplay.bind( this ) );
        this.video.addEventListener( 'progress', this.updateBuffer.bind( this ) );

    }

    initKeyBindings () {

        document.addEventListener( 'keydown', e => {

            if ( e.target.tagName === 'input' || ! this.bindings.includes( e.key ) ) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            switch ( e.key ) {

                case ' ': case 'k': case 'K': this.togglePlay(); break;
                case 'm': case 'M': this.toggleMute(); break;
                case 'ArrowLeft': this.skip( -5 ); break;
                case 'ArrowRight': this.skip( 5 ); break;
                case 'Home': this.begin(); break;
                case 'End': this.end(); break;
                case ',': this.skipFrame( -1 ); break;
                case '.': this.skipFrame( 1 ); break;
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

    showLoading () {

        this.container.classList.add( 'show-spinner' );

    }

    hideLoading () {

        this.container.classList.remove( 'show-spinner' );

    }

    updateProgress () {

        const percent = ( this.video.currentTime / this.video.duration ) * 100;
        this.progressBar.style.setProperty( '--width', percent + '%' );

        this.updateTimeDisplay();

    }

    updateBuffer () {

        if ( this.video.buffered.length > 0 ) {

            const bufferedEnd = this.video.buffered.end( this.video.buffered.length - 1 );
            const duration = this.video.duration;
            const percent = ( bufferedEnd / duration ) * 100;
            this.bufferBar.style.setProperty( '--width', percent + '%' );

        }

    }

    updateTimeDisplay () {

        const current = formatTime( this.video.currentTime );
        const duration = formatTime( this.video.duration );
        this.timeDisplay.textContent = `${current} / ${duration}`;

    }

    updatePlayBtn () {

        this.controls.play.disabled = ! this.video.paused;
        this.controls.pause.disabled = this.video.paused;

    }

    async play () { await this.video.play() }

    pause () { this.video.pause() }

    async togglePlay () {

        if ( this.video.paused ) await this.play();
        else this.pause();

    }

    isMuted () { return ! this.video.volume > 0 }

    updateVolume () {

        const muted = this.isMuted();
        const volume = this.video.volume * 100;

        this.controls.mute.disabled = muted;
        this.controls.unmute.disabled = ! muted;

        this.controls.volume.value = volume;
        this.controls.volume.style.setProperty( '--width', volume + '%' );

    }

    mute () {

        if ( this.isMuted() ) return;

        this.previousVolume = this.video.volume;
        this.video.volume = 0;

    }

    unmute () {

        if ( ! this.isMuted() ) return;

        this.video.volume = this.previousVolume;

    }

    toggleMute () {

        if ( this.isMuted() ) this.unmute();
        else this.mute();

    }

    changeVolume ( value ) {

        this.video.volume = Math.max( 0, Math.min( 1, value / 100 ) );
        if ( this.video.volume > 0 ) this.previousVolume = this.video.volume;

    }

    begin () { this.video.currentTime = 0 }

    end () { this.video.currentTime = this.video.duration }

    skip ( seconds ) {

        this.video.currentTime = Math.max( 0, Math.min(
            this.video.duration,
            this.video.currentTime + seconds
        ) );

    }

    skipFrame ( frames ) {

        const frameTime = 1 / this.frameRate;

        this.pause();
        this.video.currentTime = Math.max( 0, Math.min(
            this.video.duration,
            this.video.currentTime + ( frameTime * frames )
        ) );

    }

    isFullscreen () {

        return document.fullscreenElement ||
               document.webkitFullscreenElement ||
               document.mozFullScreenElement;

    }

    updateFullscreenBtn () {

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
