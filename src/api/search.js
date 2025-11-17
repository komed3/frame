import { searchIndex } from '../utils/search.js';

export async function search ( req, res ) {

    const query = req.body.q || '';
    const sort = req.body.sort || 'relevance';
    const order = req.body.order || 'desc';
    const offset = Math.max( parseInt( req.body.offset ) || 0, 0 );
    const limit = Math.min( parseInt( req.body.limit ) || 24, 96 );

    const filters = {};
    if ( req.body.author ) filters.author = req.body.author;
    if ( req.body.category ) filters.category = req.body.category;
    if ( req.body.tag ) filters.tag = req.body.tag;
    if ( req.body.year ) filters.year = req.body.year;

    try { res.status( 200 ).json( await searchIndex.search( query, {
        filters, sort, order, offset, limit
    } ) ) }

    catch ( err ) { res.status( 500 ).json( {
        msg: req.t( 'error.search' ), err
    } ) }

}
