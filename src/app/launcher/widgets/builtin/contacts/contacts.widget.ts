import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ContactsInitService } from 'src/app/contacts/services/init.service';
import { AppmanagerService, RunnableApp } from 'src/app/launcher/services/appmanager.service';
import { App } from 'src/app/model/app.enum';
import { GlobalThemeService } from 'src/app/services/global.theme.service';
import { Widget } from '../../base/widget.interface';

@Component({
  selector: 'widget-contacts',
  templateUrl: './contacts.widget.html',
  styleUrls: ['./contacts.widget.scss'],
})
export class ContactsWidget implements Widget {
  public forSelection: boolean; // Initialized by the widget service

  public app: RunnableApp = {
    id: 'contacts',
    routerContext: App.CONTACTS,
    name: this.translate.instant('launcher.app-contacts'),
    description: this.translate.instant('launcher.app-contacts-description'),
    icon: '/assets/launcher/apps/app-icons/contacts.svg',
    hasWidget: false,
    startCall: () => this.contactsInitService.start()
  };

  constructor(
    public theme: GlobalThemeService,
    private translate: TranslateService,
    public appService: AppmanagerService,
    private contactsInitService: ContactsInitService
  ) { }
}
