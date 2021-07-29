
export type ProfileDisplayEntry = {
  credentialId: string; // related credential id
  label: string; // "title" to display
  value: string; // value to display
  isVisible: boolean; // Whether this basic credential entry is currently in the local did document or not
};
