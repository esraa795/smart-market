import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const badge = document.getElementById("notifBadge");

onAuthStateChanged(auth, (user) => {
  if (!badge) return;

  if (!user) {
    badge.style.display = "none";
    return;
  }

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", user.uid),
    where("read", "==", false)
  );

  onSnapshot(q, (snap) => {
    badge.style.display = snap.empty ? "none" : "block";
  });
});
