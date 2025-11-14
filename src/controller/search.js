import { searchIndex } from '../utils/search.js';

export async function search ( req, res ) {

    const query = req.query.q || '';
    const sort = req.query.sort || 'relevance';
    const order = req.query.order || 'desc';
    const offset = parseInt( req.query.offset ) || 0;
    const limit = parseInt( req.query.limit ) || 24;

    const filters = {};

    const authors = await searchIndex.getAuthors();
    const categories = await searchIndex.getCategories();
    const tags = await searchIndex.getTags();
    const years = await searchIndex.getYears();

    res.render( 'search', {
        title: req.t( 'views.search.title' ),
        path: '/search', template: 'search',
        query, filters, sort, order,
        authors, categories, tags, years
    } );

}
