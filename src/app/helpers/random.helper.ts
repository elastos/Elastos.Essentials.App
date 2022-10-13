/**
 * Generates a random hex of given size.
 * "unsafe" because it's good enough for UI, but not for crypto (Maht.random())
 */
export const unsafeRandomHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
