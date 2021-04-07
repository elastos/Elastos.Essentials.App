import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { TabnavPage } from "./tabnav.page";
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { ComponentsModule } from "src/app/launcher/components/components.module";
import { CommonModule } from "@angular/common";
import { TranslateModule } from "@ngx-translate/core";
import { IonicModule } from "@ionic/angular";
import { FormsModule } from "@angular/forms";

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
            loadChildren: ()=>import('../myprofile/module').then(m => m.MyProfileModule)
          },
        ],
      },
      {
        path: "profile",
        children: [
          {
            path: "",
            loadChildren: ()=>import('../profile/module').then(m => m.ProfileModule)
          },
        ],
      },
      {
        path: "credentials",
        children: [
          {
            path: "",
            loadChildren: ()=>import('../credentials/module').then(m => m.CredentialsModule)
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
    ComponentsModule,
    FormsModule,
    CommonModule,
    TranslateModule,
    RouterModule.forChild(routes),
  ],
  entryComponents: [],
  declarations: [TabnavPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TabsnavPageModule {}
