export class BiometricLockedoutException implements Error {
    name: string = "BiometricLockedout";
    message: string = "Biometric locked out?";
}