## FATAL ERROR: ... JavaScript heap out of memory

NODE_OPTIONS=--max_old_space_size=8192 ionic cordova run android --livereload --external

## Analyze and reduce dependencies size

- npm run bundle-size-verifier-source-map

or

- npm run bundle-size-verifier-webpack-json