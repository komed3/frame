import { searchIndex } from '../utils/search.js';

export async function search ( req, res ) {

    const authors = await searchIndex.getAuthors();
    const categories = await searchIndex.getCategories();
    const tags = await searchIndex.getTags();
    const years = await searchIndex.getYears();
    const pgs = await searchIndex.getPGs();
    const langs = await searchIndex.getLangs();

    res.render( 'search', {
        title: req.t( 'views.search.title' ),
        path: '/search', template: 'search',
        authors, categories, tags, years, pgs, langs
    } );

}
