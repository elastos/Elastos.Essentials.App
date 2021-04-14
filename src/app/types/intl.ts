/**
 * TEMPORARY WORKAROUND:
 * This fixes the fact that @formatjs, used by svelte, used by the elastos connectivity sdk,
 * needs types from "Intl" that are defined only from es2020. As we HAVE to target es2015 because
 * angular supports es2015 only (zone.js cannot detect await calls), we have to fake those types here.
 *
 * TODO: when angular includes "https://github.com/angular/angular-cli/pull/19871" in a release, we
 * will have to upgrade angular, and at that time we can upgrade our tsconfig to use es2020 everywhere
 * and remove this Intl declaration (below).
 */

declare namespace Intl {
    type RelativeTimeFormatUnit = any;
    type RelativeTimeFormat = any;
    type RelativeTimeFormatPart = any;
    type RelativeTimeFormatOptions = any;
    type ResolvedRelativeTimeFormatOptions = any;
    //type NumberFormatPart = any;
    //type NumberFormatPartTypes = any;
}