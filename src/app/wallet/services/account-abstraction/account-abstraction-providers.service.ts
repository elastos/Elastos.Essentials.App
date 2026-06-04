import { Injectable } from '@angular/core';
import { Logger } from 'src/app/logger';
import { PGAccountAbstractionProvider } from '../../model/networks/elastos/evms/eco/account-abstraction-providers/pg-account-abstraction.provider';
import { AccountAbstractionProvider } from '../../model/networks/evms/account-abstraction-provider';

/**
 * Service responsible for registering and managing account abstraction providers for EVM chains.
 */
@Injectable({
  providedIn: 'root'
})
export class AccountAbstractionProvidersService {
  public static instance: AccountAbstractionProvidersService = null;

  private providers: AccountAbstractionProvider[] = [];

  constructor() {
    AccountAbstractionProvidersService.instance = this;
  }

  public init(): void {
    this.registerProviders();
  }

  private registerProviders(): void {
    this.registerAAProvider(new PGAccountAbstractionProvider());
  }

  public registerAAProvider(provider: AccountAbstractionProvider): void {
    // Check if already registered
    const existing = this.providers.find(p => p.name === provider.name);
    if (existing) {
      Logger.warn('account-abstraction', 'Account abstraction provider already registered:', provider.name);
      return;
    }

    // Keep local reference
    this.providers.push(provider);

    Logger.log('account-abstraction', 'Registered AA provider:', provider.name);
  }

  /**
   * Get all registered account abstraction providers
   * @returns Array of registered providers
   */
  public getProviders(): AccountAbstractionProvider[] {
    return [...this.providers];
  }

  /**
   * Get an account abstraction provider by name
   * @param name The provider name
   * @returns The provider instance or null if not found
   */
  public getProviderByName(name: string): AccountAbstractionProvider | null {
    return this.providers.find(p => p.name === name) || null;
  }

  /**
   * Get an account abstraction provider by ID
   * @param id The provider ID
   * @returns The provider instance or null if not found
   */
  public getProviderById(id: string): AccountAbstractionProvider | null {
    return this.providers.find(p => p.id === id) || null;
  }

  /**
   * Get account abstraction providers that support a specific chain
   * @param chainId The chain ID
   * @returns Array of supported providers
   */
  public getProvidersForChain(chainId: number): AccountAbstractionProvider[] {
    return this.providers.filter(provider => provider.supportsChain(chainId));
  }
}
