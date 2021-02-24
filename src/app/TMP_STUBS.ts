import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { AppmanagerService } from './launcher/services/appmanager.service';
import { PreferencesService } from './services/preferences.service';

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
export class AppManagerPlugin {
  constructor() {
  }

  public setListener(listener: (ret) => any) {
    console.log("setListener() NOT IMPLEMENTED");
  }

  public setIntentListener(listener: (ret) => any) {
    console.log("setIntentListener() NOT IMPLEMENTED");
  }

  public sendIntent(action: string, data: any) {
    console.log("sendIntent() NOT IMPLEMENTED");
  }

  public getLocale(listener: (defaultLang, currentLang, systemLang) => any) {
    console.log("getLocale() NOT IMPLEMENTED");
    listener("en","en","en");
  }

  public sendUrlIntent(url: string, onSuccess:any, onError: any) {
    console.log("sendUrlIntent() NOT IMPLEMENTED");
  }

  public start(appID: string) {
    console.log("start() NOT IMPLEMENTED");
  }
}
