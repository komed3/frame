export function Header () {
  return (
    <header className= 'fixed inset-x-0 top-0 z-99 h-18 bg-slate-800 shadow'>
      { /** Logo */ }
      <div className= 'absolute top-1/2 left-6 transform -translate-y-1/2'>...</div>

      { /** Search */ }
      <div className= 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>...</div>

      { /** User */ }
      <div className= 'absolute top-1/2 right-6 transform -translate-y-1/2'>...</div>
    </header>
  );
}
