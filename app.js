// ===============================================
// 1. データ層 (Data Layer)
// アプリ全体で使うルールや「設定値」をまとめておきます。
// ロジック（計算や画面作り）とは切り離すことで管理しやすくします。
// ===============================================

const CONFIG = {
  // GAS（Google Apps Script）の連携URLを設定します
  gasUrl: "https://script.google.com/macros/s/AKfycbyXX9fetYv5GYnUQc39hxWfnQ6_xwEJru-GG0FYoHghjebLH5lbWlkHmfihrSCf_Kni1g/exec",
  
  // ポイ活アプリの一覧。名前と（入力用）という文字列がセットになっています
  apps: [
    "1.トリマ（入力用）", "2.アルコイン（入力用）", "3.レシチャレ（入力用）",
    "4.powl（入力用）", "5.プラリー（入力用）", "6.もふポ（入力用）",
    "7.ビーンズ（入力用）", "8.ポイントインカム（入力用）", "9.ポイントタウン（入力用）",
    "10.シェアフル（入力用）", "11.Pint（入力用）", "12.PUI（入力用）",
    "13.おぢポ（入力用）", "14.ぽいころ（入力用）", "15.ロコネ（入力用）",
    "16.YONQ（入力用）", "17.Moneywalk（入力用）", "18.Cashwalk（入力用）",
    "19.エブリポイント（入力用）", "20.tokuria walk（入力用）", "21.毎日運動（入力用）",
    "22.noma（入力用）", "23.TikTok Lite（入力用）", "24.トクエル（入力用）",
    "25.オモポ（入力用）", "26.ポイにゃん（入力用）"
  ],
  
  // 各アプリのポイントを日本円に換算するための「割る数（レート）」
  // 例: トリマの115ポイント = 1円
  rates: {
    "1.トリマ（入力用）": 115, "2.アルコイン（入力用）": 10, "3.レシチャレ（入力用）": 110,
    "4.powl（入力用）": 11, "5.プラリー（入力用）": 150, "6.もふポ（入力用）": 90,
    "7.ビーンズ（入力用）": 110, "8.ポイントインカム（入力用）": 10, "9.ポイントタウン（入力用）": 1,
    "10.シェアフル（入力用）": 100, "11.Pint（入力用）": 100, "12.PUI（入力用）": 11,
    "13.おぢポ（入力用）": 9, "14.ぽいころ（入力用）": 15, "15.ロコネ（入力用）": 110,
    "16.YONQ（入力用）": 110, "17.Moneywalk（入力用）": 20, "18.Cashwalk（入力用）": 6,
    "19.エブリポイント（入力用）": 110, "20.tokuria walk（入力用）": 110, "21.毎日運動（入力用）": 275,
    "22.noma（入力用）": 120, "23.TikTok Lite（入力用）": 100, "24.トクエル（入力用）": 110,
    "25.オモポ（入力用）": 110, "26.ポイにゃん（入力用）": 120
  }
};

// アプリの「今の状態」を記憶しておく場所
const state = {
  isSubmitting: false, // データ送信中かどうか
  message: { text: "", type: "hidden" }, // 画面に出すメッセージ
  notionStatus: null, // Notionから持ってきたデータを入れておく
  lastResetDate: null, // 最後に夜間リセットをした日付
  activeTab: 'input' // 現在開いているタブ（初期値は 'input' ＝入力画面）
};

// ===============================================
// 2. ユーティリティ関数 (Utilities)
// 何度も使う便利な小さな道具（関数）です。
// ===============================================

// 指定したHTML要素の中身を空っぽにする道具
function clearElement(element) { element.innerHTML = ''; }

// 日付データを「YYYY-MM-DD」という綺麗な文字の形にする道具
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0'); // 月を2桁にする（3月→03）
  const d = String(date.getDate()).padStart(2, '0'); // 日を2桁にする
  return `${y}-${m}-${d}`;
}

// ===============================================
// 3. ロジック層 (Logic Layer)
// データ(CONFIGやstate)を見て、HTMLの見た目を作る処理です。
// ===============================================

// --- HTMLから操作したい部品を見つけて、変数（あだ名）をつけておく ---
const formEl = document.getElementById("data-form");
const dateInputEl = document.getElementById("date-input");
const appsContainerEl = document.getElementById("apps-container");
const submitBtnEl = document.getElementById("submit-button");
const messageEl = document.getElementById("status-message");
const refreshBtnEl = document.getElementById("refresh-button");

const tabInputBtn = document.getElementById("tab-input");
const tabRecordBtn = document.getElementById("tab-record");
const viewInput = document.getElementById("view-input");
const viewRecord = document.getElementById("view-record");
const chartContainer = document.getElementById("chart-container");
const totalYenEl = document.getElementById("total-yen");

// --- 画面の初期化 (Init) ---
// アプリを開いた時に一番最初に実行される処理です。
function init() {
  // 日付入力欄に「今日の日付」をセットする
  const today = new Date();
  dateInputEl.value = formatDate(today);

  // 入力欄のエリアを一旦空っぽにする
  clearElement(appsContainerEl);
  
  // CONFIG.apps のリストを見ながら、アプリの数だけ入力欄を自動で作る
  CONFIG.apps.forEach(appName => {
    // 画面のラベル用には「（入力用）」という文字だけ削って綺麗にする
    const displayName = appName.replace(/（入力用）$/, '').trim();
    
    // 入力欄1つ分のHTMLのかたまりを作る
    const groupDiv = document.createElement("div");
    groupDiv.className = "form-group";
    groupDiv.innerHTML = `
      <label class="input-label">${displayName}</label>
      <span class="total-points" data-app-name="${appName}">合計: ...</span>
      <input type="number" class="input-field app-point-input" data-app-name="${appName}">
    `;
    // 作ったかたまりを画面に追加する
    appsContainerEl.appendChild(groupDiv);
  });

  // カレンダーで日付を変えたら、その日のデータをNotionから取ってくるようにする
  dateInputEl.addEventListener("change", () => {
    if (dateInputEl.value) fetchNotionStatus(dateInputEl.value);
  });

  // 更新ボタンを押した時の処理
  refreshBtnEl.addEventListener("click", () => {
    if (dateInputEl.value) {
      fetchNotionStatus(dateInputEl.value);
    } else {
      state.message = { text: "日付を選択してください", type: "error" };
      render();
    }
  });

  // 送信ボタンを押した時の処理
  formEl.addEventListener("submit", handleFormSubmit);

  // 「入力」タブボタンを押した時の処理
  tabInputBtn.addEventListener("click", () => {
    state.activeTab = 'input'; // 状態を「入力」に変更して
    render(); // 画面を更新する
  });
  
  // 「記録」タブボタンを押した時の処理
  tabRecordBtn.addEventListener("click", () => {
    state.activeTab = 'record'; // 状態を「記録」に変更して
    render(); // 画面を更新する
  });

  // 初回起動時、今日の日付のデータをNotionから取ってくる
  fetchNotionStatus(dateInputEl.value);
  
  // 午前3時のリセット機能を開始する（1分間に1回チェックする）
  checkTimeReset();
  setInterval(checkTimeReset, 60000);
  
  // 今の状態に合わせて画面を描く
  render();
}

// --- 午前3時のリセット機能 ---
// 毎日午前3時になったら、画面の入力欄を空っぽにします。
function checkTimeReset() {
  const now = new Date();
  const todayStr = formatDate(now);
  const hour = now.getHours();

  // 3時以降 ＆ 今日まだリセットしていなければ実行
  if (hour >= 3 && state.lastResetDate !== todayStr) {
    // すべての入力欄を空っぽにして、色も消す
    document.querySelectorAll(".app-point-input").forEach(input => {
      input.value = "";
      input.classList.remove("filled", "unfilled");
    });
    state.lastResetDate = todayStr; // リセットしたことを記憶
    render(); // 画面を更新
  }
  
  // 3時より前（0時〜2時）の場合は、翌日のリセットに備えて記憶を消す
  if (state.lastResetDate && state.lastResetDate !== todayStr && hour < 3) {
    state.lastResetDate = null;
  }
}

// --- Notionからデータを取得する処理 ---
async function fetchNotionStatus(date) {
  // 通信中であることを画面に表示
  document.querySelectorAll(".total-points").forEach(span => span.textContent = "合計: 読み込み中...");
  document.querySelectorAll(".app-point-input").forEach(input => input.classList.remove("filled", "unfilled"));

  try {
    // GAS（Notionの仲介役）にアクセスしてデータを貰う
    const response = await fetch(`${CONFIG.gasUrl}?date=${encodeURIComponent(date)}`);
    const result = await response.json(); // 貰ったデータをJSON（扱いやすいデータ形式）に変換
    
    if (result.status !== "success") throw new Error(result.message || "不明なエラー");
    
    // 取ってきたデータを「state（状態）」に保存する
    state.notionStatus = result;
    // 取ってきたデータを画面の入力欄に当てはめる
    applyNotionStatusToUI(result);
    
    // データが揃ったので画面を更新（これでグラフも描けるようになります）
    render();
    
  } catch (error) {
    state.message = { text: "通信エラー: " + error.message, type: "error" };
    document.querySelectorAll(".total-points").forEach(span => span.textContent = "合計: 取得失敗");
    render();
  }
}

// --- 取ってきたNotionのデータを画面の入力欄に反映させる処理 ---
function applyNotionStatusToUI(notionData) {
  const { existingValues, pastTotal } = notionData;

  // すべての入力欄を一つずつチェックする
  document.querySelectorAll(".app-point-input").forEach(input => {
    const appName = input.getAttribute("data-app-name");
    
    // その日のデータがNotion上に0より大きく存在するか？
    const hasValue = existingValues && existingValues.hasOwnProperty(appName) && existingValues[appName] > 0;
    
    // データがあれば青（filled）、なければ赤（unfilled）のクラスを付ける
    if (hasValue) {
      input.classList.add("filled");
      input.classList.remove("unfilled");
    } else {
      input.classList.add("unfilled");
      input.classList.remove("filled");
    }

    // 過去の合計ポイントを取得
    const baseTotal = pastTotal[appName] || 0;
    
    // データがあれば「過去の合計＋今日の入力値」を入力欄に表示
    if (hasValue) {
      input.value = baseTotal + existingValues[appName];
    } else {
      input.value = ""; // なければ空欄のまま
    }

    // 合計ポイントのテキストを更新する
    const totalSpan = document.querySelector(`.total-points[data-app-name="${appName}"]`);
    if (totalSpan) totalSpan.textContent = `合計： ${baseTotal.toLocaleString()}`;
  });
}

// --- 送信ボタンが押された時の処理 ---
async function handleFormSubmit(e) {
  e.preventDefault(); // 画面がリロードされるのを防ぐ
  state.isSubmitting = true; // 送信中という状態にする
  state.message = { text: "計算してNotionへ送信しています...", type: "info" };
  render();

  // Notionに送るためのデータの箱を作る
  const payload = { date: dateInputEl.value, points: {} };
  
  // 画面に入力されている数値を拾い集める
  const pointInputs = document.querySelectorAll(".app-point-input");
  pointInputs.forEach(input => {
    const appName = input.getAttribute("data-app-name");
    const rawValue = input.value.trim();
    // 空欄じゃなければ箱に入れる（数字に変換して入れる）
    if (rawValue !== "") payload.points[appName] = Number(rawValue);
  });

  try {
    // GAS経由でNotionにデータを送信する
    const response = await fetch(CONFIG.gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.status === "success") {
      state.isSubmitting = false; // 送信完了
      state.message = { text: "Notionへの記録が完了しました！", type: "success" };
      render();
      
      // 送信が終わったら入力欄を一旦空にして、最新データを再取得する
      pointInputs.forEach(input => input.value = "");
      fetchNotionStatus(dateInputEl.value);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    state.isSubmitting = false;
    state.message = { text: "エラーが発生しました: " + error.message, type: "error" };
    render();
  }
}

// --- ★記録タブのグラフを描画する処理 ---
function renderChart() {
  // Notionのデータがまだ取得できていない場合はメッセージを表示して終了する
  if (!state.notionStatus) {
    chartContainer.innerHTML = "<p style='color:#888; text-align:center;'>データを取得中です...</p>";
    totalYenEl.textContent = "0";
    return;
  }

  const { existingValues, pastTotal } = state.notionStatus;
  let chartData = []; // グラフ用のデータを貯める配列（リスト）
  let totalYen = 0;   // 今日の合計金額

  // 1. 各アプリごとに今日の「円」を計算する
  CONFIG.apps.forEach(appName => {
    // 画面の入力欄に入力されている現在の値を取得する
    const inputEl = document.querySelector(`.app-point-input[data-app-name="${appName}"]`);
    let todayPoint = 0;
    const baseTotal = pastTotal && pastTotal[appName] ? pastTotal[appName] : 0;

    // 「画面に入力されている値 - 過去の合計」が今日のポイント
    if (inputEl && inputEl.value !== "") {
      todayPoint = Number(inputEl.value) - baseTotal;
      if (todayPoint < 0) todayPoint = 0; // マイナスの場合は0扱い
    } 
    // まだ画面に入力していない場合は、Notionから取得した今日のポイントを使う
    else if (existingValues && existingValues[appName]) {
      todayPoint = existingValues[appName];
    }

    // ポイントを「割る数（レート）」で割って円換算する
    const rate = CONFIG.rates[appName] || 1; 
    const yen = todayPoint / rate;
    totalYen += yen;

    // ★修正部分：アプリ名から先頭の数字と末尾の（入力用）を消して綺麗にする
    // 例: "1.トリマ（入力用）" -> "トリマ"
    // /^\d+\./ は「先頭（^）にある数字（\d+）とドット（\.）」を指す正規表現
    // /（入力用）$/ は「末尾（$）にある（入力用）」を指す正規表現
    const cleanName = appName.replace(/^\d+\./, '').replace(/（入力用）$/, '').trim();

    // 綺麗にした名前と金額を配列に追加する
    chartData.push({
      name: cleanName,
      yen: yen
    });
  });

  // 2. 円換算の金額が高い順（降順）に並べ替える
  // b.yen - a.yen とすることで、大きい数字のデータが配列の前の方に来ます
  chartData.sort((a, b) => b.yen - a.yen);

  // 3. グラフの横軸の長さを決める
  // 稼ぎが一番多いアプリ（並べ替えたので0番目にある）の金額を基準にします
  const maxYen = chartData.length > 0 ? chartData[0].yen : 0;
  // 最大値に10%（1.1倍）の余裕を持たせる。もし誰も稼いでなければメモリの基準を10にする。
  const chartMax = maxYen > 0 ? maxYen * 1.1 : 10;

  // 4. 画面上の「本日の合計」に数字を入れる（toFixed(1)で小数点第1位まで表示）
  totalYenEl.textContent = totalYen.toFixed(1);

  // 5. HTMLを組み立ててグラフの箱に流し込む
  clearElement(chartContainer);
  chartData.forEach(data => {
    // このアプリの金額が、最大値に対して何パーセント（割合）の長さになるか計算
    const widthPercent = (data.yen / chartMax) * 100;
    
    // 1行分のHTMLの箱（divタグ）を作る
    const row = document.createElement("div");
    row.className = "chart-row";
    
    // 箱の中に名前、伸びる棒、金額を入れる
    // `（バッククォート）で囲むと、文字の中に ${変数} の形でデータを埋め込めます
    row.innerHTML = `
      <div class="chart-label">${data.name}</div>
      <div class="chart-bar-area">
        <div class="chart-bar" style="width: ${widthPercent}%"></div>
      </div>
      <div class="chart-value">${data.yen.toFixed(1)}</div>
    `;
    
    // 作った1行をグラフ全体の箱に追加する
    chartContainer.appendChild(row);
  });
}

// --- 画面の再描画 (Render) ---
// 「state（状態）」を見て、それに合わせて画面の見た目を切り替える仕事だけをします。
function render() {
  // 送信ボタンの状態を更新
  if (state.isSubmitting) {
    submitBtnEl.textContent = "送信中...";
    submitBtnEl.disabled = true; // 押せないようにする
  } else {
    submitBtnEl.textContent = "Notionへ送信";
    submitBtnEl.disabled = false; // 押せるようにする
  }

  // メッセージの文字と色（クラス）を更新
  messageEl.textContent = state.message.text;
  messageEl.className = `status-msg ${state.message.type}`;

  // 今どちらのタブが開かれているか（activeTab）を見て、画面を切り替える
  if (state.activeTab === 'input') {
    // 入力タブを「選ばれている状態(active)」にする
    tabInputBtn.classList.add("active");
    tabRecordBtn.classList.remove("active");
    // 入力画面を表示して、記録画面を隠す
    viewInput.classList.add("active");
    viewRecord.classList.remove("active");
  } else {
    // 記録タブを「選ばれている状態(active)」にする
    tabInputBtn.classList.remove("active");
    tabRecordBtn.classList.add("active");
    // 記録画面を表示して、入力画面を隠す
    viewInput.classList.remove("active");
    viewRecord.classList.add("active");
    
    // 記録タブ（グラフ画面）が表示されている時だけ、グラフの計算と描画を行う
    renderChart();
  }
}

// --- 全ての準備が整ったので、アプリを起動する ---
init();