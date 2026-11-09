import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const cartDiv = document.getElementById("cart");
const emptyText = document.getElementById("empty");
const totalText = document.getElementById("total");

// ✅ כאן התיקון
const checkoutBtn = document.getElementById("finishOrderBtn");

onAuthStateChanged(auth, async user => {
  if (!user) {
    emptyText.textContent = "יש להתחבר כדי לראות את הסל";
    return;
  }

  const cartRef = collection(db, "users", user.uid, "cart");
  const snap = await getDocs(cartRef);

  if (snap.empty) {
    emptyText.textContent = "הסל ריק";
    totalText.textContent = "";
    checkoutBtn.style.display = "none";
    return;
  }

  cartDiv.innerHTML = "";
  let total = 0;

  snap.forEach(docSnap => {
    const item = docSnap.data();
    const productId = docSnap.id;

    total += item.price * item.qty;

    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <img src="${item.imageUrl}">
      <div style="flex:1">
        <p><strong>${item.name}</strong></p>
        <p>₪${item.price}</p>

        <div style="display:flex; align-items:center; gap:8px">
          <button class="qty-btn minus">➖</button>
          <span>${item.qty}</span>
          <button class="qty-btn plus">➕</button>
        </div>
      </div>

      <button class="delete-btn" style="background:transparent; border:none; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center;">
        <img src="/static/images/bin.png" alt="Delete" class="bin-icon" style="width:30px; height:30px;">
      </button>
    `;

    div.querySelector(".plus").onclick = async () => {
      await updateDoc(
        doc(db, "users", user.uid, "cart", productId),
        { qty: item.qty + 1 }
      );
      location.reload();
    };

    div.querySelector(".minus").onclick = async () => {
      if (item.qty === 1) {
        await deleteDoc(doc(db, "users", user.uid, "cart", productId));
      } else {
        await updateDoc(
          doc(db, "users", user.uid, "cart", productId),
          { qty: item.qty - 1 }
        );
      }
      location.reload();
    };

    div.querySelector(".delete-btn").onclick = async () => {
      if (!confirm("למחוק את המוצר מהסל?")) return;
      await deleteDoc(doc(db, "users", user.uid, "cart", productId));
      location.reload();
    };

    cartDiv.appendChild(div);
  });

  totalText.textContent = `סה"כ לתשלום: ₪${total}`;

  // 🛒 מעבר לתשלום (לא יוצר הזמנה כאן!)
  checkoutBtn.onclick = () => {
    location.href = "/payment";
  };
});
document.getElementById("backBtn").onclick = () => {
  location.href = "/customer";
};

