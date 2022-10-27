import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ListPage } from '../list/list.page';
import { NodeSliderComponent as VoteNodeSliderComponent } from '../list/node-slider/node-slider.component';
import { MyVotesPage } from '../my-votes/my-votes.page';
import { NodeSliderComponent as UpdateNodeSliderComponent } from '../my-votes/node-slider/node-slider.component';
import { NodeSliderComponent as SearchNodeSliderComponent } from '../search/node-slider/node-slider.component';
import { SearchPage } from '../search/search.page';
import { StatsPage } from '../stats/stats.page';
import { MenuPage } from './menu.page';


const routes: Routes = [
  {
    path: 'menu',
    component: MenuPage,
    children: [
      {
        path: 'list',
        children: [
          {
            path: "",
            component: ListPage,
          }
        ]
      },
      {
        path: 'stats',
        children: [
          {
            path: "",
            component: StatsPage,
          }
        ]
      },
      {
        path: 'search',
        children: [
          {
            path: "",
            component: SearchPage,
          }
        ]
      },
      {
        path: 'my-votes',
        children: [
          {
            path: "",
            component: MyVotesPage,
          }
        ]
      },
    ]
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedComponentsModule,
    RouterModule.forChild(routes),
    TranslateModule
  ],
  declarations: [
    MenuPage,
    ListPage,
    StatsPage,
    SearchPage,
    MyVotesPage,
    VoteNodeSliderComponent,
    SearchNodeSliderComponent,
    UpdateNodeSliderComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MenuPageModule {}
