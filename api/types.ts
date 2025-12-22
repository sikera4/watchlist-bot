export type MediaItem = {
  id: number;
  title: string;
  releaseDate?: string;
  posterPath: string;
  isSeen: boolean;
}

export type List = {
  id: string;
  name?: string;
  usersIds: number[];
  items: MediaItem[];
};
