import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const notesReadyDiv = document.getElementById("notesReady");
const notesDeliveredDiv = document.getElementById("notesDelivered");

const emptyReady = document.getElementById("emptyReady");
const emptyDelivered = document.getElementById("emptyDelivered");
const emptyText = document.getElementById("empty");

// Icons by notification type
function getIconByType(type) {
  if (type === "delivered") return "/static/images/delivered.png";
  if (type === "ready_for_pickup") return "/static/images/box2.png";
  return "/static/images/box2.png";
}

// Display-only translation (does NOT change Firebase data)
function translateMessage(n) {
  const raw = (n?.message || "").toString();

  if (n?.type === "ready_for_pickup" || raw.includes("מוכנה לאיסוף")) {
    return " Your order is ready for pickup";
  }

  if (n?.type === "delivered" || raw.includes("נמסרה")) {
    return " Your order was delivered successfully";
  }

  return raw || "Notification";
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    emptyText.textContent = "Please login to see notifications";
    return;
  }

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", user.uid),
    where("read", "==", false)
  );

  onSnapshot(q, (snap) => {
    notesReadyDiv.innerHTML = "";
    notesDeliveredDiv.innerHTML = "";

    emptyReady.textContent = "";
    emptyDelivered.textContent = "";
    emptyText.textContent = "";

    if (snap.empty) {
      emptyText.textContent = "No new notifications";
      return;
    }

    let readyCount = 0;
    let deliveredCount = 0;

    snap.forEach((docSnap) => {
      const n = docSnap.data();
      const id = docSnap.id;

      const div = document.createElement("div");
      div.className = "note";

      const dateText = n.createdAt?.toDate
        ? n.createdAt.toDate().toLocaleString()
        : "";

      const icon = getIconByType(n.type);
      const msg = translateMessage(n);

      div.innerHTML = `
        <div class="left">
          <div class="icon-box">
            <img src="${icon}" alt="icon">
          </div>
          <div class="text">
            <div class="msg">${msg}</div>
            <div class="meta">${dateText}</div>
          </div>
        </div>

        <div class="actions">
          <button class="go">View Order</button>
          <button class="mark">Mark as Read</button>
        </div>
      `;

    div.querySelector(".go").onclick = () => {
  const orderId = n.orderId; // חייב להיות שמור במסמך notification
  if(!orderId){
    alert("Missing orderId in notification");
    return;
  }
 location.href = `/order-details?orderId=${encodeURIComponent(orderId)}`;

};


      div.querySelector(".mark").onclick = async () => {
        await updateDoc(doc(db, "notifications", id), { read: true });
      };

      // Split by type
      if (n.type === "delivered") {
        deliveredCount++;
        notesDeliveredDiv.appendChild(div);
      } else {
        readyCount++;
        notesReadyDiv.appendChild(div);
      }
    });

    if (readyCount === 0) emptyReady.textContent = "No orders ready for pickup";
    if (deliveredCount === 0) emptyDelivered.textContent = "No delivered orders";
  });
});
