# Reduce the initial bundle size

## General rules

- Use lazy **angular routes** (imported modules) and use **one module per screen**, in order to load dependencies only when screens are used.
- Use dynamic imports (in methods) such as ```const MyClass= (await import("...")).MyClass``` instead of root imports. This lets webpack split large bundles into smaller ones.
## STEP ONE: Tracking direct dependencies to big libs to reduce main.js size

- npm run bundle-size-verifier-webpack-json
- on the web page, select only main.js
- Check big libraries and find where they are used in the code
- Use import type and lazyImportXXX() to break the direct dependency link

- Open www/main.js and search for node_modules/LIB_NAME
- Find the webpack_require integer for this lib
- Search this integer in main.js to see who imports this and try to break the dependency.

## STEP TWO: Check loaded bundles when starting, remove unneeded

Even after main.js size is reduced, this probably makes the first screen appear a bit faster, but if many other bundles are loaded as well, things keep getting slow. Try to simply not load/execute unnecessary code when not really needed.

- Open networks tab in chrome dev tool
- Check the list of loaded bundles when doing nothing (just by reloading the app)
- Try to not make some bundles loaded, or reduce the size of some of them