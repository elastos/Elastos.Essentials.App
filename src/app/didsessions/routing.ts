import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PickIdentityPage } from './pages/pickidentity/pickidentity';
import { CreateIdentityPage } from './pages/createidentity/createidentity';
import { ImportDIDPage } from './pages/importdid/importdid';
import { EditProfilePage } from './pages/editprofile/editprofile';
import { LanguagePage } from './pages/language/language.page';
import { ChooseImportedDIDPage } from './pages/chooseimporteddid/chooseimporteddid.page';
import { ScanPage } from './pages/scan/scan.page';
import { PrepareDIDPage } from './pages/preparedid/preparedid';

const routes: Routes = [
  { path: 'language', component: LanguagePage },
  { path: 'pickidentity', component: PickIdentityPage },
  { path: 'createidentity', component: CreateIdentityPage },
  { path: 'importdid', component: ImportDIDPage },
  { path: 'editprofile', component: EditProfilePage },
  { path: 'chooseimporteddid', component: ChooseImportedDIDPage },
  { path: 'preparedid', component: PrepareDIDPage },
  { path: 'scan', component: ScanPage }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DIDSessionsRoutingModule {}
