export class PasswordManagerCancellationException implements Error {
    name: string = "PasswordManagerCancellationException";    
    message: string = "User cancelled master password input";
}