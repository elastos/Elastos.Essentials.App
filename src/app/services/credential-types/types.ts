import type { Url } from "jsonld/jsonld-spec";

type JsonLdError = {
  details: {
    url: string; // ie "https://elastos.org/credentials/v1"
  },
  message: string; // ie "Dereferencing a URL did not result in a valid JSON-LD object. Possible causes are an inaccessible URL perhaps due to a same-origin policy (ensure the server uses CORS if you are using client-side JavaScript), too many redirects, a non-JSON response, or more than one HTTP Link Header was provided for a remote context."
  name: string; // ie "jsonld.InvalidUrl"
}

// Missing in JSONLD types
type RemoteDocument = {
  contextUrl?: Url | undefined;
  documentUrl: Url;
  document: unknown; // raw data
}

class JsonLdParsingError {
  constructor(public message: string) { }
}

class UrlUnreachableError extends JsonLdParsingError {
  constructor(message: string, public url: string) {
    super(message);
  }
}

class InvalidJsonError extends JsonLdParsingError {
  constructor(message: string) {
    super(message);
  }
}

class InvalidCredentialSubjectError extends Error {
  constructor() {
    super("Empty or invalid credential subject");
  }
}
