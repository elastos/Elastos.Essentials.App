import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from '../components/sharedcomponents.module';
import { GlobalDirectivesModule } from '../helpers/directives/module';
import { VotingModule } from '../voting/voting.module';
import { NotificationsPage } from './pages/notifications/notifications.page';
import { OnboardPage } from './pages/onboard/onboard.page';
import { TipsPage } from './pages/tips/tips.page';
import { EmptyPage, LauncherRoutingModule } from './routing';

@NgModule({
  declarations: [
    EmptyPage,
    NotificationsPage,
    TipsPage,
    OnboardPage,
    //SafePipe,
  ],
  entryComponents: [
    EmptyPage,
    NotificationsPage,
    TipsPage
  ],
  imports: [
    CommonModule,
    IonicModule,
    HttpClientModule,
    SharedComponentsModule,
    TranslateModule,
    LauncherRoutingModule,
    GlobalDirectivesModule,
    VotingModule // For the vote service
  ],
  providers: [],
  bootstrap: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LauncherModule { }
