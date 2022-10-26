import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebView } from '@awesome-cordova-plugins/ionic-webview/ngx';
import { IonicModule, Platform } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { StakingHomePage } from './pages/home/home.page';
import { VoteSliderComponent } from './pages/home/vote-slider/vote-slider.component';
import { StakePage } from './pages/stake/stake.page';
import { UnstakePage } from './pages/unstake/unstake.page';
import { WithdrawPage } from './pages/withdraw/withdraw.page';
import { StakingRoutingModule } from './routing';

@NgModule({
    declarations: [
        StakingHomePage,
        StakePage,
        UnstakePage,
        WithdrawPage,
        VoteSliderComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        HttpClientModule,
        StakingRoutingModule,
        IonicModule,
        IonicStorageModule,
        SharedComponentsModule,
        GlobalDirectivesModule
    ],
    bootstrap: [],
    entryComponents: [
        StakingHomePage,
        StakePage,
        UnstakePage,
        WithdrawPage,
    ],
    providers: [
        Platform,
        WebView
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class StakingModule { }
