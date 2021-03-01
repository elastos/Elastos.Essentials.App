import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AppmanagerService } from './launcher/services/appmanager.service';
import { GlobalPreferencesService } from './services/global.preferences.service';

// TODO: ALL THIS FILE MUST DISAPPEAR AND BE REPLACED BY THE NEW APP MANAGER PLUGIN

/**
 * Object received when receiving a message.
 */
export type ReceivedMessage = {
  /** The message receive */
  message: string;
  /** The message type */
  type: Number;
  /** The message from */
  from: string;
}

/**
 * Information about an intent request.
 */
export type ReceivedIntent = {
  /** The action requested from the receiving application. */
  action: string;
  /** Custom intent parameters provided by the calling application. */
  params: any;
  /** Application package id of the calling application. */
  from: string;
  /** Unique intent ID that has to be sent back when sending the intent response. */
  intentId: Number;
  /** In case the intent comes from outside elastOS and was received as a JWT, this JWT is provided here. */
  originalJwtRequest?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TemporaryAppManagerPlugin {
  constructor() {
  }

  public setListener(listener: (ret) => any) {
    //console.log("setListener() NOT IMPLEMENTED");
  }

  public setIntentListener(listener: (ret: ReceivedIntent) => any) {
    //console.log("setIntentListener() NOT IMPLEMENTED");
  }

  public sendIntent(action: string, data: any, options?: any, onSuccess?: (ret: any)=>void, onError?: (err: any)=>void) {
    //console.log("sendIntent() NOT IMPLEMENTED");
  }

  /*public getLocale(listener: (defaultLang, currentLang, systemLang) => any) {
    //console.log("getLocale() NOT IMPLEMENTED");
    listener("en", "en", "en");
  }

  public setCurrentLocale(locale: string, onSuccess?: (ret: any)=>void, onError?: (err: any)=>void) {
    //console.log("setCurrentLocale() NOT IMPLEMENTED");
  }*/

  public sendUrlIntent(url: string, onSuccess: any, onError: any) {
    //console.log("sendUrlIntent() NOT IMPLEMENTED");
  }

  public sendIntentResponse(action: string, responseData: any, intentId: number, onSuccess?: (ret: any)=>void, onError?: (err: any)=>void) {
    //console.log("sendIntentResponse() NOT IMPLEMENTED");
  }

  public start(appID: string) {
    console.log("start() NOT IMPLEMENTED");
  }

  public getVersion(onSuccess?: (version: any)=>void) {

  }
}

export namespace TemporaryPasswordManagerPlugin {
/**
 * Improved boolean type to pass more verbose information.
 */
export type BooleanWithReason = {
  /** Actual boolean value */
  value: boolean;
  /** Optional reason message to explain why this boolean got this value */
  reason?: string;
}

/**
 * Type defining data format stored inside a password info.
 */
export const enum PasswordType {
  /** Simple password/private key/string info. */
  GENERIC_PASSWORD = 0,
  /** Wifi network with SSID and password. */
  WIFI = 1,
  /** Bank account, national or international format. */
  BANK_ACCOUNT = 2,
  /** Bank card. */
  BANK_CARD = 3,
  /** Any kind of account make of an identifier and a password. */
  ACCOUNT = 4
}

/**
 * Root type for all password information. This type is abstract and should not be used
 * directly.
 */
export type PasswordInfo = {
  /**
   * Unique key, used to identity the password info among other.
   */
  key: string;

  /**
   * Password type, that defines the format of contained information.
   */
  type: PasswordType;

  /**
   * Name used while displaying this info. Either set by users in the password manager app
   * or by apps, when saving passwords automatically.
   */
  displayName: string;

  /**
   * List of any kind of app-specific additional information for this password entry.
   */
  custom?: Map<string, any>;

  /**
   * Package ID of the application/capsule that saved this password information.
   * READ-ONLY
   */
  appID?: String;
}

/**
 * Simple password info containing a simple string (ex: just a password, or a private key).
 */
export type GenericPasswordInfo = PasswordInfo & {
  password: string;
}

/**
 * Information about a wifi network.
 */
export type WifiPasswordInfo = PasswordInfo & {
  /** Wifi network unique identifier */
  wifiSSID: string;
  /** Wifi network password */
  wifiPassword: string;
}

/**
 * Information about a bank account, using local or international format.
 */
export type BankAccountPasswordInfo = PasswordInfo & {
  /** Account owner's name */
  accountOwner: string;
  /** Account IBAN number (international) */
  iban?: string;
  /** Account SWIFT number */
  swift?: string;
  /** Account BIC */
  bic?: string;
}

/**
 * Bank card type.
 */
export const enum BankCardType {
  /** Debit card */
  DEBIT = 0,
  /** Credit card */
  CREDIT = 1
}

/**
 * Information about a bank debit or credit card.
 */
export type BankCardPasswordInfo = PasswordInfo & {
  /** type of card. Debit, credit... */
  cardType?: BankCardType;
  /** Card owner's name */
  accountOwner: string;
  /** Card number without spaces */
  cardNumber: string;
  /** Card expiration date in ISO 8601 format */
  expirationDate: string;
  /** Card verification number, 3 digits */
  cvv?: string;
  /** Issuing bank name */
  bankName?: string;
}

/**
 * Standard ID/password web/app/other account.
 */
export type AccountPasswordInfo = PasswordInfo & {
  /** Account identifier (unique id, email address...) */
  identifier: string;
  /** Account password */
  password: string;
  /** Key provided by the service (google, etc) used to generated temporary 2FA passwords. */
  twoFactorKey?: string;
}

/**
 * Format options for password creation requests, in order to force generating passwords
 * with a specific format.
 */
export type PasswordCreationOptions = {
  // For now, no options such as the number of uppercased letters, special symbols, etc to keep things simple.
  // This is kept for future use.
}

/**
 * Mode defining how often the passwords database has to be unlocked in order to access application or
 * user password info.
 */
export const enum PasswordUnlockMode {
  /**
   * After been unlocked once, password manager access is open during some time and until
   * elastOS exits. Users don't have to provide their master password again during this time,
   * and all apps can get their password information directly.
   */
  UNLOCK_FOR_A_WHILE = 0,

  /**
   * Users have to provide their master password every time an application requests a password.
   * This provides higher security in case the device is stolen, but this is less convenient
   * for users.
   */
  UNLOCK_EVERY_TIME = 1
}

export type GetPasswordInfoOptions = {
  /**
   * If true, the master password is asked (popup) in case the database is locked. If false,
   * getPasswordInfo() fails silently and throws a cancellation exception. Default: true.
   */
  promptPasswordIfLocked?: boolean

  /**
   * Forces the user to re-enter his master password for the current operation, even if the database
   * is already unlocked. This is useful for security reasons, for example for payments, when we want to
   * confirm that the acting user is really the device owner.
   * Default: false.
   */
  forceMasterPasswordPrompt?: boolean
}

/** The provided password is invalid */
interface InvalidPasswordException extends Error { }

/** Some parameters are invalid */
interface InvalidParameterException extends Error { }

/** User cancelled the operation */
interface CancellationException extends Error { }

/** Other kind of exception without additional typing information */
interface UnspecifiedException extends Error { }

@Injectable({
  providedIn: 'root'
})
export class PasswordManager {
  constructor() {
  }

  async setPasswordInfo(info: PasswordInfo): Promise<BooleanWithReason> {
    return {
      value: true
    };
  }

  /**
   * Using a key identifier, returns a previously saved password info.
   *
   * @param key Unique key identifying the password info to retrieve.
   *
   * @returns The password info, or null if nothing was found.
   */
  async getPasswordInfo(key: string, options?: GetPasswordInfoOptions): Promise<PasswordInfo> {
    return {
      key: key,
      type: PasswordType.GENERIC_PASSWORD,
      displayName: "todo"
    };
  }

  /**
   * Deletes an existing password information from the secure database.
   *
   * @param key Unique identifier for the password info to delete.
   *
   * @returns True if something could be deleted, false otherwise.
   */
  async deletePasswordInfo(key: string): Promise<BooleanWithReason> {
    return {
      value: true
    }
  }

  /**
   * Convenience method to generate a random password based on given criteria (options).
   * Used by applications to quickly generate new user passwords.
   *
   * @param options
   */
  async generateRandomPassword(options?: PasswordCreationOptions): Promise<string> {
    return "todo";
  }

  /**
   * RESTRICTED
   *
   * Sets the new master password for the current DID session. This master password locks the whole
   * database of password information.
   *
   * In case of a master password change, the password info database is re-encrypted with this new password.
   *
   * Only the password manager application is allowed to call this API.
   *
   * @returns True if the master password was successfully changed, false otherwise.
   */
  async changeMasterPassword(): Promise<BooleanWithReason> {
    return {
      value: true
    }
  }

  /**
   * RESTRICTED
   *
   * If the master password has ben unlocked earlier, all passwords are accessible for a while.
   * This API re-locks the passwords database and further requests from applications to this password
   * manager will require user to provide his master password again.
   */
  lockMasterPassword() {}

  /**
   * RESTRICTED
   *
   * Deletes all password information for the active DID session. The encrypted passwords database
   * is deleted without any way to recover it.
   */
  async deleteAll(): Promise<void> {}

  /**
   * RESTRICTED
   *
   * Sets the unlock strategy for the password info database. By default, once the master password
   * if provided once by the user, the whole database is unlocked for a while, until elastOS exits,
   * or if one hour has passed, or if it's manually locked again.
   *
   * For increased security, user can choose to get prompted for the master password every time using
   * this API.
   *
   * This API can be called only by the password manager application.
   *
   * @param mode Unlock strategy to use.
   */
  async setUnlockMode(mode: PasswordUnlockMode) {}

  /**
   * RESTRICTED
   *
   * Returns the whole list of password information contained in the password database.
   *
   * Only the password manager application is allowed to call this API.
   *
   * @returns The list of existing password information.
   */
  async getAllPasswordInfo(): Promise<PasswordInfo[]> {
    return [];
  }

  /**
   * RESTRICTED
   *
   * Deletes an existing password information from the secure database, for a given application.
   *
   * Only the password manager application can call this api.
   *
   * @param key Unique identifier for the password info to delete.
   *
   * @returns True if something could be deleted, false otherwise.
   */
  async deleteAppPasswordInfo(targetAppId: string, key: string): Promise<BooleanWithReason> {
    return {
      value: true
    }
  }

  /**
   * RESTRICTED
   *
   * Used by the DID session application to toggle DID contexts and deal with DID creation, sign in,
   * sign out. When a virtual context is set, api call such as getPasswordInfo() don't use the currently
   * signed in DID, but they use this virtual DID instead.
   *
   * @param didString The DID context to use for all further api calls. Pass null to clear the virtual context.
   */
  async setVirtualDIDContext(didString: string): Promise<void> {

  }
}

}









export interface CordovaPlugins {
  printer: PrinterPlugin.Printer;
}

export interface Cordova {
  plugins: CordovaPlugins;
}

export interface Window {
  cordova: Cordova;
}

export namespace PrinterPlugin {
  export interface FontOptions {
      /** The name of the font family. Only supported on iOS */
      name: string;
      /** The size of the font. Only supported on iOS, Android */
      size: number;
      /** Set to true to enable these font traits. Only supported on iOS */
      italic: boolean;
      /** Set to true to enable these font traits. Only supported on iOS */
      bold: boolean;
      /** Possible alignments are left, right, center and justified. Only supported on iOS */
      align: 'left' | 'right' | 'center' | 'justified';
      /** The color of the font in hexa-decimal RGB format - "FF0000" means red. Only supported on iOS */
      color: string;
  }

  export interface HeaderFooterLabelOptions {
      /** The plain text to display. Use %ld to indicate where to insert the page index. For example "Page %ld" would result into "Page 1", "Page 2", .... Only supported on iOS */
      text: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      top: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      right: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      left: string;
      /** The relative position where to place the label within the footer or header area. Only supported on iOS */
      bottom: string;
      /** The font attributes for the label. Only supported on iOS */
      font: FontOptions;
      /** Set to true if you want to display the page index. Only supported on iOS */
      showPageIndex: boolean;
  }

  export interface PrintOptions {
      /**
       * The name of the print job and the document
       */
      name?: string;

      /**
       * The number of copies for the print task.
       * Only supported on iOS, Windows
       */
      copies?: number;

      /**
       * Limits the pages to print even the document contains more.
       * To skip the last n pages you can assign a negative value on iOS.
       * Only supported on iOS, Android
       */
      pageCount?: number;

      /**
       * Specifies the duplex mode to use for the print job.
       * Either double-sided on short site (duplex:'short'),
       * double-sided on long site (duplex:'long') or single-sided (duplex:'none').
       */
      duplex?: boolean;

      /**
       * The orientation of the printed content, portrait or landscape
       * Portrait by default.
       */
      orientation?: 'landscape' | 'portrait';

      /**
       * If your application only prints black text, setting this property to true can result in better performance in many cases.
       * False by default.
       */
      monochrome?: boolean;

      /**
       * If your application only prints black text, setting this property to true can result in better performance in many cases.
       * False by default.
       * Only supported on iOS, Windows
       */
      photo?: boolean;

      /**
       * Set to false to disable downscaling the image to fit into the content aread.
       * Only supported on Android
       */
      autoFit?: boolean;

      /**
       * The network URL to the printer.
       * Only supported on iOS
       */
      printer?: string;

      /**
       * Defines the maximum size of the content area.
       * Only supported on iOS
       */
      maxHeight?: string;

      /**
       * Defines the maximum size of the content area.
       * Only supported on iOS
       */
      maxWidth?: string;

      /**
       * Set to false to avoid margins.
       * The margins for each printed page. Each printer might have its own minimum margins depends on media type and paper format.
       */
      margin?: boolean | {
          top?: string;
          left?: string;
          right?: string;
          bottom?: string;
      };

      ui?: {
          /** Set to true to hide the control for the number of copies. Only supported on iOS */
          hideNumberOfCopies?: string;
          /** Set to true to hide the control for the paper format. Only supported on iOS */
          hidePaperFormat?: string;
          /** The position of the printer picker. Only supported on iPad */
          top?: number;
          /** The position of the printer picker. Only supported on iPad */
          left?: number;
          /** The size of the printer picker. Only supported on iPad */
          height?: number;
          /** The size of the printer picker. Only supported on iPad */
          width?: number;
      };

      paper?: {
          /** The dimensions of the paper – iOS will will try to choose a format which fits bests. Only supported on iOS */
          width: string;
          /** The dimensions of the paper – iOS will will try to choose a format which fits bests. Only supported on iOS */
          height: string;
          /** The name of the format like IsoA4 or Roll22Inch. https://docs.microsoft.com/en-us/uwp/api/windows.graphics.printing.printmediasize. Only supported on Windows */
          name: string;
          /** On roll-fed printers you can decide when the printer cuts the paper. https://docs.microsoft.com/en-us/uwp/api/windows.graphics.printing.printmediasize. Only supported on iOs */
          length: string;
      };

      font?: FontOptions;

      header?: {
          /** The height of the header or footer on each page. Only supported on iOS */
          height: string;
          /** An array of labels to display. Only use if there are more then one. Only supported on iOS */
          labels: string[];
          label: HeaderFooterLabelOptions;
      };

      footer?: {
          /** The height of the header or footer on each page. Only supported on iOS */
          height: string;
          /** An array of labels to display. Only use if there are more then one. Only supported on iOS */
          labels: string[];
          label: HeaderFooterLabelOptions;
      };
  }

  export interface Printer {
      /**
       * Returns a list of all printable document types.
       */
      getPrintableTypes(callback: (printableTypes: string[]) => void);

      /**
       * Sends the content to the printer.
       *
       * @param content The plain/html text or a file URI.
       */
      print(content: string | HTMLElement, options: PrintOptions, callback: (printed: boolean) => void);
  }
}







export namespace TrinitySDK {
  export namespace DID {
    export type FastDIDCreationResult = {
      storePassword: string;
      didStore: DIDPlugin.DIDStore;
      did: DIDPlugin.DID;
    }

    export class DIDHelper {
      fastCreateDID(lang: DIDPlugin.MnemonicLanguage): FastDIDCreationResult {
        return null;
      }
    }
  }

  export namespace Hive {
    export class AuthHelper {
      getClientWithAuth(callback: (err)=>void): HivePlugin.Client {
        return null;
      }
    }
  }
}