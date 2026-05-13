// ===============================================
// 1. データ層 (Data Layer)
// アプリ全体で使うルールや「設定値」をまとめておきます。
// ===============================================

// アプリケーションの設定値（変わらないデータ）をCONFIGにまとめます
const CONFIG = {
  // GAS（Google Apps Script）の連携URLを設定します（ご自身のURLのままにしています）
  gasUrl: "https://script.google.com/macros/s/AKfycbxZEjtFSXHGEiHhJFJ0kalV-K6yysRAYo4DvztJIFuCoSvv5TV4c169YPyHSILGSxUNNg/exec",
  
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

// アプリの「今の状態」を記憶しておく場所（このデータを書き換えることで画面が変わります）
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
function clearElement(element) { 
  element.innerHTML = ''; 
}

// 日付データを「YYYY-MM-DD」という綺麗な文字の形にする道具
function formatDate(date) {
  const y = date.getFullYear(); // 年を取得
  const m = String(date.getMonth() + 1).padStart(2, '0'); // 月を取得して2桁にする（3月→03）
  const d = String(date.getDate()).padStart(2, '0'); // 日を取得して2桁にする
  return `${y}-${m}-${d}`;
}


// ===============================================
// 3. ロジック層 (Logic Layer)
// データ(CONFIGやstate)を見て、HTMLの見た目を作る処理です。
// ===============================================

// --- HTMLから操作したい部品（タグ）を見つけて、変数（あだ名）をつけておきます ---
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
  // 日付入力欄に「今日の日付」をセットします
  const today = new Date();
  dateInputEl.value = formatDate(today);

  // 入力欄のエリアを一旦空っぽにします
  clearElement(appsContainerEl);
  
  // CONFIG.apps のリストを見ながら、アプリの数だけ入力欄を自動で作ります
  CONFIG.apps.forEach(appName => {
    // 画面のラベル用には「（入力用）」という文字だけ削って綺麗にします
    const displayName = appName.replace(/（入力用）$/, '').trim();
    
    // 入力欄1つ分のHTMLの箱を作ります
    const groupDiv = document.createElement("div");
    groupDiv.className = "form-group"; // クラスを付けます
    
    // 箱の中にラベル、過去の合計点、入力枠のHTMLを流し込みます
    groupDiv.innerHTML = `
      <label class="input-label">${displayName}</label>
      <span class="total-points" data-app-name="${appName}">合計: ...</span>
      <input type="number" class="input-field app-point-input" data-app-name="${appName}">
    `;
    // 作ったかたまりを画面（apps-container）に追加します
    appsContainerEl.appendChild(groupDiv);
  });

  // カレンダーで日付を変えたら、その日のデータをNotionから取ってくるように設定します
  dateInputEl.addEventListener("change", () => {
    if (dateInputEl.value) fetchNotionStatus(dateInputEl.value);
  });

  // 更新ボタンを押した時の処理を設定します
  refreshBtnEl.addEventListener("click", () => {
    if (dateInputEl.value) {
      fetchNotionStatus(dateInputEl.value); // 日付があればデータ取得
    } else {
      // 日付が空ならエラーメッセージを状態にセットして画面更新
      state.message = { text: "日付を選択してください", type: "error" };
      render();
    }
  });

  // 送信ボタンが押された時の処理を設定します
  formEl.addEventListener("submit", handleFormSubmit);

  // 「入力」タブボタンを押した時の処理を設定します
  tabInputBtn.addEventListener("click", () => {
    state.activeTab = 'input'; // 状態を「入力」に変更
    render(); // 画面を更新
  });
  
  // 「記録」タブボタンを押した時の処理を設定します
  tabRecordBtn.addEventListener("click", () => {
    state.activeTab = 'record'; // 状態を「記録」に変更
    render(); // 画面を更新
  });

  // 初回起動時、セットされている今日の日付のデータをNotionから取ってきます
  fetchNotionStatus(dateInputEl.value);
  
  // 午前3時のリセット機能を開始します（1分間に1回チェックするタイマーをセット）
  checkTimeReset();
  setInterval(checkTimeReset, 60000);
  
  // 今の状態に合わせて画面を描き出します
  render();
}


// --- 午前3時のリセット機能 ---
// 毎日午前3時になったら、画面の入力欄を空っぽにします。（日をまたいだことによる混乱を防ぎます）
function checkTimeReset() {
  const now = new Date();
  const todayStr = formatDate(now);
  const hour = now.getHours();

  // 3時以降 ＆ 今日まだリセットしていなければ実行します
  if (hour >= 3 && state.lastResetDate !== todayStr) {
    // すべての入力枠を探して、中身を空にして色を消します
    document.querySelectorAll(".app-point-input").forEach(input => {
      input.value = "";
      input.classList.remove("filled", "unfilled");
    });
    state.lastResetDate = todayStr; // 今日リセットしたことを記憶します
    render(); // 画面を更新します
  }
  
  // 3時より前（0時〜2時）の場合は、翌日のリセットに備えて昨日の記憶を消します
  if (state.lastResetDate && state.lastResetDate !== todayStr && hour < 3) {
    state.lastResetDate = null;
  }
}


// --- Notionからデータを取得する処理 ---
async function fetchNotionStatus(date) {
  // 通信中であることを画面に表示します
  document.querySelectorAll(".total-points").forEach(span => span.textContent = "合計: 読み込み中...");
  // 色を一旦すべて消します
  document.querySelectorAll(".app-point-input").forEach(input => input.classList.remove("filled", "unfilled"));

  try {
    // GAS（Notionの仲介役）にアクセスしてデータを貰います
    const response = await fetch(`${CONFIG.gasUrl}?date=${encodeURIComponent(date)}`);
    const result = await response.json(); // 貰ったデータをJSON形式に変換します
    
    // 成功以外のステータスならエラーとして処理を中断させます
    if (result.status !== "success") throw new Error(result.message || "不明なエラー");
    
    // 取ってきたデータを「state（状態）」に保存します
    state.notionStatus = result;
    // 取ってきたデータを画面の入力欄に当てはめます
    applyNotionStatusToUI(result);
    
    // データが揃ったので画面を更新します（これでグラフも描けるようになります）
    render();
    
  } catch (error) {
    // 通信失敗時はエラーメッセージをセットします
    state.message = { text: "通信エラー: " + error.message, type: "error" };
    document.querySelectorAll(".total-points").forEach(span => span.textContent = "合計: 取得失敗");
    render();
  }
}


// --- 取ってきたNotionのデータを画面の入力欄に反映させる処理 ---
function applyNotionStatusToUI(notionData) {
  const { existingValues, pastTotal } = notionData;

  // すべての入力欄を一つずつチェックします
  document.querySelectorAll(".app-point-input").forEach(input => {
    // この入力欄が担当しているアプリ名を取得します
    const appName = input.getAttribute("data-app-name");
    
    // その日の「実績」データがNotion上に存在するか？（交換のデータは含まれません）
    const hasValue = existingValues && existingValues.hasOwnProperty(appName) && existingValues[appName] > 0;
    
    // データがあれば青（filled）、なければ赤（unfilled）のクラスを付けます
    if (hasValue) {
      input.classList.add("filled");
      input.classList.remove("unfilled");
    } else {
      input.classList.add("unfilled");
      input.classList.remove("filled");
    }

    // 過去の合計ポイントを取得します（同日の「交換」行のマイナス分もここに含まれています）
    const baseTotal = pastTotal[appName] || 0;
    
    // 今日の実績データがあれば「過去の合計（交換加味）＋今日の入力値」を入力欄に表示します
    if (hasValue) {
      input.value = baseTotal + existingValues[appName];
    } else {
      input.value = ""; // 実績がなければ空欄のままにします
    }

    // 各アプリの下にある合計ポイントのテキストを更新します
    const totalSpan = document.querySelector(`.total-points[data-app-name="${appName}"]`);
    if (totalSpan) totalSpan.textContent = `合計： ${baseTotal.toLocaleString()}`;
  });
}


// --- 送信ボタンが押された時の処理 ---
async function handleFormSubmit(e) {
  e.preventDefault(); // 送信時に画面がリロードされてしまうのを防ぎます
  state.isSubmitting = true; // 送信中の状態にします
  state.message = { text: "計算してNotionへ送信しています...", type: "info" };
  render(); // ボタンをグレーアウトさせるために画面更新します

  // Notionに送るためのデータの箱を作ります
  const payload = { date: dateInputEl.value, points: {} };
  
  // 画面に入力されている数値を拾い集めます
  const pointInputs = document.querySelectorAll(".app-point-input");
  pointInputs.forEach(input => {
    const appName = input.getAttribute("data-app-name");
    const rawValue = input.value.trim();
    // 空欄じゃなければ箱に入れます（文字を数字に変換して入れます）
    if (rawValue !== "") payload.points[appName] = Number(rawValue);
  });

  try {
    // GAS経由でNotionにデータを送信します（POST通信）
    const response = await fetch(CONFIG.gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload) // データを文字列に変換して送ります
    });

    const result = await response.json();
    if (result.status === "success") {
      state.isSubmitting = false; // 送信完了状態に戻します
      state.message = { text: "Notionへの記録が完了しました！", type: "success" };
      render();
      
      // 送信が終わったら入力欄を一旦空にして、最新データを再取得します
      pointInputs.forEach(input => input.value = "");
      fetchNotionStatus(dateInputEl.value);
    } else {
      throw new Error(result.message); // Notion側でエラーが起きたら例外を発生させます
    }
  } catch (error) {
    state.isSubmitting = false;
    state.message = { text: "エラーが発生しました: " + error.message, type: "error" };
    render();
  }
}


// --- 記録タブのグラフを描画する処理 ---
function renderChart() {
  // Notionのデータがまだ取得できていない場合はメッセージを表示して終了します
  if (!state.notionStatus) {
    chartContainer.innerHTML = "<p style='color:#888; text-align:center;'>データを取得中です...</p>";
    totalYenEl.textContent = "0";
    return;
  }

  // existingValues（今日の実績）と pastTotal（過去の合計 ＋ 今日の交換分）を取得
  const { existingValues, pastTotal } = state.notionStatus;
  let chartData = []; // グラフ用のデータを貯める配列（リスト）
  let totalYen = 0;   // 今日の合計金額

  // 1. 各アプリごとに今日の「純粋な稼ぎ（円）」を計算します
  CONFIG.apps.forEach(appName => {
    // 画面の入力欄を探します
    const inputEl = document.querySelector(`.app-point-input[data-app-name="${appName}"]`);
    let todayPoint = 0;
    
    // 過去の合計（同日に交換があれば、そのマイナス分も含まれています）
    const baseTotal = pastTotal && pastTotal[appName] ? pastTotal[appName] : 0;

    // もし入力欄に数字が入っていれば、その数字から過去合計を引いて「今日の稼ぎ」を算出します
    // ※baseTotalには「交換」分が加味されているため、純粋に「今日稼いだ分」だけが抽出されます。
    if (inputEl && inputEl.value !== "") {
      todayPoint = Number(inputEl.value) - baseTotal;
      if (todayPoint < 0) todayPoint = 0; // マイナスの場合は念のため0扱いとします
    } 
    // まだ画面に入力していない場合は、Notionから取得した「今日の『実績』行」のポイントを使います
    else if (existingValues && existingValues[appName]) {
      todayPoint = existingValues[appName];
    }

    // ポイントを「割る数（レート）」で割って円に換算します
    const rate = CONFIG.rates[appName] || 1; 
    const yen = todayPoint / rate;
    totalYen += yen; // 今日の合計金額に足し合わせます

    // アプリ名から先頭の数字と末尾の（入力用）を消して綺麗にします
    const cleanName = appName.replace(/^\d+\./, '').replace(/（入力用）$/, '').trim();

    // 綺麗にした名前と金額のセットをリストに追加します
    chartData.push({
      name: cleanName,
      yen: yen
    });
  });

  // 2. 円換算の金額が高い順（降順）に並べ替えます
  chartData.sort((a, b) => b.yen - a.yen);

  // 3. グラフの横軸の最大値（長さ）を決めます
  // 稼ぎが一番多いアプリ（0番目）の金額を基準にします
  const maxYen = chartData.length > 0 ? chartData[0].yen : 0;
  // 最大値に対して10%（1.1倍）の余裕を持たせます。もし誰も稼いでなければメモリ基準を10にします。
  const chartMax = maxYen > 0 ? maxYen * 1.1 : 10;

  // 4. 画面上の「本日の合計」部分に計算した数字を入れます（toFixed(1)で小数点第1位まで表示）
  totalYenEl.textContent = totalYen.toFixed(1);

  // 5. HTMLを組み立ててグラフの箱に流し込みます
  clearElement(chartContainer);
  chartData.forEach(data => {
    // このアプリの金額が、最大値に対して何パーセント（割合）の長さになるか計算します
    const widthPercent = (data.yen / chartMax) * 100;
    
    // 1行分のHTMLの箱を作ります
    const row = document.createElement("div");
    row.className = "chart-row";
    
    // 箱の中に名前、伸びる棒グラフ、金額を埋め込みます
    row.innerHTML = `
      <div class="chart-label">${data.name}</div>
      <div class="chart-bar-area">
        <div class="chart-bar" style="width: ${widthPercent}%"></div>
      </div>
      <div class="chart-value">${data.yen.toFixed(1)}</div>
    `;
    
    // 作った1行をグラフ全体の箱（chartContainer）に追加します
    chartContainer.appendChild(row);
  });
}


// --- 画面の再描画 (Render) ---
// 「state（状態）」のデータを見て、それに合わせてHTMLの見た目を切り替える仕事だけをします。
function render() {
  // 送信ボタンの状態を更新します
  if (state.isSubmitting) {
    submitBtnEl.textContent = "送信中...";
    submitBtnEl.disabled = true; // 送信中はボタンを押せないようにします
  } else {
    submitBtnEl.textContent = "Notionへ送信";
    submitBtnEl.disabled = false; // 送信していない時は押せるようにします
  }

  // メッセージの文字と色（クラス）を更新します
  messageEl.textContent = state.message.text;
  messageEl.className = `status-msg ${state.message.type}`;

  // 今どちらのタブが開かれているかを見て、画面を切り替えます
  if (state.activeTab === 'input') {
    // 入力タブボタンを青色（active）にします
    tabInputBtn.classList.add("active");
    tabRecordBtn.classList.remove("active");
    // 入力画面を表示して、記録画面を隠します
    viewInput.classList.add("active");
    viewRecord.classList.remove("active");
  } else {
    // 記録タブボタンを青色（active）にします
    tabInputBtn.classList.remove("active");
    tabRecordBtn.classList.add("active");
    // 記録画面を表示して、入力画面を隠します
    viewInput.classList.remove("active");
    viewRecord.classList.add("active");
    
    // 記録タブ（グラフ画面）が表示されている時だけ、グラフの計算と描画を行います
    renderChart();
  }
}

// --- 全ての準備が整ったので、アプリを起動します ---
init();