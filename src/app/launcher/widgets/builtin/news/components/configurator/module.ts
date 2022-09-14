import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NewsConfiguratorComponent } from './configurator.component';

@NgModule({
  declarations: [
    NewsConfiguratorComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    NewsConfiguratorComponent
  ],
  providers: [
  ],
  entryComponents: [
    NewsConfiguratorComponent
  ],
})
export class NewsConfiguratorComponentsModule { }
