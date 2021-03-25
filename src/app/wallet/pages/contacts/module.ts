import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ContactCreatePage } from './contact-create/contact-create.page';
import { ContactListPage } from './contact-list/contact-list.page';
import { ContactsPage } from './contact/contacts.page';

@NgModule({
    declarations: [
        ContactsPage,
        ContactCreatePage,
        ContactListPage
    ],
    imports: [
        SharedComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule.forChild([
            { path: '', component: ContactsPage },
            { path: 'list', component: ContactListPage },
            { path: 'create', component: ContactCreatePage }
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ContactsModule {}