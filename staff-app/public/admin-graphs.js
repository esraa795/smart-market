import { requireAdmin } from "./guard-admin.js";
requireAdmin();

import { db } from "./firebase.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =========================
   ✅ Chart.js – עיצוב יפה + תיקון שמות ארוכים
   (לא משנה את התוכן/הלוגיקה, רק עיצוב/תצוגה)
========================= */
Chart.defaults.color = "rgba(248,250,252,.88)";
Chart.defaults.borderColor = "rgba(248,250,252,.14)";
Chart.defaults.font.family = "Arial";
Chart.defaults.font.weight = "800";

const COLORS = {
  purple: "rgba(124,58,237,.78)",
  pink:   "rgba(255,79,216,.72)",
  blue:   "rgba(56,189,248,.72)",
  mint:   "rgba(52,211,153,.70)",
  line:   "rgba(56,189,248,.95)",
  point:  "rgba(255,79,216,.95)"
};

function shortLabel(s, max = 18) {
  s = (s ?? "").toString();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function commonOptions({ rotate = 28, maxTicks = 8 } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650 },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
          color: "rgba(248,250,252,.88)",
          font: { size: 12, weight: "800" }
        }
      },
      tooltip: {
        backgroundColor: "rgba(15,23,42,.92)",
        borderColor: "rgba(255,255,255,.16)",
        borderWidth: 1,
        titleColor: "#fff",
        bodyColor: "rgba(255,255,255,.92)",
        padding: 10,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, weight: "900" },
          maxRotation: rotate,
          minRotation: rotate,
          autoSkip: true,
          maxTicksLimit: maxTicks,
          callback: function (value) {
            const label = this.getLabelForValue(value);
            return shortLabel(label, 16); // ✅ מקצר שמות ארוכים
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 11, weight: "900" } }
      }
    }
  };
}

function makeBarGradient(ctx, height = 240) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, COLORS.purple);
  g.addColorStop(0.5, COLORS.pink);
  g.addColorStop(1, COLORS.blue);
  return g;
}

/* =========================
   ✅ הקוד שלך (לוגיקה נשארת)
========================= */
function toDateSafe(v){
  if(!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function dayKey(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

function topNFromMap(mapObj, n=10){
  return Object.entries(mapObj)
    .sort((a,b) => (b[1]||0) - (a[1]||0))
    .slice(0,n);
}

async function loadOrders(){
  // orders: צריך שדה createdAt + total + items[{name,qty}]
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt","desc")));
  return snap.docs.map(d => ({ id:d.id, ...(d.data()||{}) }));
}

async function loadContacts(){
  const snap = await getDocs(query(collection(db, "contact_requests"), orderBy("createdAt","desc")));
  return snap.docs.map(d => ({ id:d.id, ...(d.data()||{}) }));
}

function buildTopProducts(orders){
  const counts = {}; // name -> qty
  for (const o of orders){
    const items = Array.isArray(o.items) ? o.items : [];
    for (const it of items){
      const name = (it?.name ?? "").toString().trim();
      if(!name) continue;
      const qty = Number(it?.qty) || 0;
      counts[name] = (counts[name] || 0) + qty;
    }
  }
  return topNFromMap(counts, 10);
}

function buildTopReasons(contacts){
  const counts = {}; // reason -> count
  for (const c of contacts){
    const reason = (c?.reason ?? "").toString().trim() || "Unknown";
    counts[reason] = (counts[reason] || 0) + 1;
  }
  return topNFromMap(counts, 10);
}

function buildRevenueByDay(orders){
  const sums = {}; // YYYY-MM-DD -> total sum
  for (const o of orders){
    const d = toDateSafe(o.createdAt);
    if(!d) continue;
    const k = dayKey(d);
    const total = Number(o.total) || 0;
    sums[k] = (sums[k] || 0) + total;
  }
  // sort by date asc
  return Object.entries(sums).sort((a,b) => a[0].localeCompare(b[0]));
}

/* =========================
   ✅ יצירת גרפים – אותו תוכן, עיצוב משופר
========================= */
let chartTopProductsRef = null;
let chartTopReasonsRef = null;
let chartRevenueByDayRef = null;

function makeBarChart(canvasId, labels, data, title){
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  // ניקוי אם כבר קיים (מונע כפילויות/באגים)
  if (canvasId === "chartTopProducts" && chartTopProductsRef) chartTopProductsRef.destroy();
  if (canvasId === "chartTopReasons" && chartTopReasonsRef) chartTopReasonsRef.destroy();

  const gradient = makeBarGradient(ctx, canvas.clientHeight || 240);

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        backgroundColor: gradient,
        borderColor: "rgba(255,255,255,.22)",
        borderWidth: 1,
        borderRadius: 10,
        barThickness: 26,
        maxBarThickness: 32,
        categoryPercentage: 0.7,
        barPercentage: 0.85
      }]
    },
    options: {
      ...commonOptions({ rotate: 30, maxTicks: 7 }),
      plugins: {
        ...commonOptions({ rotate: 30, maxTicks: 7 }).plugins,
        legend: { display: false }
      },
      scales: {
        ...commonOptions({ rotate: 30, maxTicks: 7 }).scales,
        y: {
          ...commonOptions({ rotate: 30, maxTicks: 7 }).scales.y,
          ticks: { ...commonOptions({ rotate: 30, maxTicks: 7 }).scales.y.ticks, precision: 0 }
        }
      }
    }
  });

  if (canvasId === "chartTopProducts") chartTopProductsRef = chart;
  if (canvasId === "chartTopReasons") chartTopReasonsRef = chart;

  return chart;
}

function makeLineChart(canvasId, labels, data, title){
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");

  if (chartRevenueByDayRef) chartRevenueByDayRef.destroy();

  chartRevenueByDayRef = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        tension: 0.32,
        borderColor: COLORS.line,
        backgroundColor: "rgba(124,58,237,.12)",
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: COLORS.point,
        pointBorderColor: "rgba(255,255,255,.55)",
        pointBorderWidth: 1
      }]
    },
    options: {
      ...commonOptions({ rotate: 0, maxTicks: 8 }),
      plugins: {
        ...commonOptions({ rotate: 0, maxTicks: 8 }).plugins,
        legend: { display: true }
      },
      scales: {
        ...commonOptions({ rotate: 0, maxTicks: 8 }).scales,
        x: {
          ...commonOptions({ rotate: 0, maxTicks: 8 }).scales.x,
          ticks: {
            ...commonOptions({ rotate: 0, maxTicks: 8 }).scales.x.ticks,
            maxRotation: 0,
            minRotation: 0,
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return shortLabel(label, 12);
            }
          }
        }
      }
    }
  });

  return chartRevenueByDayRef;
}

async function main(){
  const [orders, contacts] = await Promise.all([loadOrders(), loadContacts()]);

  // 1) top products
  const topProducts = buildTopProducts(orders);
  makeBarChart(
    "chartTopProducts",
    topProducts.map(x => x[0]),
    topProducts.map(x => x[1]),
    "כמות שנמכרה"
  );

  // 2) top reasons
  const topReasons = buildTopReasons(contacts);
  makeBarChart(
    "chartTopReasons",
    topReasons.map(x => x[0]),
    topReasons.map(x => x[1]),
    "כמות פניות"
  );

  // 3) revenue by day
  const revByDay = buildRevenueByDay(orders);
  makeLineChart(
    "chartRevenueByDay",
    revByDay.map(x => x[0]),
    revByDay.map(x => x[1]),
    "סכום יומי"
  );
}

main().catch(err => {
  console.error(err);
  alert("שגיאה בטעינת נתונים לגרפים (בדקי הרשאות / Rules)");
});
