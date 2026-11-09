import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =====================
   HELPERS
===================== */
function getInput(id) {
  return document.getElementById(id);
}

/* =====================
   SIGNUP
===================== */
window.signup = async () => {
  try {
    const firstName = getInput("firstName").value.trim();
    const lastName  = getInput("lastName").value.trim();
    const phone     = getInput("phone").value.trim();
    const address   = getInput("address").value.trim();
    const email     = getInput("email").value.trim();
    const password  = getInput("password").value;

    if (!firstName || !lastName || !email || !password) {
      alert("First name, last name, email and password are required");
      return;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      firstName,
      lastName,
      email,
      phone: phone || "",
      address: address || "",
      role: "customer",
      createdAt: serverTimestamp()
    });

    location.href = "/login";

  } catch (err) {
    alert(err.message);
  }
};

/* =====================
   LOGIN
===================== */
window.login = async () => {
  try {
    const email = getInput("email").value.trim();
    const password = getInput("password").value;

    if (!email || !password) {
      alert("Email and password required");
      return;
    }

    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));

    if (!snap.exists()) {
      alert("User profile not found");
      return;
    }

    const role = snap.data().role;
    location.href = role === "worker" ? "/worker" : "/customer";

  } catch (err) {
    alert(err.message);
  }
};

/* =====================
   FORGOT PASSWORD
===================== */
window.forgotPassword = async () => {
  try {
    const email = getInput("email").value.trim();

    if (!email) {
      alert("Enter your email first");
      return;
    }

    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent");

  } catch (err) {
    alert(err.message);
  }
};

/* =====================
   AUTH GUARD
===================== */
onAuthStateChanged(auth, user => {
  const publicPages = [
    "/",
    "/login",
    "/signup",
    "/worker-login"
  ];

  if (!user && !publicPages.includes(location.pathname)) {
    location.href = "/login";
  }
});
