import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { MyProfilePage } from "../../pages/myprofile/myprofile";
import { ProfilePage } from "../../pages/profile/profile";
import { CredentialsPage } from "../../pages/credentials/credentials";
import { TranslateModule } from "@ngx-translate/core";

import { Routes, RouterModule } from "@angular/router";

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
    ],
  },
  {
    path: "",
    redirectTo: "/myprofile/myprofile/home",
  },
];

// export class CustomTranslateLoader implements TranslateLoader {
//   public getTranslation(lang: string): Observable<any> {
//     return Observable.create((observer) => {
//       switch (lang) {
//         case "zh":
//           observer.next(zh);
//           break;
//         case "fr":
//           observer.next(fr);
//           break;
//         case "en":
//         default:
//           observer.next(en);
//       }

//       observer.complete();
//     });
//   }
// }

// export function TranslateLoaderFactory() {
//   return new CustomTranslateLoader();
// }

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    //TabsnavPageRoutingModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
  ],
  entryComponents: [MyProfilePage],
  declarations: [TabnavPage, MyProfilePage, ProfilePage, CredentialsPage],
})
export class TabsnavPageModule {}
