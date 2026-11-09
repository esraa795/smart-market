import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const ordersDiv = document.getElementById("orders");
const emptyText = document.getElementById("empty");

onAuthStateChanged(auth, async user => {
  if (!user) {
    emptyText.textContent = "Please login to view your orders";
    return;
  }

  const q = query(
    collection(db, "orders"),
    where("userId", "==", user.uid)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    emptyText.textContent = "You don't have any orders yet";
    return;
  }

  emptyText.textContent = "";

  snap.forEach(docSnap => {
    const order = docSnap.data();

    const div = document.createElement("div");
    div.className = "order";

    div.innerHTML = `
      <div class="order-head">
        <div>
          <h3 class="order-title">Order</h3>

          <div class="meta">
            <span class="pill status">Status: ${order.status}</span>
            <span class="pill total">Total: ₪${order.total}</span>
            <span class="pill date">Date: ${order.createdAt?.toDate().toLocaleString() || ""}</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="items"></div>
    `;

    const itemsContainer = div.querySelector(".items");

    (order.items || []).forEach(item => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "item";

      itemDiv.innerHTML = `
        <div class="imgBox">
          <img src="${item.imageUrl}" alt="">
        </div>
        <div class="itemText">${item.name} × ${item.qty}</div>
      `;

      itemsContainer.appendChild(itemDiv);
    });

    ordersDiv.appendChild(div);
  });
});
