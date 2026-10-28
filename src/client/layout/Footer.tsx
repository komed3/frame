export function Footer () {
  return (
    <footer className= 'mx-auto max-w-7xl px-6 py-18'>
      <div className= 'flex justify-between items-center gap-12 pt-6 border-t border-slate-700/70'>
        <p className= 'text-sm text-slate-400'>
          Copyright &copy; 2026 komed3. All rights reserved.
        </p>

        <div className= 'flex items-center gap-3 text-sm'>
          <a
            href= 'https://komed3.de'
            target= '_blank'
            rel= 'noopener noreferrer'
          >
            komed3
          </a>

          <span className= 'text-slate-500'>/</span>

          <a
            href= 'https://github.com/komed3/frame'
            target= '_blank'
            rel= 'noopener noreferrer'
          >
            GitHub
          </a>

          <span className= 'text-slate-500'>/</span>

          <a
            href= 'https://ko-fi.com/komed3'
            target= '_blank'
            rel= 'noopener noreferrer'
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
