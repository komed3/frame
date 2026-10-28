import { useApi } from '@/src/client/context/ApiContext';
import type { ApiDirectoryListResult } from '@/src/shared/types/api';
import type { MediaRecord } from '@/src/shared/types/media';
import type { CategoryRecord, TagRecord } from '@/src/shared/types/taxonomy';
import { useState } from 'react';
import { useNavigate } from 'react-router';


export function TextViewer ( { media }: { media: MediaRecord } ) {
  const { stream, media: mediaApi, directories } = useApi();
  const navigate = useNavigate();

  const [ content, setContent ] = useState( '' );
  const [ categories, setCategories ] = useState< CategoryRecord[] >( [] );
  const [ tags, setTags ] = useState< TagRecord[] >( [] );
  const [ directory, setDirectory ] = useState< ApiDirectoryListResult | null >( null );
  const [ loading, setLoading ] = useState( true );
  const [ error, setError ] = useState< string | null >( null );


  return (
    <></>
  );
}
