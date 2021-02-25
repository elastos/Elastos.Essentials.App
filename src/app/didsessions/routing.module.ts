import { Component, NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { PickIdentityPage } from './pages/pickidentity/pickidentity';
import { CreateIdentityPage } from './pages/createidentity/createidentity';
import { ImportDIDPage } from './pages/importdid/importdid';
import { VerifyMnemonicsPage } from './pages/verifymnemonics/verifymnemonics';
import { BackupDIDPage } from './pages/backupdid/backupdid';
import { EditProfilePage } from './pages/editprofile/editprofile';
import { LanguagePage } from './pages/language/language.page';
import { ChooseImportedDIDPage } from './pages/chooseimporteddid/chooseimporteddid.page';
import { ScanPage } from './pages/scan/scan.page';

const routes: Routes = [
  { path: 'language', component: LanguagePage },
  { path: 'pickidentity', component: PickIdentityPage },
  { path: 'createidentity', component: CreateIdentityPage },
  { path: 'verifymnemonics', component: VerifyMnemonicsPage },
  { path: 'importdid', component: ImportDIDPage },
  { path: 'backupdid', component: BackupDIDPage },
  { path: 'editprofile', component: EditProfilePage },
  { path: 'chooseimporteddid', component: ChooseImportedDIDPage },
  { path: 'scan', component: ScanPage }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DIDSessionsRoutingModule {}
