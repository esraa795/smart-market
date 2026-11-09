import { requireAdmin } from "./guard-admin.js";
requireAdmin();

import { db } from "./firebase.js";

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const storage = getStorage();

const categoryEl = document.getElementById("category");
const productIdEl = document.getElementById("productId");
const nameEl = document.getElementById("name");
const priceEl = document.getElementById("price");
const descEl = document.getElementById("description");
const imageFileEl = document.getElementById("imageFile");
const previewEl = document.getElementById("preview");

const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const deleteBtn = document.getElementById("deleteBtn");

const msgEl = document.getElementById("msg");

const listCategoryEl = document.getElementById("listCategory");
const searchEl = document.getElementById("search");
const tbody = document.getElementById("tbody");
const empty = document.getElementById("empty");

let lastLoaded = []; // cache של הרשימה

function setMsg(t){ msgEl.textContent = t || ""; }
function safe(v){ return (v===null||v===undefined) ? "" : String(v); }
function makeIdFromName(name){
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .slice(0, 50) || "product";

  const rand = Math.random().toString(36).slice(2, 6); // 4 chars
  return `${base}-${rand}`;
}


imageFileEl.addEventListener("change", () => {
  const f = imageFileEl.files?.[0];
  if (!f) return (previewEl.src = "");
  previewEl.src = URL.createObjectURL(f);
});

async function uploadProductImage(file, category, productId){
  if (!file) return "";
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const cleanCategory = category.replace(/\s+/g, "_");
  const path = `products/${cleanCategory}/${productId}.${ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
  return await getDownloadURL(storageRef);
}

async function saveProduct(){
  const category = categoryEl.value.trim();
  const name = nameEl.value.trim();
  const description = descEl.value.trim();
  const price = Number(priceEl.value) || 0;
  const file = imageFileEl.files?.[0] || null;

  if (!category || !name) {
    setMsg("חובה למלא קטגוריה + שם מוצר");
    return;
  }

  let productId = productIdEl.value.trim();
  if (!productId) productId = makeIdFromName(name);
  productIdEl.value = productId;

  setMsg("שומר...");

  const productRef = doc(db, "products", category, "items", productId);

  // ✅ אם לא העלו תמונה חדשה – נשאיר את imageUrl הקיים
  let imageUrl = "";
  if (file) {
    imageUrl = await uploadProductImage(file, category, productId);
  } else {
    const existing = await getDoc(productRef);
    if (existing.exists()) {
      imageUrl = existing.data()?.imageUrl || "";
    }
  }

  const data = {
    Category: category.toLowerCase(),
    Name: name,
    Description: description,
    price: price,
    imageUrl: imageUrl
  };

  await setDoc(productRef, data, { merge: true });

  setMsg("✅ נשמר בהצלחה (הוספה/עדכון)");
  await loadList();
}

async function deleteProduct(){
  const category = categoryEl.value.trim();
  const productId = productIdEl.value.trim();

  if (!category || !productId) {
    setMsg("צריך למלא קטגוריה + ID כדי למחוק");
    return;
  }

  const productRef = doc(db, "products", category, "items", productId);

  const ok = confirm("למחוק את המוצר הזה?");
  if (!ok) return;

  await deleteDoc(productRef);
  setMsg("🗑️ נמחק בהצלחה");
  await loadList();
}

function clearForm(){
  categoryEl.value = "";
  productIdEl.value = "";
  nameEl.value = "";
  priceEl.value = "";
  descEl.value = "";
  imageFileEl.value = "";
  previewEl.src = "";
  setMsg("");
}

function renderList(){
  tbody.innerHTML = "";
  empty.textContent = "";

  const q = searchEl.value.trim().toLowerCase();

  const filtered = lastLoaded.filter(p => {
    if (!q) return true;
    return `${p.id} ${p.Name}`.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    empty.textContent = "אין מוצרים להצגה.";
    return;
  }

  for (const p of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="inline">
          <img class="thumb" src="${safe(p.imageUrl)}" onerror="this.style.display='none'" />
        </div>
      </td>
      <td>${safe(p.id)}</td>
      <td>${safe(p.Name)}</td>
      <td>${safe(p.price)}</td>
      <td>
        <button class="secondary" data-edit="${p.id}">עריכה</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("button[data-edit]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-edit");
      const category = listCategoryEl.value.trim();

      const productRef = doc(db, "products", category, "items", id);
      const snap = await getDoc(productRef);
      if (!snap.exists()) return;

      const data = snap.data() || {};
      categoryEl.value = category;
      productIdEl.value = id;
      nameEl.value = data.Name || "";
      priceEl.value = data.price ?? "";
      descEl.value = data.Description || "";
      previewEl.src = data.imageUrl || "";
      imageFileEl.value = "";
      setMsg("עריכת מוצר נטענה. לשינוי תמונה בחרי קובץ חדש ואז שמירה.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  });
}

async function loadList(){
  const category = listCategoryEl.value.trim();
  empty.textContent = "טוען...";

  const snap = await getDocs(query(collection(db, "products", category, "items")));
  lastLoaded = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));

  renderList();
}

saveBtn.onclick = () => saveProduct().catch(e => {
  console.error(e);
  setMsg("❌ שגיאה בשמירה (בדקי Rules / Storage Rules)");
});

deleteBtn.onclick = () => deleteProduct().catch(e => {
  console.error(e);
  setMsg("❌ שגיאה במחיקה");
});

clearBtn.onclick = clearForm;

listCategoryEl.onchange = loadList;
searchEl.oninput = renderList;

loadList().catch(e => {
  console.error(e);
  empty.textContent = "❌ שגיאה בטעינת מוצרים (בדקי הרשאות)";
});
