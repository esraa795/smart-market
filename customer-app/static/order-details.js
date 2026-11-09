import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const orderBox = document.getElementById("orderBox");
const emptyText = document.getElementById("empty");

function getOrderIdFromUrl(){
  const params = new URLSearchParams(location.search);
  return params.get("orderId");
}

function safeDate(ts){
  try{
    return ts?.toDate ? ts.toDate().toLocaleString() : "";
  }catch{
    return "";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    emptyText.textContent = "Please login to view this order";
    return;
  }

  const orderId = getOrderIdFromUrl();
  if (!orderId) {
    emptyText.textContent = "Missing orderId in URL";
    return;
  }

  try{
    const snap = await getDoc(doc(db, "orders", orderId));
    if (!snap.exists()){
      emptyText.textContent = "Order not found";
      return;
    }

    const order = snap.data() || {};

    // ✅ הגנה: לקוח יכול לראות רק את ההזמנה שלו
    if (order.userId !== user.uid) {
      emptyText.textContent = "Access denied";
      return;
    }

    emptyText.textContent = "";
    orderBox.innerHTML = "";

    const div = document.createElement("div");
    div.className = "order";

    div.innerHTML = `
      <div class="order-head">
        <div>
          <h3 class="order-title">Order #${snap.id}</h3>

          <div class="meta">
            <span class="pill status">Status: ${order.status ?? ""}</span>
            <span class="pill total">Total: ₪${order.total ?? 0}</span>
            <span class="pill date">Date: ${safeDate(order.createdAt)}</span>
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
          <img src="${item.imageUrl || ""}" alt="">
        </div>
        <div class="itemText">${item.name || ""} × ${item.qty || 0}</div>
      `;

      itemsContainer.appendChild(itemDiv);
    });

    orderBox.appendChild(div);

  }catch(err){
    console.error(err);
    emptyText.textContent = "Failed to load order";
  }
});
