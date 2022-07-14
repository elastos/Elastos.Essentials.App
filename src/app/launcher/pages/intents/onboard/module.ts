import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GlobalDirectivesModule } from 'src/app/helpers/directives/module';
import { OnboardIntentPage } from './onboard.page';

@NgModule({
  declarations: [
    OnboardIntentPage
  ],
  imports: [
    CommonModule,
    IonicModule,
    SharedComponentsModule,
    TranslateModule,
    GlobalDirectivesModule,
    RouterModule.forChild([{ path: '', component: OnboardIntentPage }])
  ],
  providers: [],
  bootstrap: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OnboardIntentPageModule { }
