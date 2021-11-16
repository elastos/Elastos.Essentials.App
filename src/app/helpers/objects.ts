

/**
 * Returns the value inside "o", targeted by the json path "path".
 * ie:
 *   obj = { field: { data: 2 }}
 *   evalObjectFieldPath(obj, "field.data") --> 2
 */
export const evalObjectFieldPath = (o: any, path: string) => {
  path = path.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  path = path.replace(/^\./, '');           // strip a leading dot
  var a = path.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in o) {
      o = o[k];
    } else {
      return;
    }
  }
  return o;
}
