// js/firebase-init.js
const firebaseConfig = {
    apiKey: "AIzaSyAeD0nSxWPOJaptIoxsnyHO_cq-oXW-nUg",
    authDomain: "chabadkiddushsponsor.firebaseapp.com",
    projectId: "chabadkiddushsponsor",
    storageBucket: "chabadkiddushsponsor.firebasestorage.app",
    messagingSenderId: "1061586315092",
    appId: "1:1061586315092:web:4d804725adb81a9dcfcac1",
    measurementId: "G-NLPQKVWDFZ"
};
firebase.initializeApp(firebaseConfig);

// Make auth and db globally available
// For a more structured approach in larger projects, consider ES6 modules.
var auth = firebase.auth();
var db = firebase.firestore();
