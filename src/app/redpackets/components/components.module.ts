import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { GrabComponent } from './grab/grab.component';
import { PeekComponent } from './peek/peek.component';

@NgModule({
  declarations: [
    GrabComponent,
    PeekComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    SharedComponentsModule
  ],
  exports: [
    GrabComponent,
    PeekComponent
  ],
  providers: [
  ],
  entryComponents: [
    GrabComponent,
    PeekComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
