// ===============================================
// 1. データ層 (Data Layer)
// 「この人は時間を隠す」「タイトルはこれ」といった
// アプリの状態や設定を「意味」としてまとめた場所です。
// ===============================================

// --- 設定データ (CONFIG) ---
// 変更されることがほとんどない、アプリの根本的な設定値
const CONFIG = {
  // Google Apps Script (gas.js) の公開URL
  gasUrl: "https://script.google.com/macros/s/AKfycbw8HL6k0m3i4UilxMiSLTzW_Oec55oOq017RHBOF0TuNfiajoo3XIIQmiETgnT1Kfrz_A/exec",
  // アプリ一覧（表示名とNotionで使うプロパティ名を兼ねる）
  // 「（入力用）」は表示時に取り除かれる
  apps: [
    "1.トリマ（入力用）",
    "2.アルコイン（入力用）",
    "3.レシチャレ（入力用）",
    "4.powl（入力用）",
    "5.プラリー（入力用）",
    "6.もふポ（入力用）",
    "7.ビーンズ（入力用）",
    "8.ポイントインカム（入力用）",
    "9.ポイントタウン（入力用）",
    "10.シェアフル（入力用）",
    "11.Pint（入力用）",
    "12.PUI（入力用）",
    "13.おぢポ（入力用）",
    "14.ぽいころ（入力用）",
    "15.ロコネ（入力用）",
    "16.YONQ（入力用）",
    "17.Moneywalk（入力用）",
    "18.Cashwalk（入力用）",
    "19.エブリポイント（入力用）",
    "20.tokuria walk（入力用）",
    "21.毎日運動（入力用）",
    "22.noma（入力用）",
    "23.TikTok Lite（入力用）",
    "24.トクエル（入力用）",
    "25.オモポ（入力用）",
    "26.ポイにゃん（入力用）"
  ]
};

// --- 状態データ (STATE) ---
// アプリの「今」の状態を表す変数。時間の経過や操作で変化する。
const state = {
  // フォームを送信中かどうか（二重送信防止）
  isSubmitting: false,
  // 画面下のステータスメッセージ
  message: { text: "", type: "hidden" },
  // Notionから取得した最新の状態（差分計算前のデータ）
  notionStatus: null,
  // 日付が変わったことを検知するための最後にリセットした日付
  lastResetDate: null
};

// ===============================================
// 2. ユーティリティ関数 (Utilities)
// 画面を作る際に何度も使う小さな道具箱です。
// ===============================================

// 指定された要素を空にする関数
function clearElement(element) {
  element.innerHTML = '';
}

// 日付を YYYY-MM-DD 形式で返す関数
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===============================================
// 3. ロジック層 (Logic Layer) - 画面構築
// データの「意味」に従って、画面（DOM）を作り変えます。
// HTMLは触らず、ここで全ての要素生成と更新を行います。
// ===============================================

// --- DOM要素の取得 ---
// 画面に表示するための部品をJSで操作できるように取得する
const formEl = document.getElementById("data-form");
const dateInputEl = document.getElementById("date-input");
const appsContainerEl = document.getElementById("apps-container");
const submitBtnEl = document.getElementById("submit-button");
const messageEl = document.getElementById("status-message");
const refreshBtnEl = document.getElementById("refresh-button");

// --- 画面の初期化 (Init) ---
// アプリ起動時に一度だけ実行される
function init() {
  // 1. 日付を今日に設定
  const today = new Date();
  dateInputEl.value = formatDate(today);

  // 2. アプリ一覧の入力欄を動的に生成
  clearElement(appsContainerEl); // 既にあれば一度きれいにする
  CONFIG.apps.forEach(appName => {
    // 表示名から「（入力用）」を消す
    const displayName = appName.replace(/（入力用）$/, '').trim();
    
    // 各アプリの入力欄を包むブロックを作成
    const groupDiv = document.createElement("div");
    groupDiv.className = "form-group";
    groupDiv.innerHTML = `
      <label class="input-label">${displayName}</label>
      <span class="total-points" data-app-name="${appName}">合計: ...</span>
      <input type="number" class="input-field app-point-input" data-app-name="${appName}">
    `;
    // 作ったブロックを画面のapps-containerに追加
    appsContainerEl.appendChild(groupDiv);
  });

  // 3. イベントリスナーの設定
  // 日付が変わった時の処理
  dateInputEl.addEventListener("change", () => {
    const newDate = dateInputEl.value;
    if (newDate) {
      fetchNotionStatus(newDate); // Notionからデータ取得
    }
  });

  // 更新ボタンが押された時の処理
  refreshBtnEl.addEventListener("click", () => {
    const currentDate = dateInputEl.value;
    if (currentDate) {
      fetchNotionStatus(currentDate);
    } else {
      // 日付が空ならエラーメッセージを表示（renderがSTATEを見て画面を変える）
      state.message = { text: "日付を選択してください", type: "error" };
      render();
    }
  });

  // フォーム送信時の処理
  formEl.addEventListener("submit", handleFormSubmit);

  // 4. 初回データ取得と時刻リセットの監視を開始
  fetchNotionStatus(dateInputEl.value);
  checkTimeReset();
  setInterval(checkTimeReset, 60000); // 1分ごとにリセットチェック
  render();
}

// --- 時刻リセットチェック (Time Reset) ---
// 午前3時を過ぎたら、入力欄の色や値をリセットする
function checkTimeReset() {
  const now = new Date();
  const todayStr = formatDate(now);
  const hour = now.getHours();

  // 午前3時以降 かつ まだ今日のリセットを実行していない場合
  if (hour >= 3 && state.lastResetDate !== todayStr) {
    document.querySelectorAll(".app-point-input").forEach(input => {
      input.value = ""; // 値をクリア
      input.classList.remove("filled", "unfilled"); // 色をリセット
    });
    state.lastResetDate = todayStr; // 今日はリセット済みの印
  }
  
  // 午前3時前に日付が変わった場合、リセットフラグを戻す
  if (state.lastResetDate && state.lastResetDate !== todayStr && hour < 3) {
    state.lastResetDate = null;
  }
}

// --- Notion API 通信 ---
// Notionからデータを取得し、状態(state)を更新する
async function fetchNotionStatus(date) {
  // 取得中は合計値を「読み込み中...」に変える
  document.querySelectorAll(".total-points").forEach(span => {
    span.textContent = "合計: 読み込み中...";
  });
  // 一旦、全入力欄の色をリセット
  document.querySelectorAll(".app-point-input").forEach(input => {
    input.classList.remove("filled", "unfilled");
  });

  try {
    const response = await fetch(`${CONFIG.gasUrl}?date=${encodeURIComponent(date)}`);
    const result = await response.json();
    
    if (result.status !== "success") {
      throw new Error(result.message || "不明なエラー");
    }
    
    // 取得したデータを状態(state)に保存
    state.notionStatus = result;
    // データの状態に基づいて画面を更新
    applyNotionStatusToUI(result);
    
  } catch (error) {
    // エラーが発生したら、メッセージをstateに書き込んでrenderに知らせる
    state.message = { text: "ステータス取得エラー: " + error.message, type: "error" };
    document.querySelectorAll(".total-points").forEach(span => {
      span.textContent = "合計: 取得失敗";
    });
    render();
  }
}

// --- Notionの状態を画面(UI)に反映する ---
function applyNotionStatusToUI(notionData) {
  const { existingValues, pastTotal } = notionData;

  // 全てのアプリ入力欄に対して処理を行う
  document.querySelectorAll(".app-point-input").forEach(input => {
    const appName = input.getAttribute("data-app-name");
    
    // ① 入力欄の色を決める (データの意味: existingValuesに値があって0より大きいか？)
    const hasValue = existingValues && existingValues.hasOwnProperty(appName) && existingValues[appName] > 0;
    if (hasValue) {
      input.classList.add("filled");   // 青：値あり
      input.classList.remove("unfilled");
    } else {
      input.classList.add("unfilled"); // 赤：値なし
      input.classList.remove("filled");
    }

    // ② 入力欄に値を入れる (データの意味: 過去合計 + 今日の値)
    const baseTotal = pastTotal[appName] || 0;
    if (existingValues && existingValues.hasOwnProperty(appName) && existingValues[appName] > 0) {
      const existingToday = existingValues[appName];
      input.value = baseTotal + existingToday;
    } else {
      input.value = ""; // 未入力なら空欄
    }

    // ③ 合計ラベルを更新する (これは「今日の分を含まない過去の合計」という意味)
    const totalSpan = document.querySelector(`.total-points[data-app-name="${appName}"]`);
    if (totalSpan) {
      totalSpan.textContent = `合計： ${baseTotal.toLocaleString()}`;
    }
  });
}

// --- フォーム送信処理 ---
async function handleFormSubmit(e) {
  e.preventDefault(); // ブラウザのデフォルト送信動作を止める

  // 1. 送信中フラグを立てて、ボタンを無効化する
  state.isSubmitting = true;
  state.message = { text: "計算してNotionへ送信しています...", type: "info" };
  render();

  // 2. 送信するデータを作成
  const payload = {
    date: dateInputEl.value,
    points: {}
  };

  const pointInputs = document.querySelectorAll(".app-point-input");
  pointInputs.forEach(input => {
    const appName = input.getAttribute("data-app-name");
    const rawValue = input.value.trim();
    if (rawValue !== "") {
      payload.points[appName] = Number(rawValue); // 文字列を数値に変換
    }
  });

  // 3. APIへ送信
  try {
    const response = await fetch(CONFIG.gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.status === "success") {
      // 成功: 状態を更新し、入力欄をクリアしてもう一度最新データを取得
      state.isSubmitting = false;
      state.message = { text: "Notionへの記録が完了しました！", type: "success" };
      render();
      
      pointInputs.forEach(input => input.value = "");
      fetchNotionStatus(dateInputEl.value);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    // 失敗: エラーメッセージを表示
    state.isSubmitting = false;
    state.message = { text: "エラーが発生しました: " + error.message, type: "error" };
    render();
  }
}

// --- 画面の再描画 (Render) ---
// 現在の状態(state)を元に、画面の部品を書き換える唯一の関数
function render() {
  // 1. 送信ボタンの有効/無効とラベルをstateに合わせて変更
  if (state.isSubmitting) {
    submitBtnEl.textContent = "送信中...";
    submitBtnEl.disabled = true;
  } else {
    submitBtnEl.textContent = "Notionへ送信";
    submitBtnEl.disabled = false;
  }

  // 2. ステータスメッセージの表示/非表示と内容をstateに合わせて変更
  messageEl.textContent = state.message.text;
  messageEl.className = `status-msg ${state.message.type}`;
}

// ===============================================
// 4. アプリケーション起動
// ===============================================
init();