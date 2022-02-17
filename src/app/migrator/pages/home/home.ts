import { Component, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { TitleBarComponent } from 'src/app/components/titlebar/titlebar.component';
import { TitleBarIcon, TitleBarIconSlot, TitleBarMenuItem, TitleBarNavigationMode } from 'src/app/components/titlebar/titlebar.types';
import { Logger } from 'src/app/logger';
import { GlobalNavService } from 'src/app/services/global.nav.service';
import { MigrationService } from 'src/app/services/migrator/migration.service';
import { WalletService } from 'src/app/wallet/services/wallet.service';

/**
 * Migrator main page
 */
@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  styleUrls: ['./home.scss'],
})
export class HomePage {
  // UI components
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;

  // Callbacks
  public titleBarIconClickedListener: (icon: TitleBarIcon | TitleBarMenuItem) => void;

  // UI model
  public migrationStarted = false;
  public migrationSuccessfullyEnded = false;
  public migrationFailed = false;
  public migrationsCount: number;
  public currentMigrationStep: number;
  public currentMigrationTitle: string;
  public errorInfo: string = null;

  constructor(
    public navCtrl: NavController,
    private globalNavService: GlobalNavService,
    private translate: TranslateService,
    private walletService: WalletService,
    private migrationService: MigrationService
  ) { }

  ionViewWillEnter() {
    this.titleBar.setTitle("Update required");
    this.titleBar.setNavigationMode(TitleBarNavigationMode.CUSTOM);
    this.titleBar.setIcon(TitleBarIconSlot.OUTER_LEFT, null);
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave() {
    this.titleBar.removeOnItemClickedListener(this.titleBarIconClickedListener);
  }

  public async processToMigration() {
    this.migrationStarted = true;

    let successfulMigration = await this.migrationService.runMigrations(
      totalMigrations => {
        this.migrationsCount = totalMigrations;
      },
      event => {
        Logger.log("migrations", "Migration event", event);
        this.currentMigrationStep = event.migrationStep;
        this.currentMigrationTitle = event.migration.title;

        if (event.event == "migrationerror") {
          this.errorInfo = event.error;
        }
      });

    if (successfulMigration) {
      this.migrationSuccessfullyEnded = true;
      this.currentMigrationTitle = null;
    }
    else
      this.migrationFailed = true;
  }

  public continueAfterSuccess() {
    this.migrationService.continueAfterSuccessfulMigration();
  }
}
