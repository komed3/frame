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
    <></>
  );
}
