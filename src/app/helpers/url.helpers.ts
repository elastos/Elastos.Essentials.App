/**
 * Returns the root domain part of a url.
 * ie: https://my.url.com/path?query --> https://my.url.com
 */
export const urlDomain = (url: string): string => {
  let parts = new URL(url);
  if (!parts)
    return null;

  //console.log("parts", parts);

  return parts.origin;

  //let domain = parts.protocol + "://" + parts.hostname + (parts.port ? `:${parts.port}` : "");
  //console.log("domain", domain);
  //return domain;
}