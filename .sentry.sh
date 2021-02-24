sentry-cli releases --org elastos new -p launcher default --finalize
sentry-cli releases --org elastos -p launcher files default upload-sourcemaps www/ --rewrite --strip-common-prefix
