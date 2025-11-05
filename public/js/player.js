class VideoPlayer {

    bindings = [
        'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'PageUp', 'PageDown', 'Home', 'End', 'F1', 'F6', 'F7', 'F8',
        'F9', 'F10', 'F11', 'f', 'F', 'k', 'K', 'm', 'M', 'j', 'J',
        'l', 'L', 'h', 'H', ' ', ',', '.', '+', '-', '0', '1', '2',
        '3', '4', '5', '6', '7', '8', '9'
    ];

    playbackSpeed = [ 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4 ];

    constructor () {

        this.player = document.getElementById( 'player' );
        this.container = document.querySelector( '.player-container' );
        this.videoContainer = this.container.querySelector( '.player-inner' );
        this.video = this.container.querySelector( 'video' );
        this.actionContainer = this.container.querySelector( '.action-container' );
        this.controls = this.initControls();
        this.overlay = this.initOverlay();

        this.speedIndex = 3;
        this.previousVolume = 1;
        this.frameRate = 30;
        this.controlsTimeout = null;
        this.overlayTimeout = null;

        this.initProgressBar();
        this.initEventHandlers();
        this.initKeyBindings();

    }

    initControls () {

        const controls = {};

        this.container.querySelectorAll( '[action]' ).forEach( el => {
            controls[ el.getAttribute( 'action' ) ] = el;
        } );

        return controls;

    }

    initOverlay () {

        const overlay = this.container.querySelector( '.player-overlay' );

        return {
            icon: overlay.querySelector( 'img' ),
            text: overlay.querySelector( 'span' )
        };

    }

    initProgressBar () {

        this.progress = this.container.querySelector( '.progress-container' );
        this.waveform = this.progress.querySelector( '.wave-container' );
        this.preview = this.progress.querySelector( '.hover-card .preview' );
        this.timeDisplay = this.container.querySelector( '.player-time' );
        let percent = 0;

        this.createWaveform();

        this.progress.addEventListener( 'mousemove', e => {

            const rect = this.progress.getBoundingClientRect();
            percent = ( e.clientX - rect.left ) / rect.width;

            this.progress.classList.add( 'hovered' );
            this.progress.style.setProperty( '--hover', percent * 100 + '%' );
            this.progress.querySelector( '.time-code' ).textContent = formatTime(
                this.video.duration * percent
            );

            const src = `${videoData.fileId}_${ Math.floor( percent * 100 ).toString().padStart( 4, '0' ) }.jpg`;
            if ( videoData.thumbnails && videoData.thumbnails.includes( src ) ) this.preview.style.setProperty(
                'background-image', `url( '/media/${videoData.videoId}/${src}' )`
            );

        } );

        this.progress.addEventListener( 'mouseleave', () => {

            this.progress.classList.remove( 'hovered' );
            this.progress.style.removeProperty( '--hover' );

        } );

        this.progress.addEventListener( 'click', () => this.seek( percent ) );

    }

    createWaveform () {

        if ( 'waveform' in videoData && videoData.waveform.length ) {

            videoData.waveform.forEach( v => {

                const el = document.createElement( 'div' );
                el.classList.add( 'bar' );
                el.style.setProperty( '--v', v + '%' );

                this.waveform.appendChild( el );

            } );

        }

    }

    initEventHandlers () {

        // Document event listener
        document.addEventListener( 'fullscreenchange', this.updateFullscreenBtn.bind( this ) );

        // Mouse actions
        this.container.addEventListener( 'mousemove', this.showControls.bind( this ) );
        this.container.addEventListener( 'mouseleave', this.hideControls.bind( this ) );
        this.actionContainer.addEventListener( 'dblclick', this.toggleFullscreen.bind( this ) );

        // Toggle dialogs / play/pause
        this.actionContainer.addEventListener( 'click', () => {

            if (
                this.container.classList.contains( 'show-settings' ) ||
                this.container.classList.contains( 'show-help' )
            ) this.container.classList.remove( 'show-settings', 'show-help' );

            else this.togglePlay();

        } );

        // Controls
        this.controls.play.addEventListener( 'click', this.play.bind( this ) );
        this.controls.pause.addEventListener( 'click', this.pause.bind( this ) );
        this.controls.begin.addEventListener( 'click', this.begin.bind( this ) );
        this.controls.rewind.addEventListener( 'click', () => this.skip( -5 ) );
        this.controls.fastForward.addEventListener( 'click', () => this.skip( 5 ) );
        this.controls.end.addEventListener( 'click', this.end.bind( this ) );
        this.controls.mute.addEventListener( 'click', this.mute.bind( this ) );
        this.controls.unmute.addEventListener( 'click', this.unmute.bind( this ) );
        this.controls.download.addEventListener( 'click', this.download.bind( this ) );
        this.controls.maximize.addEventListener( 'click', this.maximize.bind( this ) );
        this.controls.minimize.addEventListener( 'click', this.minimize.bind( this ) );
        this.controls.settings.addEventListener( 'click', this.toggleSettings.bind( this ) );
        this.controls.playbackRate.addEventListener( 'change', e => this.setSpeed( e.target.value ) )
        this.controls.help.addEventListener( 'click', this.toggleHelp.bind( this ) );

        // Change volume
        this.controls.volume.addEventListener( 'input', e => {

            this.setVolume( e.target.value );
            setTimeout( () => e.target.blur(), 10 );

        } );

        // Loading state
        this.video.addEventListener( 'waiting', this.showLoading.bind( this ) );
        this.video.addEventListener( 'canplay', this.hideLoading.bind( this ) );
        this.video.addEventListener( 'playing', this.hideLoading.bind( this ) );

        // Video state
        this.video.addEventListener( 'play', this.updatePlayBtn.bind( this ) );
        this.video.addEventListener( 'play', this.hideControls.bind( this ) );
        this.video.addEventListener( 'pause', this.updatePlayBtn.bind( this ) );
        this.video.addEventListener( 'pause', this.showControls.bind( this ) );
        this.video.addEventListener( 'ended', this.updatePlayBtn.bind( this ) );
        this.video.addEventListener( 'ended', this.showControls.bind( this ) );

        // Video events
        this.video.addEventListener( 'volumechange', this.updateVolume.bind( this ) );
        this.video.addEventListener( 'ratechange', this.updateSpeed.bind( this ) );

        // Time / loading update
        this.video.addEventListener( 'timeupdate', this.updateProgress.bind( this ) );
        this.video.addEventListener( 'loadedmetadata', this.updateTimeDisplay.bind( this ) );
        this.video.addEventListener( 'progress', this.updateBuffer.bind( this ) );

    }

    initKeyBindings () {

        document.addEventListener( 'keydown', e => {

            if ( e.target.tagName === 'INPUT' || ! this.bindings.includes( e.key ) ) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            switch ( e.key ) {

                case ' ': case 'k': case 'K': case 'F7':
                    this.togglePlay();
                    this.playOverlay();
                    break;

                case 'm': case 'M': case 'F9':
                    this.toggleMute();
                    this.volumeOverlay();
                    break;

                case 'PageUp':
                    this.changeVolume( 0.4 );
                    this.volumeOverlay();
                    break;

                case 'PageDown':
                    this.changeVolume( -0.4 );
                    this.volumeOverlay();
                    break;

                case 'ArrowUp':
                    this.changeVolume( 0.1 );
                    this.volumeOverlay();
                    break;

                case 'ArrowDown':
                    this.changeVolume( -0.1 );
                    this.volumeOverlay();
                    break;

                case 'ArrowLeft': case 'F6':
                    this.skip( -5 );
                    this.seekOverlay();
                    break;

                case 'ArrowRight': case 'F8':
                    this.skip( 5 );
                    this.seekOverlay();
                    break;

                case 'j': case 'J':
                    this.skip( -10 );
                    this.seekOverlay();
                    break;

                case 'l': case 'L':
                    this.skip( 10 );
                    this.seekOverlay();
                    break;

                case 'Home':
                    this.begin();
                    this.seekOverlay();
                    break;

                case 'End':
                    this.end();
                    this.seekOverlay();
                    break;

                case ',':
                    this.skipFrame( -1 );
                    break;

                case '.':
                    this.skipFrame( 1 );
                    break;

                case '+':
                    this.changeSpeed( 1 );
                    this.speedOverlay();
                    break;

                case '-':
                    this.changeSpeed( -1 );
                    this.speedOverlay();
                    break;

                case 'F10':
                    this.setSpeed( 3 );
                    this.speedOverlay();
                    break;

                case '0': case '1': case '2': case '3': case '4':
                case '5': case '6': case '7': case '8': case '9':
                    this.seek( Number( e.key ) * 10 );
                    this.seekOverlay();
                    break;

                case 'F11': case 'f': case 'F':
                    this.toggleFullscreen();
                    break;

                case 'Escape':
                    this.minimize();
                    break;

                case 'h': case 'H': case 'F1':
                    this.toggleHelp();
                    break;

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

        if ( ! this.video.paused ) {
            this.container.classList.remove( 'show-controls' );
        }

    }

    showLoading () { this.container.classList.add( 'show-spinner' ) }

    hideLoading () { this.container.classList.remove( 'show-spinner' ) }

    showOverlay ( icon, text ) {

        this.overlay.icon.src = '/images/icons/' + icon + '.svg';
        this.overlay.text.textContent = text;

        this.container.classList.add( 'show-overlay' );
        clearTimeout( this.overlayTimeout );

        this.overlayTimeout = setTimeout(
            () => this.container.classList.remove( 'show-overlay' ), 800
        );

    }

    updateProgress () {

        const percent = ( this.video.currentTime / this.video.duration ) * 100;
        this.progress.style.setProperty( '--progress', percent + '%' );

        this.updateTimeDisplay();

    }

    updateBuffer () {

        if ( this.video.buffered.length > 0 ) {

            const bufferedEnd = this.video.buffered.end( this.video.buffered.length - 1 );
            const duration = this.video.duration;
            const percent = ( bufferedEnd / duration ) * 100;

            this.progress.style.setProperty( '--buffer', percent + '%' );

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

    playOverlay () {

        if ( this.video.paused ) this.showOverlay( 'pause', 'Video paused' );
        else this.showOverlay( 'play', 'Video started' );

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

        this.video.volume = this.previousVolume || 1;

    }

    toggleMute () {

        if ( this.isMuted() ) this.unmute();
        else this.mute();

    }

    changeVolume ( value ) {

        this.video.volume = Number( Math.max( 0, Math.min( 1, this.video.volume + value ) ).toFixed( 1 ) );
        this.previousVolume = this.video.volume;

    }

    setVolume ( value ) {

        this.video.volume = Number( Math.max( 0, Math.min( 1, value / 100 ) ).toFixed( 1 ) );
        this.previousVolume = this.video.volume;

    }

    volumeOverlay () {

        if ( this.isMuted() ) this.showOverlay( 'mute', 'Player muted' );
        else this.showOverlay( 'volume', Math.round( this.video.volume * 100 ) + '%' );

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

    seek ( value ) {

        this.video.currentTime = this.video.duration * Math.max( 0, Math.min(
            1, value > 1 ? value / 100 : value
        ) );

    }

    seekOverlay () { this.showOverlay( 'fastForward', 'Skip to ' + formatTime( this.video.currentTime ) ) }

    changeSpeed ( value ) {

        this.setSpeed( Math.max( 0, Math.min(
            this.playbackSpeed.length - 1,
            this.speedIndex + value
        ) ) );

    }

    setSpeed ( index ) {

        this.video.playbackRate = this.playbackSpeed[ index ] || 1;
        this.speedIndex = this.playbackSpeed.indexOf( this.video.playbackRate );

    }

    updateSpeed () { this.controls.playbackRate.value = this.speedIndex }

    speedOverlay () { this.showOverlay( 'clock', `Playback rate: ${ this.playbackSpeed[ this.speedIndex ] }x` ) }

    isFullscreen () {

        return document.fullscreenElement ||
               document.webkitFullscreenElement ||
               document.mozFullScreenElement;

    }

    updateFullscreenBtn () {

        const fs = !! this.isFullscreen();

        this.controls.maximize.disabled = fs;
        this.controls.minimize.disabled = ! fs;

        if ( fs ) this.showOverlay( 'maximize', 'Video in full screen' );
        else this.showOverlay( 'minimize', 'Leave full screen' );

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

    toggleSettings () {

        this.container.classList.remove( 'show-help' );
        this.container.classList.toggle( 'show-settings' );

    }

    toggleHelp () {

        this.container.classList.remove( 'show-settings' );
        this.container.classList.toggle( 'show-help' );

    }

    download () {

        const videoSrc = this.video.currentSrc;
        const anchor = document.createElement( 'a' );

        anchor.href = videoSrc;
        anchor.download = 'video.mp4';
        anchor.target = '_blank';
        anchor.click();

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
