import logo from '@/src/client/assets/logo.svg';
import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { type SubmitEvent, useState } from 'react';


export function Login () {
  const { login, loading, error, clearError } = useApi();
  const [ username, setUsername ] = useState( '' );
  const [ password, setPassword ] = useState( '' );

  usePageTitle( 'Login' );

  const handleSubmit = async ( e: SubmitEvent< HTMLFormElement > ) => {
    e.preventDefault();
    try { await login( { username, password } ) } catch {}
  };

  return (
    <div className= 'flex flex-col justify-center items-center gap-6 min-h-screen px-4'>
      <div className= 'w-full max-w-md px-10 py-8 bg-slate-50/10 rounded shadow'>
        <div className= 'flex items-center gap-4'>
          <img
            src= { logo }
            className= 'w-12 h-12'
            alt= 'Frame'
          />

          <span className= 'uppercase text-2xl font-extralight text-slate-400 tracking-widest'>
            Frame Login
          </span>
        </div>

        <form onSubmit= { handleSubmit } className= 'mt-8 space-y-4'>
          <div className= 'space-y-1'>
            <label className= 'block text-sm text-slate-400'>
              Username
            </label>
            <input
              name= 'username'
              type= 'text'
              autoComplete= 'username'
              autoFocus
              required
              value= { username }
              onChange= { e => { setUsername( e.target.value ); clearError() } }
              disabled= { loading }
              className= {
                'w-full px-3 py-2.5 text-sm bg-slate-900/60 border border-transparent rounded ' +
                'outline-none transition focus:border-slate-400 disabled:text-slate-300'
              }
            />
          </div>

          <div className= 'space-y-1'>
            <label className= 'block text-sm text-slate-400'>
              Password
            </label>
            <input
              name= 'password'
              type= 'password'
              autoComplete= 'current-password'
              required
              value= { password }
              onChange= { e => { setPassword( e.target.value ); clearError() } }
              disabled= { loading }
              className= {
                'w-full px-3 py-2.5 text-sm bg-slate-900/60 border border-transparent rounded ' +
                'outline-none transition focus:border-slate-400 disabled:text-slate-300'
              }
            />
          </div>

          { error && (
            <p role= 'alert' className= 'font-semibold text-red-400'>
              { error }
            </p>
          ) }

          <button
            type= 'submit'
            disabled= { loading || ! username.trim() || ! password }
            className= {
              'mt-6 w-full px-4 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/60 ' +
              'rounded transition hover:bg-white disabled:pointer-events-none'
            }
          >
            { loading ? 'Logging In …' : 'Log In' }
          </button>
        </form>
      </div>

      <p className= 'text-xs font-light text-slate-500'>
        Copyright &copy; 2026 komed3. All rights reserved.
      </p>
    </div>
  );
}
