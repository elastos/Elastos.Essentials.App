import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Convenience class to be able to access the angular translate service statically from classes.
 */
@Injectable({
    providedIn: 'root'
})
export class GlobalTranslationService {
    public static instance: GlobalTranslationService = null;

    constructor(public translate: TranslateService) {
        GlobalTranslationService.instance = this;
    }

    public translateInstant(key: string, interpolateParams?: unknown): string {
        return this.translate.instant(key, interpolateParams);
    }
}
