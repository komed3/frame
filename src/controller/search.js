import { searchIndex } from '../utils/search.js';

export async function search ( req, res ) {

    const query = req.query.q || '';

    if ( ! query ) { res.redirect( '/' ) } else {

        const sort = req.query.sort || 'relevance';
        const order = req.query.order || 'desc';
        const offset = parseInt( req.query.offset ) || 0;
        const limit = parseInt( req.query.limit ) || 24;

        const filters = {};
        if ( req.query.author ) filters.author = req.query.author;
        if ( req.query.category ) filters.category = req.query.category;
        if ( req.query.tag ) filters.tag = req.query.tag;
        if ( req.query.year ) filters.year = req.query.year;

        const authors = await searchIndex.getAuthors();
        const categories = await searchIndex.getCategories();
        const tags = await searchIndex.getTags();
        const years = await searchIndex.getYears();
        const pgs = await searchIndex.getPGs();
        const langs = await searchIndex.getLangs();

        const result = await searchIndex.search( query, {
            filters, sort, order, offset, limit
        } );

        res.render( 'search', {
            title: req.t( 'views.search.title' ),
            path: '/search', template: 'search',
            query, filters, sort, order, ...result,
            authors, categories, tags, years, pgs, langs
        } );

    }

}
