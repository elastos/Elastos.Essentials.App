import { DragDropModule } from "@angular/cdk/drag-drop";
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from "src/app/components/sharedcomponents.module";
import { GlobalDirectivesModule } from "src/app/helpers/directives/module";
import { WidgetModule } from "../../module";
import { WidgetChooserComponent } from "./widget-chooser.component";

@NgModule({
  declarations: [
    WidgetChooserComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    TranslateModule,
    DragDropModule,
    FormsModule,
    SharedComponentsModule,
    GlobalDirectivesModule,
    WidgetModule,
    RouterModule.forChild([{
      path: '',
      component: WidgetChooserComponent,
    }])
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class WidgetChooserComponentModule { }
