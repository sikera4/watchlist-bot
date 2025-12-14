export type Movie = {
  title: string;
  poster_path: string;
  release_date: string;
  genre_ids: number[];
  id: number;
};

export type MovieInList = Omit<Movie, 'genre_ids'> & {
  isSeen: boolean;
};

export type List = {
  id: string;
  name?: string;
  usersIds: number[];
  movies: MovieInList[];
};
