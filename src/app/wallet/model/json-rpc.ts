export type JsonRpcResponse<T> = {
  id: number;
  jsonrpc: string; // "2.0"
  result: T;
  error: {
    code: string;
    message: string;
    data?: string;
  };
};
