export class WrongPasswordException implements Error {
    name: string = "WrongPasswordException";    
    message: string = "Wrong password provided?";
}