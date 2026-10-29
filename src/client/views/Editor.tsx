import { Loading } from '@/src/client/components/Loading';
import { NameInput } from '@/src/client/components/NameInput';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { NotFound } from '@/src/client/views/NotFound';
import type { MediaRecord } from '@/src/shared/types/media';
import type { MediaMetadataRecord } from '@/src/shared/types/metadata';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { ArrowLeftIcon, InfoIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import { type SubmitEvent, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';


interface EditorData {
  media: MediaRecord | null;
  metadata: MediaMetadataRecord[];
  tags: TagRecord[];
  categories: CategoryRecord[];
  allTags: TagRecord[];
  allCategories: CategoryRecord[];
}

interface MetadataDraft {
  key: string;
  value: string;
}


const INPUT =
  'w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded ' +
  'focus:outline-none focus:border-slate-500';

const BUTTON =
  'flex justify-center items-center gap-2 px-4 py-2 text-sm bg-slate-50/10 rounded ' +
  'transition-colors duration-100 hover:bg-slate-50/20 disabled:opacity-50';


function Field ( { label, children }: { label: string; children: ReactNode } ) {
  return (
    <label className= 'block space-y-1'>
      <span className= 'block text-sm text-slate-400'>{ label }</span>
      { children }
    </label>
  );
}


export function Editor () {
  const { media: mediaApi, tags: tagApi, categories: categoryApi, canEdit } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();


  const { data, loading, error } = useApiData< EditorData >( id ?? '', async () => {
    if ( ! id ) return Promise.resolve( {
      media: null, metadata: [], tags: [], categories: [], allTags: [], allCategories: []
    } );

    return Promise.all( [
      mediaApi.get( id ), mediaApi.metadata( id ), mediaApi.tags( id ), mediaApi.categories( id ),
      tagApi.list(), categoryApi.list()
    ] ).then( ( [ media, metadata, tags, categories, allTags, allCategories ] ) => ( {
      media, metadata, tags, categories, allTags, allCategories
    } ) );
  } );


  const [ title, setTitle ] = useState( '' );
  const [ description, setDescription ] = useState( '' );
  const [ creator, setCreator ] = useState( '' );
  const [ rating, setRating ] = useState( '' );
  const [ tagNames, setTagNames ] = useState< string[] >( [] );
  const [ categoryNames, setCategoryNames ] = useState< string[] >( [] );
  const [ metadata, setMetadata ] = useState< MetadataDraft[] >( [] );
  const [ saving, setSaving ] = useState( false );
  const [ saveError, setSaveError ] = useState< string | null >( null );

  const media = data?.media ?? null;


  usePageTitle( media ? `Edit: ${ media.title || media.fileName }` : 'Edit Media' );

  useEffect( () => {
    if ( ! data?.media ) return;

    setTitle( data.media.title ?? '' );
    setDescription( data.media.description ?? '' );
    setCreator( data.media.creator ?? '' );
    setRating( data.media.rating === null ? '' : String( data.media.rating ) );
    setTagNames( data.tags.map( tag => tag.name ) );
    setCategoryNames( data.categories.map( c => c.name ) );
    setMetadata( data.metadata.filter( i => i.source === 'manual' ).map(
      ( { key, value } ) => ( { key, value } )
    ) );
  }, [ data ] );


  const save = async ( event: SubmitEvent ) => {
    event.preventDefault();
    if ( ! id || ! media || saving ) return;

    setSaving( true ), setSaveError( null );

    try {
      await mediaApi.update( id, { title, description, creator, rating: rating === '' ? null : Number( rating ) } );
      const allTags = [ ...data!.allTags ], allCategories = [ ...data!.allCategories ];

      const tagIds = await Promise.all( tagNames.map( async n => {
        const existing = allTags.find( t => t.name.toLocaleLowerCase() === n.toLocaleLowerCase() );
        if ( existing ) return existing.id;

        const created = await tagApi.create( n );
        if ( created ) allTags.push( created );
        return created?.id;
      } ) );

      const categoryIds = await Promise.all( categoryNames.map( async n => {
        const existing = allCategories.find( c => c.name.toLocaleLowerCase() === n.toLocaleLowerCase() );
        if ( existing ) return existing.id;

        const created = await categoryApi.create( n );
        if ( created ) allCategories.push( created );
        return created?.id;
      } ) );

      await mediaApi.setTags( id, tagIds.filter( ( v ): v is string => v !== undefined ) );
      await mediaApi.setCategories( id, categoryIds.filter( ( v ): v is string => v !== undefined ) );

      const previous = data!.metadata.filter( i => i.source === 'manual' );
      const currentKeys = new Set( metadata.map( i => i.key.toLocaleLowerCase() ) );

      await Promise.all( previous
        .filter( i => ! currentKeys.has( i.key.toLocaleLowerCase() ) )
        .map( i => mediaApi.deleteMetadata( id, i.key ) )
      );

      await Promise.all( metadata.map( i => mediaApi.setMetadata( id, i.key, i.value ) ) );
      navigate( `/watch/${ id }` );
    } catch ( err ) {
      setSaveError( err instanceof Error ? err.message : 'Could not save media.' );
    } finally {
      setSaving( false );
    }
  };


  if ( ! id ) return <NotFound />;
  if ( loading ) return <Loading className= 'min-h-[50vh]' />;
  if ( error || ! media || ! canEdit ) return <NotFound />;


  return (
    <div className= 'mx-auto my-12 max-w-5xl px-6 space-y-12'>
      <div className= 'flex flex-wrap justify-between items-end gap-4'>
        <div className= 'space-y-3'>
          <div className= 'flex items-center gap-4'>
            <Link
              to= { `/watch/${ media.id }` }
              className= 'flex items-center gap-2 text-sm text-slate-400 hover:text-white'
            >
              <ArrowLeftIcon size= { 16 } />
              <span>Back to media</span>
            </Link>

            <span className= 'text-slate-600'>/</span>

            <p className= 'text-sm text-slate-400 break-all'>
              { media.path }
            </p>
          </div>

          <h1 className= 'text-2xl font-light tracking-wide'>
            Edit Media
          </h1>
        </div>

        <button
          type= 'submit'
          form= 'media-editor'
          disabled= { saving }
          className= { BUTTON }
        >
          <SaveIcon size= { 16 } />
          <span>{ saving ? 'Saving …' : 'Save changes' }</span>
        </button>
      </div>

      <form
        id= 'media-editor'
        onSubmit= { save }
        className= 'space-y-8'
      >
        <div className= 'p-6 space-y-5 bg-slate-800 rounded shadow-lg'>
          <h2 className= 'flex items-center gap-3 text-lg font-medium'>
            <InfoIcon size= { 18 } />
            <span>Media Information</span>
          </h2>

          <Field label= 'Title'>
            <input
              value= { title }
              onChange= { e => setTitle( e.target.value ) }
              className= { INPUT }
            />
          </Field>

          <Field label= 'Description'>
            <textarea
              value= { description }
              onChange= { e => setDescription( e.target.value ) }
              className= { `${ INPUT } min-h-32 resize-y` }
            />
          </Field>

          <Field label= 'Creator'>
            <input
              value= { creator }
              onChange= { e => setCreator( e.target.value ) }
              className= { INPUT }
            />
          </Field>

          <Field label= 'Rating'>
            <input
              type= 'number'
              min= '0'
              max= '10'
              step= '1'
              value= { rating }
              onChange= { e => setRating( e.target.value ) }
              placeholder= '0–10'
              className= { INPUT }
            />
          </Field>
        </div>
      </form>
    </div>
  );
}
