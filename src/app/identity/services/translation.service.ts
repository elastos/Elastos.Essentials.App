import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Convenience class to be able to access the angular translate service statically from classes.
 */
@Injectable({
    providedIn: 'root'
})
export class TranslationService {
    public static instance: TranslationService = null;

    constructor(public translate: TranslateService) {
        TranslationService.instance = this;
    }

    public translateInstant(key: string): string {
        return this.translate.instant(key);
    }
}
