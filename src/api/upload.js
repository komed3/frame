import {} from '../utils/config.js';
import {} from '../utils/search.js';
import { uploadVideo } from '../utils/video.js';

export async function upload ( req, res ) {

    uploadVideo( req, res, async ( err ) => {

        // Error while uploading
        if ( err ) return res.status( 400 ).json( { success: false, message: req.t( 'error.upload.upload', { msg: err.message } ) } );
        if ( ! req.file ) return res.status( 400 ).json( { success: false, message: req.t( 'error.upload.noFile' ) } );

        // Prepare streaming (send NDJSON lines)
        res.setHeader( 'Content-Type', 'application/x-ndjson; charset=utf-8' );
        res.setHeader( 'Cache-Control', 'no-cache' );
        res.flushHeaders && res.flushHeaders();

        // Send progress
        const sendProgress = ( obj ) => {
            try { res.write( JSON.stringify( obj ) + '\n' ) }
            catch ( e ) { /* ignore */ }
        };

    } );

}
