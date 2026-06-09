// ===============================================
// 1. 設定データ（データ側：意味を持たせる部分）
// ===============================================
const CONFIG = {
  gasUrl: "https://script.google.com/macros/s/AKfycbymsBGtnZhmBIiGDKYhMCRwBQbSLzDYUcEbzt3Bz_xDd2sT6dcq_FIMbCQxLzOqrIjK7Q/exec", // GASのウェブアプリURLを入れます
  // アプリの名前のリスト（入力用の目印として「（入力用）」がついています）
  apps: [
    "1.トリマ（入力用）", "2.アルコイン（入力用）", "3.レシチャレ（入力用）",
    "4.powl（入力用）", "5.プラリー（入力用）", "6.もふポ（入力用）",
    "7.ビーンズ（入力用）", "8.ポイントインカム（入力用）", "9.ポイントタウン（入力用）",
    "10.シェアフル（入力用）", "11.Pint（入力用）", "12.PUI（入力用）",
    "13.おぢポ（入力用）", "14.ぽいころ（入力用）", "15.ロコネ（入力用）",
    "16.YONQ（入力用）", "17.Moneywalk（入力用）", "18.Cashwalk（入力用）",
    "19.エブリポイント（入力用）", "20.tokuria walk（入力用）", "21.毎日運動（入力用）",
    "22.noma（入力用）", "23.TikTok Lite（入力用）", "24.トクエル（入力用）",
    "25.オモポ（入力用）", "26.ポイにゃん（正）（入力用）", "27.ポイにゃん（副）（入力用）"
  ],
  // アプリごとの1円あたりのポイント交換レート（例: 115ポイントで1円）
  rates: {
    "1.トリマ（入力用）": 115, "2.アルコイン（入力用）": 10, "3.レシチャレ（入力用）": 110,
    "4.powl（入力用）": 11, "5.プラリー（入力用）": 150, "6.もふポ（入力用）": 90,
    "7.ビーンズ（入力用）": 110, "8.ポイントインカム（入力用）": 10, "9.ポイントタウン（入力用）": 1,
    "10.シェアフル（入力用）": 100, "11.Pint（入力用）": 100, "12.PUI（入力用）": 11,
    "13.おぢポ（入力用）": 9, "14.ぽいころ（入力用）": 15, "15.ロコネ（入力用）": 110,
    "16.YONQ（入力用）": 110, "17.Moneywalk（入力用）": 20, "18.Cashwalk（入力用）": 6,
    "19.エブリポイント（入力用）": 110, "20.tokuria walk（入力用）": 110, "21.毎日運動（入力用）": 275,
    "22.noma（入力用）": 120, "23.TikTok Lite（入力用）": 100, "24.トクエル（入力用）": 110,
    "25.オモポ（入力用）": 110, "26.ポイにゃん（正）（入力用）": 120,"27.ポイにゃん（副）（入力用）": 120
  }
};

// アプリ全体の状態を管理する箱（この中身が変わると画面が変わります）
const state = {
  isSubmitting: false,       // 送信中のフラグ（通信中かどうか）
  message: { text: "", type: "hidden" }, // 画面上のメッセージ（文字と種類）
  notionStatus: null,        // Notionから取得したデータを保存する場所
  activeTab: 'input'         // 現在開いているタブ ('input' ＝入力 または 'record' ＝記録)
};

// ===============================================
// 2. 便利関数
// ===============================================
// 日付のデータを「YYYY-MM-DD（例：2023-10-01）」という文字の形に変換する関数
function formatDate(date) {
  const y = date.getFullYear(); // 年を取り出す
  const m = String(date.getMonth() + 1).padStart(2, '0'); // 月を取り出す（1月は0から始まるので+1し、2桁にする）
  const d = String(date.getDate()).padStart(2, '0'); // 日を取り出す（2桁にする）
  return `${y}-${m}-${d}`; // 年-月-日 の形で合体させて返す
}

// ===============================================
// 3. アプリのメイン処理（ロジック側：画面を作る）
// ===============================================
// HTML上にある、操作したい部品（エレメント）をあらかじめ探して取得しておく
const dateInputEl = document.getElementById("date-input");       // 日付入力欄
const appsContainerEl = document.getElementById("apps-container"); // アプリ入力欄を並べる場所
const totalYenEl = document.getElementById("total-yen");         // 合計円の表示場所
const chartContainer = document.getElementById("chart-container"); // グラフの表示場所

// アプリが起動した時に一番最初に実行される初期設定の関数
function init() {
  // 今の時間を取得
  const now = new Date();
  // 午前3時未満なら、日付を「昨日」にずらす（深夜まで前日分として扱うため）
  if (now.getHours() < 3) {
    now.setDate(now.getDate() - 1);
  }
  // 計算した日付を、画面の日付入力欄にセットする
  dateInputEl.value = formatDate(now);

  // 一旦、アプリごとの入力欄を空っぽにして綺麗にする
  appsContainerEl.innerHTML = '';
  
  // 設定データにあるアプリのリストを1つずつ取り出して処理する
  CONFIG.apps.forEach(appName => {
    // ユーザーに見せる用の名前を作る（「（入力用）」という文字を消す）
    const displayName = appName.replace(/（入力用）$/, '').trim();
    
    // HTMLの部品（divタグ）を新しく作る
    const groupDiv = document.createElement("div");
    // その部品に "form-group" というCSSのクラスをつける（これでCSSが適用される）
    groupDiv.className = "form-group";
    
    // HTMLの骨組みとして、名前ラベル・合計表示・入力欄 を書き込む
    groupDiv.innerHTML = `
      <label class="input-label">${displayName}</label>
      <span class="total-points" data-app-name="${appName}">合計: 読み込み中...</span>
      <input type="number" class="input-field app-point-input" data-app-name="${appName}">
    `;
    
    // 完成した入力欄の部品を、画面に並べる
    appsContainerEl.appendChild(groupDiv);
  });

  // ユーザーの操作（イベント）を見張るための設定
  // 日付が変更されたら、Notionから新しい日付のデータを取ってくる
  dateInputEl.addEventListener("change", () => fetchNotionStatus(dateInputEl.value));
  // 更新ボタンが押されたら、Notionからデータを取ってくる
  document.getElementById("refresh-button").addEventListener("click", () => fetchNotionStatus(dateInputEl.value));
  // 送信ボタンが押されたら、保存処理（handleFormSubmit）を実行する
  document.getElementById("data-form").addEventListener("submit", handleFormSubmit);
  
  // 入力タブが押されたら、状態を 'input' にして画面を作り直す
  document.getElementById("tab-input").addEventListener("click", () => { state.activeTab = 'input'; render(); });
  // 記録タブが押されたら、状態を 'record' にして画面を作り直す
  document.getElementById("tab-record").addEventListener("click", () => { state.activeTab = 'record'; render(); });

  // 最初に表示されている日付のデータをNotionから取ってくる
  fetchNotionStatus(dateInputEl.value);
  // 現在の状態に合わせて画面を描く（反映する）
  render();
}

// Notionから指定された日付のデータを取得する関数（async は「裏で通信を待つ」という意味）
async function fetchNotionStatus(date) {
  try {
    // GASのURLに日付をくっつけて、データをリクエストする
    const response = await fetch(`${CONFIG.gasUrl}?date=${encodeURIComponent(date)}`);
    // 帰ってきた結果をJSON（JavaScriptで扱えるデータ）に変換する
    const result = await response.json();
    
    // もしステータスが成功(success)じゃなかったら、エラーを発生させる
    if (result.status !== "success") throw new Error(result.message);
    
    // 取得したデータを状態(state)に保存する
    state.notionStatus = result;
    // データを画面の入力欄に反映させる
    applyDataToUI(result);
    // 画面を描き直す
    render();
  } catch (error) {
    // エラーが起きたら、エラーメッセージを状態にセットする
    state.message = { text: "エラー: " + error.message, type: "error" };
    render();
  }
}

// Notionから取得したデータを画面の入力欄や合計ラベルに反映する関数
function applyDataToUI(data) {
  // データの中から「今日の実績（差分）」と「過去の合計」を取り出す
  const { existingValues, pastTotal } = data;

  // 画面上にあるすべてのアプリ入力欄を探して、1つずつ処理する
  document.querySelectorAll(".app-point-input").forEach(input => {
    // その入力欄がどのアプリのものか、名前を取得する
    const appName = input.getAttribute("data-app-name");
    // 今日の実績データがあれば取得（なければ0）
    const todayVal = existingValues[appName] || 0;
    // 過去の合計データがあれば取得（なければ0）
    const baseTotal = pastTotal[appName] || 0;

    // 「前日までの合計」を表示するラベルの部品を探す
    const label = document.querySelector(`.total-points[data-app-name="${appName}"]`);
    if (label) {
      // ラベルの文字を書き換える（toLocaleString で数字にカンマをつける）
      label.textContent = `合計： ${baseTotal.toLocaleString()}`;
    }

    // もし今日の実績が0より大きければ
    if (todayVal > 0) {
      // 入力欄には「過去の合計 ＋ 今日の実績」を足した現在の総ポイント数を表示する
      input.value = baseTotal + todayVal;
    } else {
      // まだ入力されていなければ、空っぽにしておく
      input.value = "";
    }

    // 一旦、「入力済み(filled)」「未入力(unfilled)」のCSSクラスを取り除く
    input.classList.remove('filled', 'unfilled');
    // 今日の実績があれば「入力済み」の色（クラス）にする
    if (todayVal > 0) {
      input.classList.add('filled');
    } else {
      // なければ「未入力」の色（クラス）にする
      input.classList.add('unfilled');
    }
  });
}

// フォームの送信ボタンが押されたときの処理（Notionへ保存）
async function handleFormSubmit(e) {
  e.preventDefault(); // 本来のフォーム送信（画面がリロードされる動作）をストップする
  
  state.isSubmitting = true; // 送信中の状態にする
  render(); // 一度画面を更新

  // Notionに送るためのデータを入れる箱（ペイロード）を作る
  const payload = { date: dateInputEl.value, points: {} };
  
  // すべての入力欄をチェックする
  document.querySelectorAll(".app-point-input").forEach(input => {
    const appName = input.getAttribute("data-app-name");
    // もし入力欄に数字が入っていたら
    if (input.value) {
      // その数字をデータに追加する
      payload.points[appName] = Number(input.value);
    }
  });

  try {
    // GASに向かってデータを送信する（POST送信）
    const response = await fetch(CONFIG.gasUrl, {
      method: "POST",
      body: JSON.stringify(payload) // データを文字列にして送る
    });
    
    // 送信結果を受け取る
    const result = await response.json();
    
    // 成功した場合
    if (result.status === "success") {
      // 「保存しました」という成功メッセージをセットする
      state.message = { text: "保存しました", type: "success" };
      
      // 保存がうまくいったので、最新のデータをもう一度Notionから取り直す
      await fetchNotionStatus(dateInputEl.value);

      // 【今回の修正箇所】
      // 1000ミリ秒（1秒）後に、中の処理を実行する
      setTimeout(() => {
        // メッセージの文字を空にして、隠す(hidden)タイプに変更する
        state.message = { text: "", type: "hidden" };
        // 画面を再描画して、実際にメッセージを消す
        render();
      }, 1000);

    } else {
      // 成功以外の返事が来たらエラーとして扱う
      throw new Error(result.message);
    }
  } catch (error) {
    // 通信エラーなどが起きた場合のメッセージをセットする
    state.message = { text: "保存エラー: " + error.message, type: "error" };
  } finally {
    // 成功しても失敗しても、送信中の状態は解除する
    state.isSubmitting = false;
    render(); // 画面を更新する
  }
}

// 記録タブの「本日の合計円」と「アプリ別の棒グラフ」を描画する関数
function renderCharts() {
  // Notionのデータがまだ無ければ何もしない
  if (!state.notionStatus) return;
  
  const { existingValues, pastTotal } = state.notionStatus;
  let chartData = [];  // グラフ用のデータを集めるリスト
  let totalSumYen = 0; // 全体の合計金額（円）

  // 設定にあるすべてのアプリをチェックする
  CONFIG.apps.forEach(appName => {
    // そのアプリの入力欄を探す
    const input = document.querySelector(`.app-point-input[data-app-name="${appName}"]`);
    const base = pastTotal[appName] || 0; // 過去の合計
    let todayP = 0; // 今日のポイント

    // 入力欄に今入っている数字があれば、そこから過去の合計を引いて「今日の分」を計算
    if (input && input.value) {
      todayP = Math.max(0, Number(input.value) - base);
    } else {
      // 入力欄になければ、Notionから取得した「今日の分」を使う
      todayP = existingValues[appName] || 0;
    }

    // ポイントをレートで割って、円に換算する
    const yen = todayP / (CONFIG.rates[appName] || 1);
    totalSumYen += yen; // 合計金額に足す
    
    // グラフ用のデータリストに追加する
    chartData.push({
      name: appName.replace(/^\d+\.|\（入力用\）/g, ''), // 「1.」や「（入力用）」の文字を消す
      yen: yen
    });
  });

  // 画面の合計円の文字を書き換える（小数点第一位まで）
  totalYenEl.textContent = totalSumYen.toFixed(1);

  // グラフのデータを、稼いだ金額が多い順に並び替える
  chartData.sort((a, b) => b.yen - a.yen);

  // グラフを描く場所を一旦空っぽにする
  chartContainer.innerHTML = '';
  
  // 一番稼いだアプリの金額を探す（ゲージの長さを決める基準にするため。最低10円分を基準にする）
  const max = Math.max(...chartData.map(d => d.yen), 10);
  
  // 並び替えたデータを使って、一つずつグラフのバーを作る
  chartData.forEach(d => {
    const row = document.createElement("div");
    row.className = "chart-row";
    // 基準に対する割合(%)を計算して、バーの横幅(width)を決める
    row.innerHTML = `
      <div class="chart-label">${d.name}</div>
      <div class="chart-bar-area">
        <div class="chart-bar" style="width:${(d.yen / max) * 100}%"></div>
      </div>
      <div class="chart-value">${d.yen.toFixed(1)}</div>
    `;
    chartContainer.appendChild(row);
  });

  // 週間推移グラフ（縦棒グラフ）を描く関数も呼び出す
  renderWeeklyChart(totalSumYen);
}

// 週間推移グラフ（過去7日間）を描く関数
function renderWeeklyChart(currentTotalYen) {
  const container = document.getElementById("weekly-chart-container");
  // データが無ければ何もしない
  if (!state.notionStatus || !state.notionStatus.dailyRecords) return;

  const dailyRecords = state.notionStatus.dailyRecords;
  const baseDate = new Date(dateInputEl.value); // 画面で選択されている日付
  let weeklyData = [];
  let maxVal = 0; // グラフの高さの基準にする最大値

  // 過去7日間分、6〜0までカウントダウンしながら繰り返す
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    // 日付をi日前にずらす（6日前、5日前...最後は今日）
    d.setDate(baseDate.getDate() - i);
    const dStr = formatDate(d); // 日付を文字列にする
    let dayYen = 0; // その日の合計円

    // その日が「今日（画面で選んでいる日）」なら、さっき計算した合計円を使う
    if (dStr === dateInputEl.value) {
      dayYen = currentTotalYen;
    } else {
      // 過去の日付なら、Notionから取得した日別データから円を計算する
      const record = dailyRecords[dStr] || {};
      CONFIG.apps.forEach(app => {
        dayYen += (record[app] || 0) / (CONFIG.rates[app] || 1);
      });
    }
    // 最大値を更新する
    maxVal = Math.max(maxVal, dayYen);
    // グラフ用データに追加
    weeklyData.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`, // ラベルは「月/日」
      yen: dayYen
    });
  }

  // グラフの高さを決める最大基準（ちょっと余裕をもたせて1.2倍する）
  const chartMax = maxVal * 1.2 || 10;
  container.innerHTML = '';
  
  // 7日分の縦棒グラフを作る
  weeklyData.forEach(data => {
    // 高さをパーセントで計算する
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

// 画面全体の表示を、現在の状態（タブやメッセージ）に合わせて一斉に更新する関数
function render() {
  // メッセージを表示するHTML部品を取得
  const msgDiv = document.getElementById("status-message");
  // 状態データに入っているメッセージの文字をセット
  msgDiv.textContent = state.message.text;
  // メッセージの種類に合わせてCSSのクラスを付け替える（色が変わったり、消えたりする）
  msgDiv.className = `status-msg ${state.message.type}`;

  // どのタブを開いているかで、部品の表示・非表示(activeクラスの付け外し)を切り替える
  if (state.activeTab === 'input') {
    // 入力タブが選ばれている場合
    document.getElementById("tab-input").classList.add("active");
    document.getElementById("tab-record").classList.remove("active");
    document.getElementById("view-input").classList.add("active");
    document.getElementById("view-record").classList.remove("active");
  } else {
    // 記録タブが選ばれている場合
    document.getElementById("tab-input").classList.remove("active");
    document.getElementById("tab-record").classList.add("active");
    document.getElementById("view-input").classList.remove("active");
    document.getElementById("view-record").classList.add("active");
    
    // 記録タブが表示された時だけ、グラフを描画する処理を呼ぶ
    if (state.notionStatus) {
      renderCharts();
    }
  }
}

// 上で定義した設定をすべて読み終わったら、いよいよアプリを起動する
init();