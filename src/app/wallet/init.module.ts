/*
* Copyright (c) 2021 Elastos Foundation
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

/****************** Angular ******************/
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClientModule } from '@angular/common/http';

/****************** Ionic ******************/
import { IonicModule } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';

/****************** Services ******************/
import { LocalStorage } from './services/storage.service';
import { Native } from './services/native.service';
import { PopupProvider } from './services/popup.service';

@NgModule({
    declarations: [
    ],
    entryComponents: [
    ],
    imports: [
        IonicModule,
        IonicStorageModule,
        HttpClientModule,
        TranslateModule
    ],
    providers: [
        Clipboard,
        LocalStorage,
        Native,
        PopupProvider,
        WebView
    ],
    bootstrap: [],
    schemas: []
})
export class WalletInitModule { }
