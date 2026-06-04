import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import type { RPCUrlProvider } from '../model/rpc-url-provider';

export interface RpcProviderStatus {
  url: string;
  pingTime: number; // in milliseconds, -1 for timeout/error
  status: 'fast' | 'slow' | 'timeout' | 'unknown';
  lastChecked: number; // timestamp
}

@Injectable({
  providedIn: 'root'
})
export class RpcProvidersQualityService {
  private monitoringSubscription: Subscription | null = null;
  private checkInterval = 5000; // 15 seconds
  private timeoutMs = 5000; // 5 second timeout for each ping

  // Thresholds for status classification
  private readonly FAST_THRESHOLD = 500; // < 500ms = fast
  private readonly SLOW_THRESHOLD = 2000; // < 2000ms = slow, >= 2000ms = timeout

  private providersStatus = new Map<string, RpcProviderStatus>();
  private statusSubject = new BehaviorSubject<Map<string, RpcProviderStatus>>(new Map());
  public status$: Observable<Map<string, RpcProviderStatus>> = this.statusSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Start monitoring RPC providers quality
   * @param providers List of RPC providers to monitor
   */
  startMonitoring(providers: RPCUrlProvider[]): void {
    this.stopMonitoring(); // Stop any existing monitoring

    if (providers.length === 0) return;

    // Initialize status for all providers
    providers.forEach(provider => {
      if (!this.providersStatus.has(provider.url)) {
        this.providersStatus.set(provider.url, {
          url: provider.url,
          pingTime: -1,
          status: 'unknown',
          lastChecked: 0
        });
      }
    });

    // Emit initial status
    this.statusSubject.next(new Map(this.providersStatus));

    // Start periodic checking
    this.monitoringSubscription = interval(this.checkInterval).subscribe(() => {
      void this.checkProvidersQuality(providers);
    });

    // Do initial check
    void this.checkProvidersQuality(providers);
  }

  /**
   * Stop monitoring RPC providers quality
   */
  stopMonitoring(): void {
    if (this.monitoringSubscription) {
      this.monitoringSubscription.unsubscribe();
      this.monitoringSubscription = null;
    }
  }

  /**
   * Get current status for a specific provider
   */
  getProviderStatus(url: string): RpcProviderStatus | undefined {
    return this.providersStatus.get(url);
  }

  /**
   * Check quality for all providers
   */
  private async checkProvidersQuality(providers: RPCUrlProvider[]): Promise<void> {
    const promises = providers.map(provider => this.checkProviderQuality(provider));

    // Use Promise.all and catch individual errors
    await Promise.all(promises.map(p => p.catch(e => e)));

    // Emit updated status
    this.statusSubject.next(new Map(this.providersStatus));
  }

  /**
   * Check quality for a single provider
   */
  private async checkProviderQuality(provider: RPCUrlProvider): Promise<void> {
    const startTime = Date.now();

    try {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      };

      // Use eth_blockNumber for a lightweight RPC call
      await this.http
        .post(
          provider.url,
          JSON.stringify({
            method: 'eth_blockNumber',
            jsonrpc: '2.0',
            id: `quality-check-${Date.now()}`,
            params: []
          }),
          httpOptions
        )
        .pipe(
          timeout(this.timeoutMs),
          map(response => {
            const pingTime = Date.now() - startTime;
            let status: RpcProviderStatus['status'];

            if (pingTime < this.FAST_THRESHOLD) {
              status = 'fast';
            } else if (pingTime < this.SLOW_THRESHOLD) {
              status = 'slow';
            } else {
              status = 'timeout';
            }

            this.providersStatus.set(provider.url, {
              url: provider.url,
              pingTime,
              status,
              lastChecked: Date.now()
            });

            return response;
          }),
          catchError(error => {
            // Handle timeout or other errors
            this.providersStatus.set(provider.url, {
              url: provider.url,
              pingTime: -1,
              status: 'timeout',
              lastChecked: Date.now()
            });
            throw error;
          })
        )
        .toPromise();
    } catch (error) {
      // Handle network errors, timeouts, etc.
      this.providersStatus.set(provider.url, {
        url: provider.url,
        pingTime: -1,
        status: 'timeout',
        lastChecked: Date.now()
      });
    }
  }

  /**
   * Get status color class for UI
   */
  getStatusColorClass(status: RpcProviderStatus['status']): string {
    switch (status) {
      case 'fast':
        return 'status-fast';
      case 'slow':
        return 'status-slow';
      case 'timeout':
        return 'status-timeout';
      case 'unknown':
      default:
        return 'status-unknown';
    }
  }

  /**
   * Get status icon name for UI
   */
  getStatusIcon(status: RpcProviderStatus['status']): string {
    switch (status) {
      case 'fast':
        return 'radio-button-on'; // or 'checkmark-circle' for green checkmark
      case 'slow':
        return 'radio-button-on'; // yellow/orange
      case 'timeout':
        return 'radio-button-off'; // red X
      case 'unknown':
      default:
        return 'help-circle'; // gray question mark
    }
  }

  /**
   * Format ping time for display
   */
  formatPingTime(pingTime: number): string {
    if (pingTime === -1) {
      return 'Unavailable';
    } else if (pingTime < 1000) {
      return `${pingTime}ms`;
    } else {
      return `${(pingTime / 1000).toFixed(1)}s`;
    }
  }
}
