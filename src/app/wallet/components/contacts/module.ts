import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ContactsComponent } from './contacts.component';

@NgModule({
  declarations: [
    ContactsComponent
  ],
  imports: [
    CommonModule,
    SharedComponentsModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    ContactsComponent
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ContactsComponentModule { }
