/**
 * Converts a raw binary picture data to a base64n data url usable on UI.
 * Ex: âPNG   IHDR... ---> "data:image/png;base64,iVe89...."
 */
export function rawImageToBase64DataUrl(rawImageData: Buffer): string {
  if (!rawImageData)
    return null;

  // TODO: COULD BE JPG OR SOMETHING ELSE, NOT ALWAYS PNG!
  return "data:image/png;base64,"+Buffer.from(rawImageData).toString("base64");
}

/**
 * Returns a 1x1 px fully transparent picture, encoded as base64 data url.
 * Use https://png-pixel.com/ to generate.
 */
export function transparentPixelIconDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
}