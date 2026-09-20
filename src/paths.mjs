// paths.mjs - resolve a module's own directory, correctly, on any path.
//
// import.meta.url is a URL, so a directory containing a space arrives as %20.
// Reading a file at that literal path fails with ENOENT, which is exactly what
// happened when this repo moved to "D:\10. Apps\jev-atlas". Decode before use.
import path from "node:path";

export function dirOf(importMetaUrl) {
  const p = new URL(importMetaUrl).pathname;      // /D:/10.%20Apps/...
  return path.dirname(decodeURIComponent(p).replace(/^\/([A-Za-z]:)/, "$1"));
}
