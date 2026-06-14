export interface Game {
  id: string;
  name: string;
  image: string;
  category: string;
  tag: string;
  comingSoon?: boolean;
  idLabel?: string;
  idPlaceholder?: string;
}

export const GAMES: Game[] = [];
