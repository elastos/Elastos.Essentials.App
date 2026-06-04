## FATAL ERROR: ... JavaScript heap out of memory

NODE_OPTIONS=--max_old_space_size=8192 ionic cordova run android --livereload --external

## Analyze and reduce dependencies size

- npm run bundle-size-verifier-source-map

or

- npm run bundle-size-verifier-webpack-json

## How to colorize SVG pictures?

- Import InlineSVGModule in screen's module
- Replace <img src=""> with <div inlineSVG="path_to_assets"></div>
- set CSS "color" in screen's SCSS file
- use fill="currentColor" or stroke="currentColor" in the modified SVG

Note: The "currentColor" trick works only for inline SVG, this is why we need a special module for this.