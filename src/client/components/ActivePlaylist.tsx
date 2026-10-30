interface ActivePlaylistProps {
  playlistId: string;
  mediaId: string;
  orientation?: 'horizontal' | 'vertical';
}


export function ActivePlaylist ( { playlistId, mediaId, orientation = 'horizontal' }: ActivePlaylistProps ) {
  return (
    <div className= 'bg-slate-50/10 rounded shadow-lg'></div>
  );
}
