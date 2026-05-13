// キャッシュ（保存）する箱の名前。バージョンを変えると古いキャッシュを捨てて新しく作り直します。
const CACHE_NAME = 'point-app-v1';

// スマホの中に保存しておきたいファイルのリスト
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'app.js'
];

// サービスワーカーがスマホに「インストール」された時に動く処理
self.addEventListener('install', (event) => {
  // 指定したファイルを全部ダウンロードして、キャッシュの箱に保存するまで待つ
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// アプリが何かファイルやデータを「取得（フェッチ）」しようとした時に割り込む処理
self.addEventListener('fetch', (event) => {
  // GAS（Notionのデータ）への通信や、アイコン画像についてはキャッシュを使わない。
  // 常に最新のデータをインターネット（ネットワーク）から取ってくるようにする。
  if (event.request.url.includes('script.google.com') || event.request.url.includes('icon.png')) {
    return; // 何もせずにそのままインターネットへ通信させる
  }
  
  // それ以外のファイル（HTMLやCSSなど）の要求だった場合
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // もしスマホの中にキャッシュ（保存されたデータ）があれば、それを素早く返す
        if (response) {
          return response;
        }
        // キャッシュになければ、仕方ないのでインターネットから取得する
        return fetch(event.request);
      })
  );
});