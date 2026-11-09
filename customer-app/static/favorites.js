import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const favDiv = document.getElementById("favorites");
const emptyText = document.getElementById("empty");

onAuthStateChanged(auth, async user => {
  if (!user) {
    emptyText.textContent = "יש להתחבר כדי לראות מועדפים";
    return;
  }

  const favRef = collection(db, "users", user.uid, "favorites");
  const snap = await getDocs(favRef);

  if (snap.empty) {
    emptyText.textContent = "אין מוצרים במועדפים";
    return;
  }

  snap.forEach(docSnap => {
    const item = docSnap.data();
    const productId = docSnap.id;

    const div = document.createElement("div");
    div.className = "fav-item";

 div.innerHTML = `
  <div class="product">
    <img src="${item.imageUrl}">
    <div>
      <p class="name"><strong>${item.name}</strong></p>
      <p class="price">₪${item.price}</p>
    </div>
  </div>

  <div class="price">₪${item.price}</div>

  <div class="actions">
    <button class="add-cart">🛒 Add to Cart</button>
    <button class="remove">❌ Remove</button>
  </div>
`;


    // 🛒 הוספה לסל
    div.querySelector(".add-cart").onclick = async () => {
      const cartRef = doc(
        db,
        "users",
        user.uid,
        "cart",
        productId
      );

      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        await setDoc(cartRef, {
          ...cartSnap.data(),
          qty: cartSnap.data().qty + 1,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(cartRef, {
          productId,
          name: item.name,
          price: item.price,
          imageUrl: item.imageUrl,
          qty: 1,
          addedAt: serverTimestamp()
        });
      }

      alert("המוצר נוסף לסל 🛒");
    };

    // ❌ הסרה ממועדפים
    div.querySelector(".remove").onclick = async () => {
      if (!confirm("להסיר מהמועדפים?")) return;

      await deleteDoc(
        doc(db, "users", user.uid, "favorites", productId)
      );

      div.remove();
    };

    favDiv.appendChild(div);
  });
});
