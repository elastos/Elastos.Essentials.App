import { Component, NgZone, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { IonInput } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { TitleBarComponent } from "src/app/components/titlebar/titlebar.component";
import { Logger } from "src/app/logger";
import { Util } from "src/app/model/util";
import { GlobalPopupService } from "src/app/services/global.popup.service";
import { ImportWalletType } from "src/app/wallet/model/masterwallets/wallet.types";
import { WalletUtil } from "src/app/wallet/model/wallet.util";
import { Config } from "../../../config/Config";
import { Native } from "../../../services/native.service";
import { UiService } from "../../../services/ui.service";
import { WalletService } from "../../../services/wallet.service";
import {
  NewWallet,
  WalletCreationService,
} from "../../../services/walletcreation.service";

@Component({
  selector: "app-wallet-create",
  templateUrl: "./wallet-create.page.html",
  styleUrls: ["./wallet-create.page.scss"],
})
export class WalletCreatePage implements OnInit {
  @ViewChild(TitleBarComponent, { static: true }) titleBar: TitleBarComponent;
  @ViewChild("input", { static: false }) input: IonInput;

  public useMnemonicPassphrase = false;
  public importByPrivateKey = false;
  public requestSingleMultiAddress = true; // Whether to prompt user for single/multi wallet address or not
  public requestMnemonicPassphrase = true; // Whether to prompt user for mnemonic passphrase or not
  public wallet = {
    name: "",
    singleAddress: false,
    mnemonicPassword: "",
  };
  public repeatMnemonicPassword: "";

  constructor(
    public route: ActivatedRoute,
    public native: Native,
    private router: Router,
    private walletManager: WalletService,
    public walletCreationService: WalletCreationService,
    public zone: NgZone,
    public translate: TranslateService,
    public uiService: UiService,
    private popupService: GlobalPopupService
  ) {
    if (this.walletCreationService.isMulti) {
      this.wallet.singleAddress = true;
    }
  }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (!Util.isEmptyObject(navigation.extras.state)) {
      if (navigation.extras.state.importType == ImportWalletType.PRIVATEKEY) {
        this.importByPrivateKey = true;
      }
      if (navigation.extras.state.aaWallet === true) {
        this.walletCreationService.type = NewWallet.ACCOUNT_ABSTRACTION;
        // For account abstraction wallets, disable single/multi address and mnemonic passphrase requests
        this.requestSingleMultiAddress = false;
        this.requestMnemonicPassphrase = false;
        // Set default values for account abstraction wallets
        this.wallet.singleAddress = false; // Default to multi-address for AA wallets
        this.useMnemonicPassphrase = false; // Default to no passphrase for AA wallets
      }
    }

    // Override constructor settings if requestSingleMultiAddress is false
    if (!this.requestSingleMultiAddress) {
      this.wallet.singleAddress = false;
    }
  }

  ionViewWillEnter() {
    //this.titleBar.setBackgroundColor('#732cd0');
    //this.titleBar.setForegroundMode(TitleBarForegroundMode.LIGHT);
    if (this.walletCreationService.type === NewWallet.CREATE) {
      this.titleBar.setTitle(
        this.translate.instant("wallet.launcher-create-wallet")
      );
    } else if (
      this.walletCreationService.type === NewWallet.ACCOUNT_ABSTRACTION
    ) {
      this.titleBar.setTitle(
        this.translate.instant("wallet.settings-add-wallet-create-aa-wallet")
      );
    } else {
      if (this.importByPrivateKey) {
        this.titleBar.setTitle(
          this.translate.instant("wallet.import-wallet-by-privatekey")
        );
      } else {
        this.titleBar.setTitle(
          this.translate.instant("wallet.import-wallet-by-mnemonic")
        );
      }
    }
  }

  ionViewWillLeave() {
    if (this.native.popup) {
      this.native.popup.dismiss();
    }
  }

  updateSingleAddress(event) {
    // this.wallet.singleAddress = event.detail.checked;
    Logger.log(
      "wallet",
      "Single address toggled?",
      +this.wallet.singleAddress,
      event
    );
  }

  onCreate() {
    if (Util.isNull(this.wallet.name)) {
      this.native.toast_trans("wallet.text-wallet-name-validator-enter-name");
      return;
    }
    if (WalletUtil.isInvalidWalletName(this.wallet.name)) {
      this.native.toast_trans(
        "wallet.text-wallet-name-validator-not-valid-name"
      );
      return;
    }
    if (this.walletManager.walletNameExists(this.wallet.name)) {
      this.native.toast_trans(
        "wallet.text-wallet-name-validator-already-exists"
      );
      return;
    }
    if (
      !this.importByPrivateKey &&
      this.useMnemonicPassphrase &&
      this.requestMnemonicPassphrase
    ) {
      if (this.wallet.mnemonicPassword.length < Config.MIN_PASSWORD_LENGTH) {
        this.native.toast_trans(
          "wallet.text-wallet-passphrase-validator-min-length"
        );
        return;
      }
      if (this.wallet.mnemonicPassword !== this.repeatMnemonicPassword) {
        this.native.toast_trans(
          "wallet.text-wallet-passphrase-validator-repeat"
        );
        return;
      }
    }
    this.createWallet();
  }

  createWallet() {
    this.walletCreationService.name = this.wallet.name;
    this.walletCreationService.singleAddress = this.wallet.singleAddress;
    if (this.useMnemonicPassphrase) {
      this.walletCreationService.mnemonicPassword =
        this.wallet.mnemonicPassword;
    } else {
      this.walletCreationService.mnemonicPassword = "";
    }

    if (this.walletCreationService.type === NewWallet.CREATE) {
      this.native.go("/wallet/mnemonic/create");
    } else if (
      this.walletCreationService.type === NewWallet.ACCOUNT_ABSTRACTION
    ) {
      this.native.go("/wallet/account-abstraction/create");
    } else {
      if (this.importByPrivateKey) {
        this.native.go("/wallet/wallet-import-privatekey");
      } else {
        this.native.go("/wallet/wallet-import");
      }
    }
  }

  goToNextInput(event, nextInput: any) {
    // android: only press enter will trigger keypress event
    // ios: press any key will trigger keypress event
    if (event !== 13) {
      return;
    }

    if (
      this.requestMnemonicPassphrase &&
      this.wallet.mnemonicPassword.length < Config.MIN_PASSWORD_LENGTH
    ) {
      this.native.toast_trans(
        "wallet.text-wallet-passphrase-validator-min-length"
      );
      return;
    }
    nextInput.setFocus();
  }

  showHelp(event): Promise<any> {
    return this.popupService.showHelp(event, "wallet.help:create-password");
  }
}
