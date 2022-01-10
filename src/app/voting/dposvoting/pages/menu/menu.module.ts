import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { HistoryPage } from '../history/history.page';
import { NodeSliderComponent as SearchNodeSliderComponent } from '../search/node-slider/node-slider.component';
import { SearchPage } from '../search/search.page';
import { StatsPage } from '../stats/stats.page';
import { NodeSliderComponent as TxNodeSliderComponent } from '../tx/node-slider/node-slider.component';
import { TxPage } from '../tx/tx.page';
import { NodeSliderComponent as VoteNodeSliderComponent } from '../vote/node-slider/node-slider.component';
import { VotePage } from '../vote/vote.page';
import { MenuPage } from './menu.page';





const routes: Routes = [
  {
    path: 'menu',
    component: MenuPage,
    children: [
      {
        path: 'vote',
        children: [
          {
            path: "",
            component: VotePage,
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
        path: 'history',
        children: [
          {
            path: "",
            component: HistoryPage,
          }
        ]
      },
      {
        path: 'history/:txid',
        children: [
          {
            path: "",
            component: TxPage,
          }
        ]
      },
    ]
  },
  {
    path: 'home',
    loadChildren: () => import('../home/home.module').then(x => x.HomePageModule)
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
    VotePage,
    StatsPage,
    HistoryPage,
    TxPage,
    SearchPage,
    VoteNodeSliderComponent,
    SearchNodeSliderComponent,
    TxNodeSliderComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MenuPageModule {}
