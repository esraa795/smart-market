import { db } from "./firebase.js";
import { collection, getDocs } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.getElementById("categoryToggle");
  const list = document.getElementById("categoryList");
  const arrow = document.getElementById("categoryArrow");

  toggle.addEventListener("click", () => {
    list.classList.toggle("open");
    arrow.classList.toggle("rotate");
  });

  const snapshot = await getDocs(collection(db, "products"));

  snapshot.forEach(doc => {
    const data = doc.data();

    const card = document.createElement("div");
    card.className = "category-card";

    card.innerHTML = `
      <img src="${data.image}" alt="${doc.id}">
      <span>${doc.id}</span>
    `;

    // 🔥 מעבר לעמוד מוצרים לפי קטגוריה
    card.addEventListener("click", () => {
     window.location.href = `/category?category=${encodeURIComponent(doc.id)}`;

    });

    list.appendChild(card);
  });
});
