import { auth, db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
"https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const payBtn = document.getElementById("payBtn");

onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "/login";
    return;
  }

  payBtn.onclick = async () => {
    const cartRef = collection(db, "users", user.uid, "cart");
    const cartSnap = await getDocs(cartRef);

    if (cartSnap.empty) {
      alert("הסל ריק");
      return;
    }

    let items = [];
    let total = 0;

    cartSnap.forEach(docSnap => {
      const data = docSnap.data();
      items.push(data);
      total += data.price * data.qty;
    });

    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      items,
      total,
      status: "paid",
      createdAt: serverTimestamp()
    });

    for (const docSnap of cartSnap.docs) {
      await deleteDoc(doc(db, "users", user.uid, "cart", docSnap.id));
    }

    alert("✅ תשלום בוצע בהצלחה");
    location.href = "/my-orders";
  };
});
