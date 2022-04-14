import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from '../../components/components.module';
import { AppIdCredentialIssueRequestPage } from './appidcredentialissuerequest/appidcredentialissuerequest';
import { CredentialAccessRequestPage } from './credentialaccessrequest/credentialaccessrequest';
import { CredentialContextImportRequestPage } from './credentialcontextimportrequest/credentialcontextimportrequest';
import { CredentialDeleteRequestPage } from './credentialdeleterequest/credentialdeleterequest';
import { CredentialImportRequestPage } from './credentialimportrequest/credentialimportrequest';
import { CredentialIssueRequestPage } from './credentialissuerequest/credentialissuerequest';
import { HiveBackupCredentialIssueRequestPage } from './hivebackupcredentialissuerequest/hivebackupcredentialissuerequest';
import { RegisterApplicationProfileRequestPage } from './regappprofilerequest/regappprofilerequest';
import { RequestCredentialsPage } from './requestcredentials/requestcredentials';
import { SetHiveProviderRequestPage } from './sethiveproviderrequest/sethiveproviderrequest';
import { SignDigestPage } from './signdigest/signdigest';
import { SignRequestPage } from './signrequest/signrequest';

@NgModule({
    declarations: [
        AppIdCredentialIssueRequestPage,
        HiveBackupCredentialIssueRequestPage,
        RequestCredentialsPage,
        CredentialAccessRequestPage,
        CredentialImportRequestPage,
        CredentialContextImportRequestPage,
        CredentialIssueRequestPage,
        RegisterApplicationProfileRequestPage,
        SetHiveProviderRequestPage,
        SignRequestPage,
        SignDigestPage,
        CredentialDeleteRequestPage
    ],
    imports: [
        SharedComponentsModule,
        ComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule.forChild([
            { path: 'credaccessrequest', component: CredentialAccessRequestPage },
            { path: 'requestcredentials', component: RequestCredentialsPage },
            { path: 'credissuerequest', component: CredentialIssueRequestPage },
            { path: 'credimportrequest', component: CredentialImportRequestPage },
            { path: 'credcontextimportrequest', component: CredentialContextImportRequestPage },
            { path: 'creddeleterequest', component: CredentialDeleteRequestPage },
            { path: 'appidcredissuerequest', component: AppIdCredentialIssueRequestPage },
            { path: 'hivebackupcredissuerequest', component: HiveBackupCredentialIssueRequestPage },
            { path: 'regappprofilerequest', component: RegisterApplicationProfileRequestPage },
            { path: 'sethiveproviderrequest', component: SetHiveProviderRequestPage },
            { path: 'signrequest', component: SignRequestPage },
            { path: 'signdigest', component: SignDigestPage }
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IntentsModule { }