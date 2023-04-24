import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@awesome-cordova-plugins/clipboard/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { DeleteComponent } from './components/delete/delete.component';
import { AppDetailsPage } from './pages/appdetails/appdetails';
import { CreateAppPage } from './pages/createapp/createapp';
import { HomePage } from './pages/home/home';
import { DeveloperToolsRoutingModule } from './routing';



@NgModule({
  declarations: [
    HomePage,
    CreateAppPage,
    AppDetailsPage,
    DeleteComponent,
  ],
  imports: [
    CommonModule,
    SharedComponentsModule,
    DeveloperToolsRoutingModule,
    HttpClientModule,
    FormsModule,
    IonicStorageModule,
    IonicModule,
    TranslateModule
  ],
  bootstrap: [],
  entryComponents: [
    HomePage,
    CreateAppPage,
    AppDetailsPage,
    DeleteComponent
  ],
  providers: [
    Platform,
    Clipboard
  ]
})
export class DeveloperToolsModule {}
