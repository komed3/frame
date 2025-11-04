class VideoUploader {

    constructor () {

        this.container = document.querySelector( '.upload-container' );
        this.dropArea = this.container.querySelector( '.file-drop-area' );
        this.fileInput = this.container.querySelector( '[name="video"]' );
        this.preview = this.container.querySelector( '.video-preview' );
        this.previewPlayer = this.preview.querySelector( '.preview-player' );

        this.initEventHandlers();

    }

    initEventHandlers () {

        // Drag and drop events
        [ 'dragenter', 'dragover', 'dragleave', 'drop' ].forEach( event => {

            this.dropArea.addEventListener( event, e =>
                e.preventDefault() && e.stopPropagation()
            );

        } );

        [ 'dragenter', 'dragover' ].forEach( event => {

            this.dropArea.addEventListener( event, () => {
                this.dropArea.classList.add( 'dragover' );
            } );

        } );

        [ 'dragleave', 'drop' ].forEach( event => {

            this.dropArea.addEventListener( event, () => {
                this.dropArea.classList.remove( 'dragover' );
            } );

        } );

        // Handle file selection
        this.dropArea.addEventListener( 'drop', e => {

            const file = e.dataTransfer.files[ 0 ];

            if ( file && file.type.startsWith( 'video/' ) ) {
                this.handleFileSelect( file );
            }

        } );

        this.fileInput.addEventListener( 'change', e => {

            const file = e.target.files[ 0 ];

            if ( file ) this.handleFileSelect( file );

        } );

    }

    handleFileSelect ( file ) {

        this.preview.querySelector( '.file-name' ).textContent = file.name;

        // Create video preview
        const videoURL = URL.createObjectURL( file );
        this.previewPlayer.src = videoURL;
        this.previewPlayer.load();

        this.dropArea.classList.add( 'hidden' );
        this.preview.classList.remove( 'hidden' );

    }

}

// Initialize uploader when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoUploader() );
