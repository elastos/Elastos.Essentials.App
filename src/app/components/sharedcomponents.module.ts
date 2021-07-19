import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { TitleBarComponent } from './titlebar/titlebar.component';
import { TitlebarmenuitemComponent } from './titlebarmenuitem/titlebarmenuitem.component';
import { DIDPublishingComponent } from './did-publishing/did-publishing.component';

@NgModule({
  declarations: [
    TitleBarComponent,
    TitlebarmenuitemComponent,
    DIDPublishingComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule
  ],
  exports: [
    TitleBarComponent, 
    TitlebarmenuitemComponent,
    DIDPublishingComponent
  ],
  providers: [
  ],
  entryComponents: [
    TitleBarComponent, 
    TitlebarmenuitemComponent,
    DIDPublishingComponent
  ],
})
export class SharedComponentsModule { }
