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
      </div>
    </div>
  );
}
