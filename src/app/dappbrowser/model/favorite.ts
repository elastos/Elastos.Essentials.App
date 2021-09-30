export type BrowserFavorite = {
  name: string;
  description: string;
  iconUrl: string;
  url: string;
  networks: string[]; // List of network keys in which this favorite is available. None means all.
}