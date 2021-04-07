export class DIDDocument {
  constructor(
    public clazz: number,
    public id: {
      storeId: string,
      didString: string
    },
    public created: any,
    public updated: string,
    public verifiableCredential: any[] = [],
    public publicKey: any,
    public authentication: any,
    public authorization: any,
    public expires: any,
    public storeId: string,
  ) {}
}
