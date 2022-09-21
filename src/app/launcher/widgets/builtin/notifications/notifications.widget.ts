import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { LauncherNotification, NotificationManagerService } from 'src/app/launcher/services/notificationmanager.service';
import { GlobalThemeService } from 'src/app/services/theming/global.theme.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletNetworkUIService } from 'src/app/wallet/services/network.ui.service';
import { IWidget } from '../../base/iwidget';
import { WidgetsServiceEvents } from '../../services/widgets.events';

@Component({
  selector: 'notifications',
  templateUrl: './notifications.widget.html',
  styleUrls: ['./notifications.widget.scss'],
})
export class NotificationsWidget implements IWidget, OnInit, OnDestroy {
  public forSelection: boolean; // Initialized by the widget service
  public editing: boolean; // Widgets container is being edited

  private notifsSub: Subscription = null;
  private modal: HTMLIonModalElement = null;

  public notifications: LauncherNotification[] = [];
  public totalNotifications = 0;

  constructor(
    public theme: GlobalThemeService,
    private walletNetworkService: WalletNetworkService,
    private walletNetworkUIService: WalletNetworkUIService,
    public notificationService: NotificationManagerService
  ) { }

  ngOnInit() {
    // Watch edition mode change to show this widget in edition even if not showing in live mode.
    WidgetsServiceEvents.editionMode.subscribe(editing => {
      this.editing = editing;
    });

    this.notifsSub = this.notificationService.notifications.subscribe(notifications => {
      if (notifications) {
        this.totalNotifications = notifications.length;
        this.notifications = notifications.slice(0, 3);
      }
    });
  }

  ngOnDestroy() {
    if (this.notifsSub) {
      this.notifsSub.unsubscribe();
      this.notifsSub = null;
    }

    if (this.modal) {
      void this.modal.dismiss();
      this.modal = null;
    }
  }

  /**
   * Shorter messages for the widget in case they are too long.
   */
  public getNotificationMessage(notification: LauncherNotification): string {
    let message = this.notificationService.getNotificationMessage(notification);
    if (message.length > 50)
      message = message.substring(0, 50) + "...";
    return message;
  }

  public async showNotifications() {
    this.modal = await this.notificationService.showNotifications(() => {
      this.modal = null;
    });
  }
}
