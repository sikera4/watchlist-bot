export type MediaItem = {
  id: number;
  title: string;
  releaseDate?: string;
  posterPath: string;
  isSeen: boolean;
};

export type List = {
  id: string;
  name?: string;
  userIds: string[];
  items: MediaItem[];
};
