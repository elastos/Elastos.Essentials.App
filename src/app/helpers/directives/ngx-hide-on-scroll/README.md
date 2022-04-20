## Introduction

Original code and examples:
https://github.com/denkan/ngx-hide-on-scroll
https://github.com/TheJLifeX/ngx-hide-on-scroll/pull/1

Forked from:
https://www.npmjs.com/package/ngx-hide-on-scroll?amp=1

Modified by the Essentials team to work focus on <ion-content> (didn't work, different scroll event)

## How to use

<ion-content> elements only:

```
<ion-content ngxDetectHideOnScroll scrollEvents>
```

Fixed bottom footer element:

```
<div class="footer-class" ngxHideOnScroll>
```

Footer CSS:

```
transition: transform 0.3s ease-in-out; // Transition on hide/show.
```