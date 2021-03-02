import { Component, NgModule } from "@angular/core";
import { RouterModule, Routes, NoPreloading } from "@angular/router";

import { CountryPickerPage } from "./pages/countrypicker/countrypicker";
import { EditProfilePage } from "./pages/editprofile/editprofile";
import { PublishPage } from "./pages/publish/publish";
import { CredentialAccessRequestPage } from "./pages/credentialaccessrequest/credentialaccessrequest";
import { CredentialListPage } from "./pages/credential/list/credentiallist";
import { CredentialCreatePage } from "./pages/credential/create/credentialcreate";
import { CredentialBackupPage } from "./pages/credential/backup/credentialbackup";
import { RegisterApplicationProfileRequestPage } from "./pages/regappprofilerequest/regappprofilerequest";
import { SetHiveProviderRequestPage } from "./pages/sethiveproviderrequest/sethiveproviderrequest";
import { SignRequestPage } from "./pages/signrequest/signrequest";
import { AppIdCredentialIssueRequestPage } from "./pages/appidcredentialissuerequest/appidcredentialissuerequest";
import { CredentialIssueRequestPage } from "./pages/credentialissuerequest/credentialissuerequest";
import { DeleteDIDPage } from "./pages/deletedid/deletedid";
import { NotSignedInPage } from "./pages/notsignedin/notsignedin";
import { CredentialImportRequestPage } from "./pages/credentialimportrequest/credentialimportrequest";
import { CredentialDetailsPage } from "./pages/credentialdetails/credentialdetails.page";
import { SettingsPage } from "./pages/settings/settings.page";
import { AdvancedSettingsPage } from "./pages/advanced-settings/advanced-settings.page";
import { CredentialsPage } from "./pages/credentials/credentials";
import { MyProfilePage } from "./pages/myprofile/myprofile";
import { ProfilePage } from "./pages/profile/profile";
import { TabnavPage } from "./pages/tabnav/tabnav.page";
import { ExportmnemonicPage } from "./pages/exportmnemonic/exportmnemonic.page";

const routes: Routes = [
  // { path: '', redirectTo: '', pathMatch: 'full' }, // No default route, services will decide this by themselves.
  { path: "countrypicker", component: CountryPickerPage },
  { path: "createidentity", component: EditProfilePage },
  { path: "editprofile", component: EditProfilePage },
  { path: "publish", component: PublishPage },
  {
    path: "myprofile",
    component: TabnavPage,
    children: [
      {
        path: "home",
        children: [
          {
            path: "",
            component: MyProfilePage,
          },
        ],
      },
      {
        path: "profile",
        children: [
          {
            path: "",
            component: ProfilePage,
          },
        ],
      },

      // {
      //   path: "profile",
      //   loadChildren: "../products/products.module#ProductsPageModule",
      // },
      {
        path: "credentials",
        children: [
          {
            path: "",
            component: CredentialsPage,
          },
        ],
      },
    ]
  },

  { path: "credentiallist", component: CredentialListPage },

  { path: "deletedid", component: DeleteDIDPage },
  { path: "credentialcreate", component: CredentialCreatePage },
  { path: "credentialbackup", component: CredentialBackupPage },
  { path: "credentialdetails", component: CredentialDetailsPage },

  // Intents
  { path: "appidcredissuerequest", component: AppIdCredentialIssueRequestPage },
  { path: "credaccessrequest", component: CredentialAccessRequestPage },
  { path: "credissuerequest", component: CredentialIssueRequestPage },
  { path: "credimportrequest", component: CredentialImportRequestPage },
  {
    path: "regappprofilerequest",
    component: RegisterApplicationProfileRequestPage,
  },
  { path: "sethiveproviderrequest", component: SetHiveProviderRequestPage },
  { path: "signrequest", component: SignRequestPage },
  { path: "notsignedin", component: NotSignedInPage },
  { path: "settings", component: SettingsPage },
  { path: 'advanced-settings', component: AdvancedSettingsPage },
  {
    path: "exportmnemonic",
    component: ExportmnemonicPage
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
