export type BrowsedAppInfo = {
  url: string;
  title: string;
  description: string;
  iconUrl: string;
  lastBrowsed: number; // Unix timestamp (secs)
  network: string; // Network last used while launching, or while inside this app
};