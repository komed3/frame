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
    <div className= 'mx-auto my-12 max-w-5xl px-6 space-y-8'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Settings
      </h1>

      <div className= 'p-6 space-y-6 bg-slate-800 rounded shadow-lg'>
        <h2 className= 'text-lg font-medium'>
          Application
        </h2>

        <div className= 'grid grid-cols-1 sm:grid-cols-2 gap-6'>
          <Select
            label= 'Language'
            value= { language }
            options= { LANGUAGE_OPTIONS }
            onChange= { v => setPref( 'APP_LANGUAGE', v as PrefValue< 'APP_LANGUAGE' > ) }
          />

          <Select
            label= 'Theme'
            value= { theme }
            options= { THEME_OPTIONS }
            onChange= { v => setPref( 'APP_THEME', v as PrefValue< 'APP_THEME' > ) }
          />
        </div>

        { error && (
          <p role= 'alert' className= 'text-sm text-red-400'>
            { error }
          </p>
        ) }
      </div>
    </div>
  );
}
