import { useApi } from '@/src/client/context/ApiContext';
import { useEffect } from 'react';


export function usePageTitle ( title: string ) {
  const { env } = useApi(), appName = env?.appName ?? 'Frame';
  useEffect( () => { document.title = title ? `${ title } — ${ appName }` : appName }, [ title, appName ] );
}
