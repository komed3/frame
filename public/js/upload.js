class VideoUploader {

    constructor () {

        this.form = document.querySelector( '.frame-upload' );
        this.dropArea = this.form.querySelector( '.frame-upload--file-drop' );
        this.fileInput = this.dropArea.querySelector( 'input' );
        this.preview = this.form.querySelector( '.frame-upload--file-preview' );
        this.video = this.preview.querySelector( 'video' );
        this.fileInfo = this.form.querySelector( '.frame-upload--file-info' );
        this.progressIndicator = this.form.querySelector( '.frame-upload--progress-indicator' );
        this.progressLabel = this.form.querySelector( '.frame-upload--progress-label' );
        this.progressMessage = this.form.querySelector( '.frame-upload--progress-message' );
        this.errorMsg = this.form.querySelector( '.frame-upload--error-message' );

        this.isUploading = false;
        this.errorTimeout = null;

        this.initEventListener();

    }

    initEventListener () {

        // File upload
        this.fileInput.addEventListener( 'change', this.handleFileSelect.bind( this ) );
        this.preview.querySelector( '.change-file' ).addEventListener( 'click', this.clearFileSelect.bind( this ) );

        // Form actions
        this.form.addEventListener( 'submit', this.submit.bind( this ) );
        this.form.addEventListener( 'reset', this.reset.bind( this ) );

        // Prevent page exit
        window.addEventListener( 'beforeunload', e => {
            if ( this.isUploading ) { e.preventDefault(); return; }
        } );

    }

    handleFileSelect ( e ) {

        const file = e.target.files[ 0 ];

        if ( ! file || ! file.type.startsWith( 'video/' ) ) return;

        // Show preview
        this.video.src = URL.createObjectURL( file );
        this.video.load();
        this.dropArea.classList.add( 'hidden' )
        this.preview.classList.remove( 'hidden' );

        // Get file meta
        this.fileInfo.querySelector( '.name' ).textContent = file.name;
        this.fileInfo.querySelector( '.size' ).textContent = formatFileSize( file.size );
        this.fileInfo.querySelector( '.type' ).textContent = file.type;

        // Get video meta
        this.video.addEventListener( 'loadedmetadata', () => {
            this.fileInfo.querySelector( '.duration' ).textContent = formatTime( this.video.duration );
            this.fileInfo.querySelector( '.resolution' ).textContent = `${this.video.videoWidth}px × ${this.video.videoHeight}px`;
        } );

    }

    clearFileSelect () {

        this.fileInput.value = '';

        // Clear video preview
        this.video.src = '';
        this.video.load();

        // Hide preview
        this.dropArea.classList.remove( 'hidden' );
        this.preview.classList.add( 'hidden' );

        // Reset file meta
        this.fileInfo.querySelectorAll( 'strong' ).forEach( el => el.textContent = '—' );

    }

    showError ( msg ) {

        this.form.classList.remove( 'processing' );
        this.form.classList.add( 'error' );
        this.errorMsg.textContent = msg;

        clearTimeout( this.errorTimeout );
        this.errorTimeout = setTimeout( () => {
            this.form.classList.remove( 'processing', 'error' );
            this.isUploading = false;
        }, 2500 );

    }

    setStatus ( pct, msg = null ) {

        this.progressIndicator.setProperty( '--progress', pct || 0 );
        this.progressLabel.textContent = Math.round( pct || 0 ) + '%';

        if ( msg ) this.progressMessage.textContent = msg;

    }

    handleServerLine ( obj ) {

        // obj is parsed JSON from server (NDJSON)
        if ( ! obj || typeof obj !== 'object' ) return;

        const msg = obj.msg || '';
        const pct = typeof obj.progress === 'number'
            ? Math.min( 100, Math.max( 0, obj.progress ) )
            : 0;

        // Set processing progress
        this.setStatus( pct, msg );

        // If processing is done, redirect to video page after short delay
        if ( obj.phase === 'done' && obj.videoId ) setTimeout(
            () => location.href = `/watch/${obj.videoId}`, 800
        );

    }

    async submit ( e ) {

        e.preventDefault();

        // Set uploading state
        if ( this.isUploading ) return;

        this.isUploading = true;
        this.form.classList.add( 'processing' );

        // Prepare form data
        const formData = new FormData( this.form );
        let lastIndex = 0;

        // Create XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.open( 'POST', '/api/upload', true );

        // Upload progress (client -> server)
        // Handle upload progress
        xhr.upload.onprogress = ( e ) => { if ( e.lengthComputable ) {
            this.setStatus( Math.round( ( e.loaded / e.total ) * 50 ) );
        } };

        // Streaming response parsing (server -> client)
        // Handle incoming data
        xhr.onprogress = () => {

            const text = xhr.responseText || '';
            const chunk = text.substring( lastIndex );
            const lines = chunk.split( '\n' );
            lastIndex = text.length;

            for ( const line of lines ) {

                if ( ! line.trim() ) continue;
                try { this.handleServerLine( JSON.parse( line ) ) }
                catch { /* ignore partial JSON */ }

            }

        };

        // Request completed
        xhr.onload = () => {

            this.isUploading = false;

            if ( xhr.status >= 200 && xhr.status < 300 ) {

                // In case server didn't send final done line, try parse remaining text
                const text = xhr.responseText || '';
                const lines = text.split( '\n' );

                for ( const line of lines ) {

                    if ( ! line.trim() ) continue;
                    try { this.handleServerLine( JSON.parse( line ) ) }
                    catch { /* ignore partial JSON */ }

                }

            }

            // Handle error response
            else { this.showError( 'Error: ' + xhr.status ) }

        };

        // Network error
        xhr.onerror = () => {
            this.isUploading = false;
            this.showError( 'Network Error' );
        };

        // Send the request
        xhr.send( formData );

    }

    reset () { this.clearFileSelect() }

}

// Initialize uploader when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoUploader() );
