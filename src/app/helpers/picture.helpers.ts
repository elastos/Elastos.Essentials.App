import { Logger } from "../logger";

interface Mime {
  mime: string;
  pattern: (number | undefined)[];
}

const imageMimes: Mime[] = [
  {
    mime: 'image/png',
    pattern: [0x89, 0x50, 0x4e, 0x47]
  },
  {
    mime: 'image/jpeg',
    pattern: [0xff, 0xd8, 0xff]
  },
  {
    mime: 'image/gif',
    pattern: [0x47, 0x49, 0x46, 0x38]
  },
  {
    mime: 'image/webp',
    pattern: [0x52, 0x49, 0x46, 0x46, undefined, undefined, undefined, undefined, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50],
  }
];

/**
 * Encodes a raw binary picture data into a base64 string.
 * Ex: âPNG   IHDR... ---> "iVe89...."
 */
export function rawImageToBase64(rawImageData: Buffer): string {
  if (!rawImageData)
    return null;

  return Buffer.from(rawImageData).toString("base64");
}

/**
 * Converts a base64 encoded raw binary picture data into its original raw binary buffer.
 * Ex: "iVe89...." ---> âPNG   IHDR...
 */
export function base64ImageToBuffer(base64Picture: string): Buffer {
  return Buffer.from(base64Picture, "base64");
}

/**
 * Converts a raw binary picture data to a base64 data url usable on UI.
 * Ex: âPNG   IHDR... ---> "data:image/png;base64,iVe89...."
 */
export async function rawImageToBase64DataUrl(rawImageData: Buffer): Promise<string> {
  if (!rawImageData)
    return null;

  let mimeType = await pictureMimeType(rawImageData);
  if (!mimeType) {
    Logger.warn("picturehelper", "Unable to extract mime type from picture buffer. rawImageToBase64DataUrl() returns null picture.");
    return null;
  }

  return "data:" + mimeType + ";base64," + rawImageToBase64(rawImageData);
}

/**
 * From "data:image/png;base64,iVe89...." to "iVe89...."
 *
 */
export function dataUrlToRawImageData(dataUrl: string): string {
  let commaIndex = dataUrl.indexOf(",");
  const safeGuardIndex = 30; // Assume that if we can't find a comma in those N first characters, this may not be a data url
  if (commaIndex < 0 || commaIndex > safeGuardIndex)
    throw new Error("The given data url seems to be invalid");

  return dataUrl.substring(commaIndex + 1);
}

/**
 * Returns a 1x1 px fully transparent picture, encoded as base64 data url.
 * Use https://png-pixel.com/ to generate.
 */
export function transparentPixelIconDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
}

function isMime(bytes: Uint8Array, mime: Mime): boolean {
  return mime.pattern.every((p, i) => !p || bytes[i] === p);
}

/**
 * @param rawOrBase64ImageData Raw picture buffer, or base64 encoded raw picture (not a base64 data url)
 */
export function pictureMimeType(rawOrBase64ImageData: Buffer | string): Promise<string> {
  if (typeof rawOrBase64ImageData === "string")
    rawOrBase64ImageData = base64ImageToBuffer(rawOrBase64ImageData);

  const numBytesNeeded = Math.max(...imageMimes.map(m => m.pattern.length));
  const blob = new Blob([rawOrBase64ImageData.slice(0, numBytesNeeded)]); // Read the needed bytes of the file

  const fileReader = new FileReader();
  let p = new Promise<string>((resolve) => {
    fileReader.onloadend = e => {
      if (e.type == "loadend") {
        //console.log("DEBUG ONLOADEND", e);
        if (!e || !fileReader.result) {
          resolve(null);
          return;
        }

        const bytes = new Uint8Array(fileReader.result as ArrayBuffer);

        const mime = imageMimes.find(mime => isMime(bytes, mime));

        if (!mime)
          resolve(null);
        else
          resolve(mime.mime);
      }
    };
  });

  fileReader.readAsArrayBuffer(blob);

  return p;
}

/**
 *
 * Customize inline SVG content on the fly to make linear gradients unique.
 * This is necessary as there is a bug in browsers when dynamically loading the
 * same inline SVGs multiple times (home screen and widget chooser),
 * there is a conflict between them and some SVG parts disappear.
 *
 * How to use: use string "_custom_id" anywhere in the SVG picture content and it will
 * be replaced with a random ID.
 */
export const customizedSVGID = (svg: SVGElement): SVGElement => {
  svg.innerHTML = svg.innerHTML.replace(/_custom_id/g, `${Math.random()}`);
  return svg;
}

export const compressImage = (pathOrBase64Src: string, maxDimensions: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = pathOrBase64Src;
    img.onload = () => {
      const elem = document.createElement('canvas');

      let width = img.width;
      let height = img.height;

      if (width >= height && width > maxDimensions) {
        // width is the largest dimension, and it's too big.
        height *= maxDimensions / width;
        width = maxDimensions;
      } else if (height > maxDimensions) {
        // either width wasn't over-size or height is the largest dimension
        // and the height is over-size
        width *= maxDimensions / height;
        height = maxDimensions;
      }

      elem.width = width;
      elem.height = height;
      const ctx = elem.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const data = ctx.canvas.toDataURL();
      resolve(data);
    }
    img.onerror = error => reject(error);
  })
}