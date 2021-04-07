/**
 * Simple information about created DIDs. Used to save in-app DID information to display
 * the list of DIDs in the DID list screen for example.
 */
export class DIDEntry {
  constructor(
    public didString: string,
    public name: string
  ) { }
}
