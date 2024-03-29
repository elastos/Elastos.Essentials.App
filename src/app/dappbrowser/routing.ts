import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowserPage } from './pages/browser/browser';
import { EditFavoritePage } from './pages/edit-favorite/edit-favorite';
import { HomePage } from './pages/home/home';
import { MenuPage } from './pages/menu/menu';


const routes: Routes = [
  { path: 'home', component: HomePage },
  { path: 'browser', component: BrowserPage },
  { path: 'menu', component: MenuPage },
  { path: 'edit-favorite', component: EditFavoritePage }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class DAppBrowserRoutingModule { }
