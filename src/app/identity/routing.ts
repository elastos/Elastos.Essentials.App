import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

const routes: Routes = [
  {
    path: "myprofile",
    loadChildren: "./pages/tabnav/tabnav.module#TabsnavPageModule"
  },
  { path: "countrypicker", loadChildren: ()=>import('./pages/countrypicker/module').then(m => m.CountryPickerModule) },
  { path: "editprofile", loadChildren: ()=>import('./pages/editprofile/module').then(m => m.EditProfileModule) },
  { path: "publish", loadChildren: ()=>import('./pages/publish/module').then(m => m.PublishModule) },
  { path: "credentialdetails", loadChildren: ()=>import('./pages/credentialdetails/module').then(m => m.CredentialDetailsModule) },
  { path: "settings", loadChildren: ()=>import('./pages/settings/module').then(m => m.SettingsModule) },
  { path: 'advanced-settings', loadChildren: ()=>import('./pages/advanced-settings/module').then(m => m.AdvancedSettingsModule) },
  { path: "intents", loadChildren: ()=>import('./pages/intents/module').then(m => m.IntentsModule) },
  { path: "backupdid", loadChildren: ()=>import('./pages/backupdid/module').then(m => m.BackupDIDModule) },
  { path: "verifymnemonics", loadChildren: ()=>import('./pages/verifymnemonics/module').then(m => m.VerifyMnemonicsModule) },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule],
})
export class IdentityRoutingModule { }
