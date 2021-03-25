import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from '../../components/components.module';
import { AppIdCredentialIssueRequestPage } from './appidcredentialissuerequest/appidcredentialissuerequest';
import { CredentialAccessRequestPage } from './credentialaccessrequest/credentialaccessrequest';
import { CredentialImportRequestPage } from './credentialimportrequest/credentialimportrequest';
import { CredentialIssueRequestPage } from './credentialissuerequest/credentialissuerequest';
import { RegisterApplicationProfileRequestPage } from './regappprofilerequest/regappprofilerequest';
import { SetHiveProviderRequestPage } from './sethiveproviderrequest/sethiveproviderrequest';
import { SignRequestPage } from './signrequest/signrequest';

@NgModule({
    declarations: [
        AppIdCredentialIssueRequestPage,
        CredentialAccessRequestPage,
        CredentialImportRequestPage,
        CredentialIssueRequestPage,
        RegisterApplicationProfileRequestPage,
        SetHiveProviderRequestPage,
        SignRequestPage
    ],
    imports: [
        SharedComponentsModule,
        ComponentsModule,
        CommonModule,
        TranslateModule,
        RouterModule.forChild([
            { path: 'appidcredissuerequest', component: AppIdCredentialIssueRequestPage },
            { path: 'credaccessrequest', component: CredentialAccessRequestPage },
            { path: 'credissuerequest', component: CredentialIssueRequestPage },
            { path: 'credimportrequest', component: CredentialImportRequestPage },
            { path: 'regappprofilerequest', component: RegisterApplicationProfileRequestPage },
            { path: 'sethiveproviderrequest', component: SetHiveProviderRequestPage },
            { path: 'signrequest', component: SignRequestPage }
        ])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IntentsModule {}