/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "8813340ab13ffe3fd9c8759a719f43f1"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "b19f9c40d7559bfe63cf7949ac06f71d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0cc45e8e16e64a54de714b0d6ef0ed13"
  }, {
    "url": "pwa-192x192.png",
    "revision": "3b64d7409b33daa057f291917efc7726"
  }, {
    "url": "manifest.json",
    "revision": "d2f04b85c441bfe0e8f87fa4910df5ae"
  }, {
    "url": "lda_city_master_data.json",
    "revision": "690433c00313fe31d8880c17e13fa2bf"
  }, {
    "url": "index.html",
    "revision": "c948216926d719ea10d1a026119a89fc"
  }, {
    "url": "icon.svg",
    "revision": "436a2ea7b609e2b90438419c828aafff"
  }, {
    "url": "favicon.png",
    "revision": "f535635525ee28c6fd9ab91e838ef2ea"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d8235cb1bf57b9b9c38ea652464a0cab"
  }, {
    "url": "assets/purify.es.js",
    "revision": null
  }, {
    "url": "assets/index.es.js",
    "revision": null
  }, {
    "url": "assets/index.css",
    "revision": null
  }, {
    "url": "assets/app.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d8235cb1bf57b9b9c38ea652464a0cab"
  }, {
    "url": "favicon.png",
    "revision": "f535635525ee28c6fd9ab91e838ef2ea"
  }, {
    "url": "icon.svg",
    "revision": "436a2ea7b609e2b90438419c828aafff"
  }, {
    "url": "lda_city_master_data.json",
    "revision": "690433c00313fe31d8880c17e13fa2bf"
  }, {
    "url": "pwa-192x192.png",
    "revision": "3b64d7409b33daa057f291917efc7726"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0cc45e8e16e64a54de714b0d6ef0ed13"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "b19f9c40d7559bfe63cf7949ac06f71d"
  }, {
    "url": "manifest.webmanifest",
    "revision": "62bd82ed38e41dc10384ea380d784bf4"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/unpkg\.com\/leaflet.*/i, new workbox.CacheFirst({
    "cacheName": "leaflet-assets-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
