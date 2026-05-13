// キャッシュ（保存）する箱の名前。バージョン（v1）を変えると古いキャッシュを捨てて新しく作り直します。
const CACHE_NAME = 'point-app-v1';

// スマホの中に保存しておきたいファイルのリストです（オフラインでも表示できるようにするため）
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'app.js'
];

// サービスワーカーがスマホに「インストール」された時に動く処理です
self.addEventListener('install', (event) => {
  // 指定したファイルを全部ダウンロードして、キャッシュの箱に保存するまで待ちます
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// アプリが何かファイルやデータを「取得（フェッチ）」しようとした時に割り込む処理です
self.addEventListener('fetch', (event) => {
  // GAS（Notionのデータ）への通信や、アイコン画像についてはキャッシュ（過去の保存データ）を使いません。
  // ポイ活データは常に最新である必要があるため、必ずインターネットから取ってくるようにします。
  if (event.request.url.includes('script.google.com') || event.request.url.includes('icon.png')) {
    return; // 何もせずにそのままインターネットへ通信させます
  }
  
  // それ以外のファイル（HTMLやCSSなど）の要求だった場合
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // もしスマホの中にキャッシュ（保存されたデータ）があれば、それを素早く返します（爆速で画面が開きます）
        if (response) {
          return response;
        }
        // キャッシュになければ、仕方ないのでインターネットから取得します
        return fetch(event.request);
      })
  );
});