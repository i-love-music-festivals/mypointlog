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

const state = {
  isSubmitting: false,
  message: { text: "", type: "hidden" },
  notionStatus: null,
  activeTab: 'input'
};

// ===============================================
// 2. 便利関数
// ===============================================
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===============================================
// 3. アプリのメイン処理
// ===============================================
const dateInputEl = document.getElementById("date-input");
const appsContainerEl = document.getElementById("apps-container");
const totalYenEl = document.getElementById("total-yen");
const chartContainer = document.getElementById("chart-container");

// アプリ起動時の初期設定
function init() {
  // 【27時切り替え】3時未満なら「前日」を初期値にする
  const now = new Date();
  if (now.getHours() < 3) { now.setDate(now.getDate() - 1); }
  dateInputEl.value = formatDate(now);

  // 入力欄の生成
  appsContainerEl.innerHTML = '';
  CONFIG.apps.forEach(appName => {
    const displayName = appName.replace(/（入力用）$/, '').trim();
    const groupDiv = document.createElement("div");
    groupDiv.className = "form-group";
    groupDiv.innerHTML = `
      <label class="input-label">${displayName}</label>
      <span class="total-points" data-app-name="${appName}">合計: 読み込み中...</span>
      <input type="number" class="input-field app-point-input" data-app-name="${appName}">
    `;
    appsContainerEl.appendChild(groupDiv);
  });

  // イベント登録
  dateInputEl.addEventListener("change", () => fetchNotionStatus(dateInputEl.value));
  document.getElementById("refresh-button").addEventListener("click", () => fetchNotionStatus(dateInputEl.value));
  document.getElementById("data-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("tab-input").addEventListener("click", () => { state.activeTab = 'input'; render(); });
  document.getElementById("tab-record").addEventListener("click", () => { state.activeTab = 'record'; render(); });

  fetchNotionStatus(dateInputEl.value);
  render();
}

// Notionからデータを取ってくる
async function fetchNotionStatus(date) {
  try {
    const response = await fetch(`${CONFIG.gasUrl}?date=${encodeURIComponent(date)}`);
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message);
    state.notionStatus = result;
    applyDataToUI(result);
    render();
  } catch (error) {
    state.message = { text: "エラー: " + error.message, type: "error" };
    render();
  }
}

// 取得したデータを画面に反映する
function applyDataToUI(data) {
  const { existingValues, pastTotal } = data;
  document.querySelectorAll(".app-point-input").forEach(input => {
    const appName = input.getAttribute("data-app-name");
    const todayVal = existingValues[appName] || 0;
    const baseTotal = pastTotal[appName] || 0;

    // 「前日までの合計」をラベルに表示
    const label = document.querySelector(`.total-points[data-app-name="${appName}"]`);
    if (label) label.textContent = `合計： ${baseTotal.toLocaleString()}`;

    // 入力済みなら色を変え、値をセット（前日合計＋今日の分）
    if (todayVal > 0) {
      input.classList.add("filled");
      input.value = baseTotal + todayVal;
    } else {
      input.classList.add("unfilled");
      input.value = "";
    }
  });
}

// 送信ボタンが押されたとき
async function handleFormSubmit(e) {
  e.preventDefault();
  state.isSubmitting = true;
  render();

  const payload = { date: dateInputEl.value, points: {} };
  document.querySelectorAll(".app-point-input").forEach(input => {
    const appName = input.getAttribute("data-app-name");
    if (input.value) payload.points[appName] = Number(input.value);
  });

  try {
    const response = await fetch(CONFIG.gasUrl, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.status === "success") {
      state.message = { text: "保存しました", type: "success" };
      fetchNotionStatus(dateInputEl.value);
    }
  } catch (error) {
    state.message = { text: "保存エラー", type: "error" };
  } finally {
    state.isSubmitting = false;
    render();
  }
}

// 記録タブのグラフ描画
function renderCharts() {
  if (!state.notionStatus) return;
  const { existingValues, pastTotal } = state.notionStatus;
  let chartData = [];
  let totalSumYen = 0;

  CONFIG.apps.forEach(appName => {
    const input = document.querySelector(`.app-point-input[data-app-name="${appName}"]`);
    const base = pastTotal[appName] || 0;
    let todayP = 0;
    
    // 入力欄に値があればそこから計算、なければ保存済みデータから
    if (input && input.value) {
      todayP = Math.max(0, Number(input.value) - base);
    } else {
      todayP = existingValues[appName] || 0;
    }

    const yen = todayP / (CONFIG.rates[appName] || 1);
    totalSumYen += yen;
    chartData.push({ name: appName.replace(/^\d+\.|\（入力用\）/g, ''), yen: yen });
  });

  totalYenEl.textContent = totalSumYen.toFixed(1);
  chartData.sort((a, b) => b.yen - a.yen);

  chartContainer.innerHTML = '';
  const max = Math.max(...chartData.map(d => d.yen), 10);
  chartData.forEach(d => {
    const row = document.createElement("div");
    row.className = "chart-row";
    row.innerHTML = `
      <div class="chart-label">${d.name}</div>
      <div class="chart-bar-area"><div class="chart-bar" style="width:${(d.yen/max)*100}%"></div></div>
      <div class="chart-value">${d.yen.toFixed(1)}</div>
    `;
    chartContainer.appendChild(row);
  });

  renderWeeklyChart(totalSumYen);
}

// 推移グラフ（縦棒）の描画
function renderWeeklyChart(currentTotalYen) {
  const container = document.getElementById("weekly-chart-container");
  if (!state.notionStatus || !state.notionStatus.dailyRecords) return;

  const dailyRecords = state.notionStatus.dailyRecords;
  const baseDate = new Date(dateInputEl.value);
  let weeklyData = [];
  let maxVal = 0;

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
    weeklyData.push({ label: `${d.getMonth()+1}/${d.getDate()}`, yen: dayYen });
  }

  const chartMax = maxVal * 1.2 || 10;
  container.innerHTML = '';
  weeklyData.forEach(data => {
    const h = (data.yen / chartMax) * 100;
    const group = document.createElement("div");
    group.className = "weekly-bar-group";
    group.innerHTML = `
      <div class="weekly-bar-value">${Math.round(data.yen)}</div>
      <div class="weekly-bar-container"><div class="weekly-bar" style="height:${h}%"></div></div>
      <div class="weekly-bar-label">${data.label}</div>
    `;
    container.appendChild(group);
  });
}

// 画面の更新
function render() {
  document.getElementById("status-message").textContent = state.message.text;
  document.getElementById("status-message").className = `status-msg ${state.message.type}`;
  
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
    renderCharts();
  }
}

init();