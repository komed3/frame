import { useApi } from '@/src/client/context/ApiContext';
import { type SubmitEvent, useState } from 'react';


export function Login () {
  const { login, loading, error, clearError } = useApi();
  const [ username, setUsername ] = useState( '' );
  const [ password, setPassword ] = useState( '' );

  const handleSubmit = async ( event: SubmitEvent< HTMLFormElement > ) => {
    event.preventDefault();
    try { await login( { username, password } ) } catch {}
  };

  return (
    <div className= 'flex justify-center items-center min-h-screen px-4'>
      { /** Login Form */ }
      <div className= 'w-full max-w-sm px-10 py-8 bg-slate-800 rounded shadow-xl'>
        <h1 className= 'text-3xl font-semibold'>Frame</h1>
        <p className= 'text-sm text-slate-400'>Private media library</p>

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
                'w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-900 rounded outline-none ' +
                'transition focus:border-slate-400 disabled:text-slate-300'
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
                'w-full px-3 py-2.5 text-sm bg-slate-900 border border-slate-900 rounded outline-none ' +
                'transition focus:border-slate-400 disabled:text-slate-300'
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
              'mt-6 w-full px-4 py-2.5 text-sm font-semibold text-slate-900 bg-slate-200 rounded ' +
              'transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            { loading ? 'Signing in …' : 'Sign in' }
          </button>
        </form>
      </div>
    </div>
  );
}
