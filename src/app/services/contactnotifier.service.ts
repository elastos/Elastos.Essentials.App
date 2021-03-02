import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

/**
 * Structure used to send a remote notification to a contact.
 */
export type RemoteNotificationRequest = {
  /** Identification key used to overwrite a previous notification if it has the same key. */
  key?: string,
  /** Title that highlights the notification main purpose. */
  title: string,
  /** Main message content  */
  message: string,
  /** Intent URL emitted when the notification is clicked. */
  url?: string
}

/**
 * Structure holding information about a contact avater picture.
 */
export type ContactAvatar = {
  /** Picture content type: "image/jpeg" or "image/png" */
  contentType: string;
  /** Raw picture bytes encoded to a base64 string */
  base64ImageData: string;
}

/**
 * Contact entity that represents a previously added contact.
 *
 * A contact in this contact notifier is mainly a pair of DID/Carrier address, but it also
 * holds optional references to the contact name and avatar, for display purpose.
 */
export class Contact {
  /**
   * Returns the permanent DID string of this contact.
   * This is contact's unique identifier.
   */
  public getDID(): string {
    // TODO
    return null;
  }

  /**
   * Returns the permanent carrier user ID of this contact.
   */
  public getCarrierUserID(): string {
    // TODO
    return null;
  }

  /**
   * Returns the contact name.
   */
  public getName(): string {
    // TODO
    return null;
  }

  /**
   * Updates the contact name.
   *
   * @param name The new contact name, or null to clear the current one.
   */
  public async setName(name: string): Promise<void> {
    // TODO
  }

  /**
   * Returns a ContactAvatar object representing the contact profile picture, or null if there is no
   * such information available.
   */
  public getAvatar(): ContactAvatar {
    // TODO
    return null;
  }

  /**
   * Sets the contact avatar picture.
   *
   * @param avatar The new contact avatar picture, or null to clear the current one.
   */
  public async setAvatar(avatar: ContactAvatar): Promise<void> {
    // TODO
  }

  /**
   * Sends a notification to the notification manager of a distant friend's Trinity instance.
   *
   * @param remoteNotification The notification content.
   *
   * @returns A promise that can be awaited and catched in case or error.
   */
  public async sendRemoteNotification(remoteNotification: RemoteNotificationRequest): Promise<void> {
    // TODO
  }

  /**
   * Allow or disallow receiving remote notifications from this contact.
   *
   * @param allowNotifications True to receive notifications, false to reject them.
   */
  public async setAllowNotifications(allowNotifications: boolean) {
    // TODO
  }

  /**
   * Tells whether the contact is currently online or not.
   */
  public async getOnlineStatus(): Promise<OnlineStatus> {
    // TODO
    return null;
  }
}

/**
 * Whether others can see this user's online status.
 * Default: STATUS_IS_VISIBLE
 */
export enum OnlineStatusMode {
  /** User's contacts can see if he is online or offline. */
  STATUS_IS_VISIBLE = 0,
  /** User's contacts always see user as offline. */
  STATUS_IS_HIDDEN = 1
}

/**
 * Online status of a contact.
 */
export enum OnlineStatus {
  /** Contact is currently online. */
  OFFLINE = 0,
  /** Contact is currently offline. */
  ONLINE = 1
}

/**
 * Mode for accepting peers invitation requests.
 * Default: MANUALLY_ACCEPT
 */
export const enum InvitationRequestsMode {
  /** Manually accept all incoming requests. */
  MANUALLY_ACCEPT = 0,
  /** Automatically accept all incoming requests as new contacts. */
  AUTO_ACCEPT = 1,
  /** Automatically reject all incoming requests. */
  AUTO_REJECT = 2
}


@Injectable({
  providedIn: 'root'
})
export class ContactNotifierService {
  constructor(private platform: Platform) {
    this.platform.ready().then(() => {
    });
  }

  /**
   * Returns DID-session specific carrier address for the current user. This is the address
   * that can be shared with future contacts so they can send invitation requests.
   *
   * @returns The currently active carrier address on which user can be reached by (future) contacts.
   */
  public async getCarrierAddress(): Promise<string> {
    // TODO
    return null;
  }

  /**
   * Retrieve a previously added contact from his DID.
   *
   * @param did The contact's DID.
   */
  public async resolveContact(did: string): Promise<Contact> {
    // TODO
    return null;
  }

  /**
   * Remove an existing contact. This contact stops seeing user's online status, can't send notification
   * any more.
   *
   * @param did DID of the contact to remove
   */
  public async removeContact(did: string) {
    // TODO
  }

  /**
   * Returns the list of all contacts.
   */
  public async getAllContacts(): Promise<Contact[]> {
    // TODO
    return [];
  }

  /**
   * Listen to changes in contacts online status.
   *
   * @param onStatusChanged Called every time a contact becomes online or offline.
   * @param onError Called in case or error while registering this listener.
   */
  public async setOnlineStatusListener(onStatusChanged: (contact: Contact, status: OnlineStatus) => void, onError?: (error: string) => void) {
    // TODO
  }

  /**
   * Changes the online status mode, that decides if user's contacts can see his online status or not.
   *
   * @param onlineStatusMode Whether contacts can see user's online status or not.
   */
  public async setOnlineStatusMode(onlineStatusMode: OnlineStatusMode) {
    // TODO
  }

  /**
   * Returns the current online status mode.
   */
  public async getOnlineStatusMode(): Promise<OnlineStatusMode> {
    // TODO
    return null;
  }

  /**
   * Sends a contact request to a peer. This contact will receive a notification about this request
   * and can choose to accept the invitation or not.
   *
   * In case the invitation is accepted, both peers become friends on carrier and in this contact notifier and can
   * start sending remote notifications to each other.
   *
   * Use invitation accepted listener API to get informed of changes.
   *
   * @param did Target contact DID.
   * @param carrierAddress Target carrier address. Usually shared privately or publicly by the future contact.
   */
  public async sendInvitation(did: string, carrierAddress: string) {
    // TODO
  }

  /**
   * Accepts an invitation sent by a remote peer. After accepting an invitation, a new contact is saved
   * with his did and carrier addresses. After that, this contact can be resolved as a contact object
   * from his did string.
   *
   * @param invitationId Received invitation id.
   *
   * @returns The generated contact
   */
  public async acceptInvitation(invitationId: string): Promise<Contact> {
    // TODO
    return null;
  }

  /**
   * Rejects an invitation sent by a remote peer. This inviation is permanently deleted.
   * The invitation is rejected only locally. The sender is not aware of it.
   *
   * @param invitationId Received invitation id.
   */
  public async rejectInvitation(invitationID: string) {
    // TODO
  }

  /**
   * Registers a listener to know when a previously sent invitation has been accepted.
   * Currently, it's only possible to know when an invitation was accepted, but not when
   * it was rejected.
   *
   * @param onInvitationAccepted Called whenever an invitation has been accepted.
   */
  public async setOnInvitationAcceptedListener(onInvitationAccepted: (contact: Contact) => void) {
    // TODO
  }

  /**
   * Configures the way invitations are accepted: manually, or automatically.
   *
   * @param mode Whether invitations should be accepted manually or automatically.
   */
  public async setInvitationRequestsMode(mode: InvitationRequestsMode) {
    // TODO
  }

  /**
   * Returns the way invitations are accepted.
   */
  public async getInvitationRequestsMode(): Promise<InvitationRequestsMode> {
    // TODO
    return null;
  }
}