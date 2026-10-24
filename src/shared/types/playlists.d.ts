export interface PlaylistRecord {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItemRecord {
  playlistId: string;
  mediaId: string;
  position: number;
  addedAt: string;
}

export interface PlaylistUpdate {
  name?: string;
  description?: string | null;
}
