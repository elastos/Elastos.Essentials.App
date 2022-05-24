import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Native } from 'src/app/wallet/services/native.service';
import { WalletNetworkService } from 'src/app/wallet/services/network.service';
import { WalletCreationService } from 'src/app/wallet/services/walletcreation.service';
import { Stack } from "stack-typescript";

type Menu = {
  icon?: string;
  title: string;
  items?: Menu[];
  routeOrAction?: string | (() => void | Promise<void>);
};

@Component({
  selector: 'app-add-wallet',
  templateUrl: './add-wallet.component.html',
  styleUrls: ['./add-wallet.component.scss'],
  animations: [
    trigger('enterTrigger', [
      state('fadeIn', style({
        opacity: '1',
        transform: 'translateY(0%)'
      })),
      transition('void => *', [style({ opacity: '0', transform: 'translateY(50%)' }), animate('500ms')])
    ])
  ]
})
export class AddWalletComponent implements OnInit {
  public menus: Menu[] = [{
    title: "Add Wallet",
    items: [
      {
        title: "Standard Wallet",
        items: [
          {
            title: "New Wallet",
            routeOrAction: () => {
              this.createStandardWallet();
            }
          },
          {
            title: "Import Wallet",
            items: [
              {
                title: "Mnemonic / Paper key",
                routeOrAction: () => {
                  this.importStandardWallet();
                }
              },
              {
                title: "Private key",
                routeOrAction: () => {
                  // TODO: differenciate from mnemonic menu item just above
                  this.importStandardWallet();
                }
              },
              /* TODO {
                title: "Keystore file",
                action: () => { console.log("xxx") }
              } */
            ]
          }
        ]
      },
      {
        title: "Multi Signature Wallet",
        items: [
          {
            title: "Elastos mainchain",
            routeOrAction: "/wallet/multisig/standard/create"
          }
        ]
      },
      {
        title: "Connect H/W Wallet",
        items: [
          {
            icon: "assets/wallet/icons/ledger.svg",
            title: "Ledger Nano X",
            routeOrAction: "/wallet/ledger/scan"
          }
        ]
      }
    ]
  }];
  public selectedMenu: Menu = this.menus[0];

  private navStack = new Stack<Menu>();

  constructor(
    private navParams: NavParams,
    public theme: GlobalThemeService,
    private modalCtrl: ModalController,
    private native: Native,
    private walletCreationService: WalletCreationService,
    private walletNetworkService: WalletNetworkService
  ) { }

  ngOnInit(): void {
  }

  ionViewWillEnter() {
  }

  public onMenuItemClicked(menuItem: Menu) {
    if (menuItem.items) {
      this.navStack.push(this.selectedMenu); // Saves the current menu to be able to go back
      this.selectedMenu = menuItem; // Enters the submenu
    }
    else {
      this.dismiss();

      if (typeof menuItem.routeOrAction === "string")
        this.native.go(menuItem.routeOrAction);
      else {
        void menuItem.routeOrAction();
      }
    }
  }

  public canGoBack(): boolean {
    return this.navStack.length > 0;
  }

  public goBack() {
    let previousMenu = this.navStack.pop();
    this.selectedMenu = previousMenu;
  }

  private dismiss() {
    void this.modalCtrl.dismiss();
  }

  createStandardWallet() {
    this.dismiss();

    this.walletCreationService.reset();
    this.walletCreationService.isMulti = false;
    this.walletCreationService.type = 1; // new
    this.native.go("/wallet/wallet-create");
  }

  importStandardWallet() {
    this.dismiss();

    this.walletCreationService.reset();
    this.walletCreationService.isMulti = false;
    this.walletCreationService.type = 2; // import
    this.native.go("/wallet/wallet-create");
  }
}
