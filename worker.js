const filesToCache = [
  "index.html",
  "VirtualXPLoader.js",
  "VirtualXP.js",
  "VirtualXP.png",

  "VirtualXP.iso",
  "VirtualXP.json",
  "VirtualXP.wasm",
  "VirtualXPBIOS.bin",
  "VirtualXPVGA.bin",

  "src/VirtualXPFavIcon_16x16.png",
  "src/VirtualXPFavIcon_192x192.png",
  "src/VirtualXPFavIcon_512x512.png",
  "src/VirtualXPShare.png",
];

const staticCacheName = "virtualxp-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch((error) => {})
  );
});
