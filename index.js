import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAj4WhOtO_5fuUK7xqEU8ZOAlYrVTOx8uA",
  authDomain: "movie-list-9f569.firebaseapp.com",
  projectId: "movie-list-9f569",
  storageBucket: "movie-list-9f569.appspot.com",
  messagingSenderId: "589814390646",
  appId: "1:589814390646:web:2e4577feb327a0e11a6457",
  measurementId: "G-HSCPQX2LLT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

//code
try {
    const docRef = await setDoc(doc(db, "unwatched","movieid"), {
      name: "Dune",
      csrating: "17",
      rtrating: "86%"
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  };

const querySnapshot = await getDocs(collection(db, "unwatched"));
querySnapshot.forEach((doc) => {
  console.log(` imdbid: ${doc.id} \n name: ${doc.data().name}`);
  document.getElementById("text").innerHTML =(` imdbid: ${doc.id}, name: ${doc.data().name}`)
});
