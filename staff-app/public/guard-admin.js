import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export function requireAdmin() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.href = "/worker-login.html";
      return;
    }
    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.exists() ? snap.data() : {};
    if (data.admin !== true) {
      alert("אין הרשאת מנהל");
      location.href = "/worker.html";
    }
  });
}
