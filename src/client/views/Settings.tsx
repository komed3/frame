import { Select, type SelectOption } from '@/src/client/components/Select';
import { useApi } from '@/src/client/context/ApiContext';
import { useUserPrefs } from '@/src/client/hooks/useUserPrefs';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { PrefValue } from '@/src/shared/types/pref';
import { useState } from 'react';


const LANGUAGE_OPTIONS: SelectOption[] = [ { value: 'en', label: 'English' } ];
const THEME_OPTIONS: SelectOption[] = [ { value: 'dark', label: 'Dark' } ];


export function Settings () {
  const { prefs } = useApi();

  const [ resetting, setResetting ] = useState( false );
  const [ error, setError ] = useState< string | null >( null );

  const [ [ language = 'en', theme = 'dark' ], setPref ] = useUserPrefs( [ 'APP_LANGUAGE', 'APP_THEME' ] );
  usePageTitle( 'Settings' );


  const reset = async () => {
    setResetting( true ), setError( null );

    try {
      await prefs.resetAll();
      window.location.reload();
    } catch ( err ) {
      setError( err instanceof Error ? err.message : 'Could not reset settings.' );
      setResetting( false );
    }
  };


  return (
    <></>
  );
}
