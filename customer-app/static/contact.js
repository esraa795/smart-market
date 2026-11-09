// static/contact.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";


// ✅ אתחול בטוח – רק אם עוד לא קיים
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = (form.fullName?.value || "").trim(); // ✅ תוספת: שם (אם קיים בטופס)
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const reason = form.reason.value.trim(); // ✅ מגיע מה-select

    if (!phone || !email || !reason) return;

    try {
      const docRef = await addDoc(collection(db, "contact_requests"), {
        fullName, // ✅ תוספת: נשמר ב-Firestore
        phone,
        email,
        reason,
        createdAt: serverTimestamp(),
        status: "new"
      });

      console.log("✅ Saved contact:", docRef.id);
      alert("✅ Sent successfully! We'll get back to you soon.");
      form.reset();
    } catch (err) {
      console.error("❌ Firestore error:", err.code, err.message);
      alert("❌ Error sending – check Console");
    }
  });
});
