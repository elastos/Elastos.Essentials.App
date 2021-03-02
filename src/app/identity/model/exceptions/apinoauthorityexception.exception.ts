export class ApiNoAuthorityException implements Error {
    name: string = "ApiNoAuthorityException";
    message: string = "Api has no authority";

    constructor(private exceptionMessage) {
      this.message = exceptionMessage;
    }
}