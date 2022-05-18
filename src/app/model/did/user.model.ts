
export type UserInfo = {
  did: string; // DID string
  name?: string; // User name or pseudo extracted from his DID, if any
  avatarDataUrl?: string; // Directly displayable data url image format (src="data:image/xxx;...")
}