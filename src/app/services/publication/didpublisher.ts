export abstract class DIDPublisher {
  public abstract publishDID(didString: string, payloadObject: any, memo: string, showBlockingLoader: boolean): Promise<void>;
  public abstract resetStatus();
}