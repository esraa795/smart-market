import { requireAdmin } from "./guard-admin.js";
requireAdmin();

import { db, firebaseConfig } from "./firebase.js";

import {
  collection, query, where, getDocs,
  doc, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ========= UI ========= */
const firstNameEl = document.getElementById("firstName");
const lastNameEl  = document.getElementById("lastName");
const phoneEl     = document.getElementById("phone");
const addressEl   = document.getElementById("address");
const emailEl     = document.getElementById("email");
const passwordEl  = document.getElementById("password");

const createBtn = document.getElementById("createWorkerBtn");
const msgEl = document.getElementById("msg");

const tbody = document.getElementById("tbody");
const empty = document.getElementById("empty");

function setMsg(t){ msgEl.textContent = t || ""; }
function safe(v){ return (v===null||v===undefined) ? "" : String(v); }

/* ========= Secondary Auth (כדי לא לנתק מנהל) ========= */
const secondaryApp = initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

/* ========= Create Worker ========= */
async function createWorker(){
  const firstName = firstNameEl.value.trim();
  const lastName  = lastNameEl.value.trim();
  const phone     = phoneEl.value.trim();
  const address   = addressEl.value.trim();
  const email     = emailEl.value.trim();
  const password  = passwordEl.value;

  if (!firstName || !lastName || !email || !password) {
    setMsg("חובה למלא: שם פרטי, שם משפחה, אימייל וסיסמה");
    return;
  }

  setMsg("יוצר עובד...");

  // 1) יצירת משתמש ב-Firebase Auth (ב-auth משני)
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;

  // 2) שמירת פרטי העובד ב-Firestore תחת users/{uid}
  await setDoc(doc(db, "users", uid), {
    firstName,
    lastName,
    phone: phone || "",
    address: address || "",
    email,
    role: "worker",
    createdAt: serverTimestamp()
  });

  // 3) ניתוק ה-auth המשני (כדי שלא "ישאר" עובד מחובר שם)
  await signOut(secondaryAuth);

  setMsg("✅ עובד נוצר בהצלחה ויכול להתחבר למסך עובדים");
  clearForm();
  await loadWorkers();
}

function clearForm(){
  firstNameEl.value = "";
  lastNameEl.value = "";
  phoneEl.value = "";
  addressEl.value = "";
  emailEl.value = "";
  passwordEl.value = "";
}

/* ========= List Workers (from Firestore) ========= */
async function loadWorkers(){
  tbody.innerHTML = "";
  empty.textContent = "טוען...";

  const q = query(collection(db, "users"), where("role", "==", "worker"));
  const snap = await getDocs(q);

  const workers = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));

  if (workers.length === 0) {
    empty.textContent = "אין עובדים להצגה.";
    return;
  }

  empty.textContent = "";

  for (const w of workers) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safe(w.firstName)} ${safe(w.lastName)}</td>
      <td>${safe(w.email)}</td>
      <td>${safe(w.phone)}</td>
      <td><button class="danger" data-del="${w.id}">מחיקה</button></td>
    `;
    tbody.appendChild(tr);
  }

  // מחיקה (רק מה-Firestore)
  // חשוב: מחיקת משתמש מ-Auth דורשת Firebase Admin SDK (שרת/Cloud Function)
  tbody.querySelectorAll("button[data-del]").forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.getAttribute("data-del");
      const ok = confirm("למחוק את העובד מהרשימה? (המחיקה כאן היא רק מה-Database)");
      if (!ok) return;

      await deleteDoc(doc(db, "users", uid));
      await loadWorkers();
    };
  });
}

/* ========= Events ========= */
createBtn.onclick = () => createWorker().catch(err => {
  console.error(err);
  setMsg("❌ שגיאה ביצירת עובד: " + (err?.message || err));
});

loadWorkers().catch(err => {
  console.error(err);
  empty.textContent = "❌ שגיאה בטעינת עובדים";
});
