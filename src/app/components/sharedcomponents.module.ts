import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TitleBarComponent } from './titlebar/titlebar.component';
import { TitlebarmenuitemComponent } from './titlebarmenuitem/titlebarmenuitem.component';
import { AssistPublishingComponent } from './assist-publishing/assist-publishing.component';

@NgModule({
  declarations: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    AssistPublishingComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    TitleBarComponent, 
    TitlebarmenuitemComponent,
    AssistPublishingComponent
  ],
  providers: [
  ],
  entryComponents: [
    TitleBarComponent, 
    TitlebarmenuitemComponent,
    AssistPublishingComponent
  ],
})
export class SharedComponentsModule { }
