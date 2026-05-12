// キャッシュの名前（バージョンが変わるとキャッシュが更新される）
const CACHE_NAME = 'point-app-v1';
// キャッシュしておくファイルのリスト
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'app.js'
];

// サービスワーカーのインストール時: 指定したファイルをキャッシュに保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// リクエスト発生時: キャッシュがあればそれを使い、ついでにネットワークから最新を取得する（高速化と鮮度の両立）
self.addEventListener('fetch', (event) => {
  // API通信（gas.jsへのアクセス）や画像はキャッシュせず、通常のネットワーク通信を行う
  if (event.request.url.includes('script.google.com') || event.request.url.includes('icon.png')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにヒットしたらそれを返す
        if (response) {
          return response;
        }
        // キャッシュにない場合はネットワークから取得
        return fetch(event.request);
      })
  );
});