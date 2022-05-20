import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChooseImportedDIDPage } from './pages/chooseimporteddid/chooseimporteddid.page';
import { CreateIdentityPage } from './pages/createidentity/createidentity';
import { EditProfilePage } from './pages/editprofile/editprofile';
import { ImportDIDPage } from './pages/importdid/importdid';
import { LanguagePage } from './pages/language/language.page';
import { PickIdentityPage } from './pages/pickidentity/pickidentity';
import { PrepareDIDPage } from './pages/preparedid/preparedid';
import { ScanPage } from './pages/scan/scan.page';
import { SettingsDeveloperPage } from './pages/settings-developer/settings-developer.page';
import { SettingsSelectNetPage } from './pages/settings-select-net/settings-select-net.page';
import { SettingsPage } from './pages/settings/settings.page';

const routes: Routes = [
  { path: 'language', component: LanguagePage },
  { path: 'pickidentity', component: PickIdentityPage },
  { path: 'createidentity', component: CreateIdentityPage },
  { path: 'importdid', component: ImportDIDPage },
  { path: 'editprofile', component: EditProfilePage },
  { path: 'chooseimporteddid', component: ChooseImportedDIDPage },
  { path: 'preparedid', component: PrepareDIDPage },
  { path: 'scan', component: ScanPage },
  { path: 'settings', component: SettingsPage },
  { path: 'settings-developer', component: SettingsDeveloperPage },
  { path: 'settings-select-net', component: SettingsSelectNetPage },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DIDSessionsRoutingModule { }
