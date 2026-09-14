// Firebase client config for this app.
//
// NOTE: These values are NOT secret. Firebase's client config is designed
// to be public — it identifies which Firebase project the app talks to,
// it does not grant access on its own. Actual data access is controlled by:
//   1. Firestore Security Rules (see /firestore.rules)
//   2. API key restrictions in Google Cloud Console (restrict this key to
//      your site's domain(s) under APIs & Services > Credentials)
// Keeping this in its own file just keeps script.js focused on app logic.
export const firebaseConfig = {
  apiKey: "AIzaSyA4I0aYiQ2XVfUnDj2K_avXUtQa2hUIuZY",
  authDomain: "habittracker-10264.firebaseapp.com",
  projectId: "habittracker-10264",
  storageBucket: "habittracker-10264.firebasestorage.app",
  messagingSenderId: "1076569237929",
  appId: "1:1076569237929:web:e6320b55672d187b873cb8",
  measurementId: "G-VZGMWXRBRD"
};
