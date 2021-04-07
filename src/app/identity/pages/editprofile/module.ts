import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { SharedComponentsModule } from 'src/app/components/sharedcomponents.module';
import { ComponentsModule } from '../../components/components.module';
import { PictureComponent } from '../../components/picture/picture.component';
import { ProfileEntryPickerPage } from '../profileentrypicker/profileentrypicker';
import { EditProfilePage } from './editprofile';

@NgModule({
    declarations: [
        EditProfilePage,
        ProfileEntryPickerPage,
        PictureComponent
    ],
    imports: [
        SharedComponentsModule,
        ComponentsModule,
        CommonModule,
        FormsModule,
        IonicModule,
        TranslateModule,
        RouterModule.forChild([{ path: '', component: EditProfilePage }])
    ],
    exports: [RouterModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EditProfileModule {}