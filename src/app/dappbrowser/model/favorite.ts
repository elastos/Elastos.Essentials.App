export type BrowserFavorite = {
  name: string;
  description: string;
  icon: string; // ?
  url: string;
  networks: string[]; // List of network keys in which this favorite is available. None means all.
}