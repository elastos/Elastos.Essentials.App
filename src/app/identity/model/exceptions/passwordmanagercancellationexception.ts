export class PasswordManagerCancelallationException implements Error {
    name: string = "PasswordManagerCancelallationException";    
    message: string = "User cancelled master password input";
}