import { CommonModule } from "@angular/common";
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule, Routes } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { TranslateModule } from "@ngx-translate/core";
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { TabnavPage } from "./tabnav.page";

const routes: Routes = [
  {
    path: "myprofile",
    component: TabnavPage,
    children: [
      {
        path: "home",
        children: [
          {
            path: "",
            loadChildren: () => import('../myprofile/module').then(m => m.MyProfileModule)
          },
        ],
      },
      {
        path: "profile",
        children: [
          {
            path: "",
            loadChildren: () => import('../profile/module').then(m => m.ProfileModule)
          },
        ],
      },
      {
        path: "credentials",
        children: [
          {
            path: "",
            loadChildren: () => import('../credentials/module').then(m => m.CredentialsModule)
          },
        ],
      },
    ],
  }
];

@NgModule({
  imports: [
    IonicModule,
    SharedComponentsModule,
    FormsModule,
    CommonModule,
    TranslateModule,
    RouterModule.forChild(routes),
  ],
  entryComponents: [],
  declarations: [TabnavPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TabsnavPageModule { }
