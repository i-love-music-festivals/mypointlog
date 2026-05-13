// ===============================================
// 1. 設定データ
// ===============================================
const CONFIG = {
  gasUrl: "https://script.google.com/macros/s/AKfycbyL3ZUfvE9bFIGlE0MYbk9L3XYNbLQtfoF8Y_s4kWfXSmPwCMBEe-sIkM8SSi8lY5orog/exec",
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

// アプリ全体の状態を管理するオブジェクト
const state = {
  isSubmitting: false,       // 送信中のフラグ
  message: { text: "", type: "hidden" }, // 画面上のメッセージ
  notionStatus: null,        // Notionから取得したデータ
  activeTab: 'input'         // 現在のタブ ('input' または 'record')
};

// ===============================================
// 2. 便利関数
// ===============================================
// Dateオブジェクト → YYYY-MM-DD 形式の文字列に変換する
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===============================================
// 3. アプリのメイン処理
// ===============================================
// HTML上の要素を取得
const dateInputEl = document.getElementById("date-input");
const appsContainerEl = document.getElementById("apps-container");
const totalYenEl = document.getElementById("total-yen");
const chartContainer = document.getElementById("chart-container");

// アプリ起動時の初期設定を行う関数
function init() {
  // 【27時切り替え】午前3時未満なら「前日」を初期値にする
  const now = new Date();
  if (now.getHours() < 3) {
    now.setDate(now.getDate() - 1);
  }
  dateInputEl.value = formatDate(now);

  // アプリごとの入力欄をHTML上に動的に生成する
  appsContainerEl.innerHTML = '';
  CONFIG.apps.forEach(appName => {
    // 表示名から「（入力用）」を取り除いて、ユーザーに見せる名前を作る
    const displayName = appName.replace(/（入力用）$/, '').trim();
    const groupDiv = document.createElement("div");
    groupDiv.className = "form-group";
    // ラベル、合計表示用のspan、数値入力欄をまとめて生成
    groupDiv.innerHTML = `
      <label class="input-label">${displayName}</label>
      <span class="total-points" data-app-name="${appName}">合計: 読み込み中...</span>
      <input type="number" class="input-field app-point-input" data-app-name="${appName}">
    `;
    appsContainerEl.appendChild(groupDiv);
  });

  // 各種イベントリスナーを登録
  dateInputEl.addEventListener("change", () => fetchNotionStatus(dateInputEl.value));
  document.getElementById("refresh-button").addEventListener("click", () => fetchNotionStatus(dateInputEl.value));
  document.getElementById("data-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("tab-input").addEventListener("click", () => { state.activeTab = 'input'; render(); });
  document.getElementById("tab-record").addEventListener("click", () => { state.activeTab = 'record'; render(); });

  // 初期データを読み込んで画面を描画
  fetchNotionStatus(dateInputEl.value);
  render();
}

// Notionから指定された日付のデータを取得する
async function fetchNotionStatus(date) {
  try {
    const response = await fetch(`${CONFIG.gasUrl}?date=${encodeURIComponent(date)}`);
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message);
    state.notionStatus = result;
    applyDataToUI(result);   // 取得したデータを入力欄や合計ラベルに反映
    render();
  } catch (error) {
    state.message = { text: "エラー: " + error.message, type: "error" };
    render();
  }
}

// Notionから取得したデータを画面の入力欄・合計表示に反映する
function applyDataToUI(data) {
  const { existingValues, pastTotal } = data;

  // すべての入力欄に対して処理を行う
  document.querySelectorAll(".app-point-input").forEach(input => {
    const appName = input.getAttribute("data-app-name");
    const todayVal = existingValues[appName] || 0;       // 今日の実績（差分）
    const baseTotal = pastTotal[appName] || 0;           // 前日までの累計

    // 「前日までの合計」をラベルに表示
    const label = document.querySelector(`.total-points[data-app-name="${appName}"]`);
    if (label) {
      label.textContent = `合計： ${baseTotal.toLocaleString()}`;
    }

    // 入力欄の値を「前日までの合計＋今日の実績（差分）」にセット
    if (todayVal > 0) {
      input.value = baseTotal + todayVal;
    } else {
      input.value = "";
    }

    // ★★★ 修正ポイント ★★★
    // まず両方のクラスを削除してから、状態に合ったクラスを追加する
    input.classList.remove('filled', 'unfilled');
    if (todayVal > 0) {
      input.classList.add('filled');   // 青色背景（入力済み）
    } else {
      input.classList.add('unfilled'); // 赤色背景（未入力）
    }
  });
}

// フォーム送信（Notionへ保存）を処理する
async function handleFormSubmit(e) {
  e.preventDefault();
  state.isSubmitting = true;
  render();

  // 送信するデータを作成
  const payload = { date: dateInputEl.value, points: {} };
  document.querySelectorAll(".app-point-input").forEach(input => {
    const appName = input.getAttribute("data-app-name");
    if (input.value) {
      payload.points[appName] = Number(input.value);
    }
  });

  try {
    const response = await fetch(CONFIG.gasUrl, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status === "success") {
      state.message = { text: "保存しました", type: "success" };
      // 保存成功後、最新のデータを再取得して画面を更新する
      await fetchNotionStatus(dateInputEl.value);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    state.message = { text: "保存エラー: " + error.message, type: "error" };
  } finally {
    state.isSubmitting = false;
    render();
  }
}

// 記録タブの棒グラフ（アプリ別）を描画する
function renderCharts() {
  if (!state.notionStatus) return;
  const { existingValues, pastTotal } = state.notionStatus;
  let chartData = [];
  let totalSumYen = 0;

  // 各アプリの本日の金額（円）を計算
  CONFIG.apps.forEach(appName => {
    const input = document.querySelector(`.app-point-input[data-app-name="${appName}"]`);
    const base = pastTotal[appName] || 0;
    let todayP = 0;

    // 入力欄に値があればそこから計算、なければ保存済みデータから取得
    if (input && input.value) {
      todayP = Math.max(0, Number(input.value) - base);
    } else {
      todayP = existingValues[appName] || 0;
    }

    const yen = todayP / (CONFIG.rates[appName] || 1);
    totalSumYen += yen;
    chartData.push({
      name: appName.replace(/^\d+\.|\（入力用\）/g, ''),
      yen: yen
    });
  });

  // 合計金額を表示
  totalYenEl.textContent = totalSumYen.toFixed(1);

  // 金額が大きい順にソート
  chartData.sort((a, b) => b.yen - a.yen);

  // グラフを描画
  chartContainer.innerHTML = '';
  const max = Math.max(...chartData.map(d => d.yen), 10);
  chartData.forEach(d => {
    const row = document.createElement("div");
    row.className = "chart-row";
    row.innerHTML = `
      <div class="chart-label">${d.name}</div>
      <div class="chart-bar-area">
        <div class="chart-bar" style="width:${(d.yen / max) * 100}%"></div>
      </div>
      <div class="chart-value">${d.yen.toFixed(1)}</div>
    `;
    chartContainer.appendChild(row);
  });

  // 週間推移グラフも描画
  renderWeeklyChart(totalSumYen);
}

// 週間推移グラフ（縦棒）を描画する
function renderWeeklyChart(currentTotalYen) {
  const container = document.getElementById("weekly-chart-container");
  if (!state.notionStatus || !state.notionStatus.dailyRecords) return;

  const dailyRecords = state.notionStatus.dailyRecords;
  const baseDate = new Date(dateInputEl.value);
  let weeklyData = [];
  let maxVal = 0;

  // 今日を含む過去7日間のデータを集める
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dStr = formatDate(d);
    let dayYen = 0;

    if (dStr === dateInputEl.value) {
      dayYen = currentTotalYen;
    } else {
      const record = dailyRecords[dStr] || {};
      CONFIG.apps.forEach(app => {
        dayYen += (record[app] || 0) / (CONFIG.rates[app] || 1);
      });
    }
    maxVal = Math.max(maxVal, dayYen);
    weeklyData.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      yen: dayYen
    });
  }

  const chartMax = maxVal * 1.2 || 10;
  container.innerHTML = '';
  weeklyData.forEach(data => {
    const h = (data.yen / chartMax) * 100;
    const group = document.createElement("div");
    group.className = "weekly-bar-group";
    group.innerHTML = `
      <div class="weekly-bar-value">${Math.round(data.yen)}</div>
      <div class="weekly-bar-container">
        <div class="weekly-bar" style="height:${h}%"></div>
      </div>
      <div class="weekly-bar-label">${data.label}</div>
    `;
    container.appendChild(group);
  });
}

// 画面全体の表示を現在の状態（タブ・メッセージなど）に応じて更新する
function render() {
  // メッセージ表示を更新
  const msgDiv = document.getElementById("status-message");
  msgDiv.textContent = state.message.text;
  msgDiv.className = `status-msg ${state.message.type}`;

  // タブのアクティブ状態と各ビューの表示/非表示を切り替え
  if (state.activeTab === 'input') {
    document.getElementById("tab-input").classList.add("active");
    document.getElementById("tab-record").classList.remove("active");
    document.getElementById("view-input").classList.add("active");
    document.getElementById("view-record").classList.remove("active");
  } else {
    document.getElementById("tab-input").classList.remove("active");
    document.getElementById("tab-record").classList.add("active");
    document.getElementById("view-input").classList.remove("active");
    document.getElementById("view-record").classList.add("active");
    // 記録タブが表示されるときだけグラフを描画（データがあれば）
    if (state.notionStatus) {
      renderCharts();
    }
  }
}

// アプリを起動
init();