import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const form = document.getElementById("workerLoginForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    const userRef = doc(db, "users", cred.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await signOut(auth);
      msg.textContent = "User profile not found in /users (missing document).";
      return;
    }

    const data = userSnap.data() || {};
    const role = (data.role || "").toString().toLowerCase();
    const isAdmin = data.admin === true;

    // ✅ רק worker/admin יכולים להיכנס למסך עובד
    if (role !== "worker" && role !== "admin") {
      await signOut(auth);
      msg.textContent = "Access denied: this account is not a worker/admin.";
      return;
    }

    // ✅ עובד רגיל נכנס ל-worker.html, מנהל ל-admin.html
    location.href = isAdmin ? "/admin.html" : "/worker.html";

  } catch (err) {
    console.error(err);
    msg.textContent = err?.message || "Login failed";
  }
});
