// Shared Firebase + access control for all Thanvis pages.
// KEEP ALLOWED_EMAILS in sync with your Firestore rules email list.

window.THANVIS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7tJQdNGy7zijKh8D4d6N_bplC7ahw9VE",
  authDomain: "thanvi-arts.firebaseapp.com",
  projectId: "thanvi-arts",
  storageBucket: "thanvi-arts.firebasestorage.app",
  messagingSenderId: "195111953238",
  appId: "1:195111953238:web:3f5b32835f9c7c95b82cf7",
  measurementId: "G-PF1FXP11Q2"
};

// Same emails as in Firestore rules (lowercase).
window.THANVIS_ALLOWED_EMAILS = [
  "nandatadi12344@gmail.com",
  "sathvis4@gmail.com"
];
