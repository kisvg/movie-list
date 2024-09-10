//firebase config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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


//lists

const omdbKeys = [
  "f58b2e26",
  "98d95a3b",
  "c3abbed7",
  "94c1da71",
  "53538fbb"
];

const tmdbKeys = [
  "74f95ee5445e918f8a2fba06cbcbdcc7",
  "9ab9646452e3c0b56a4b2eb6817037e8",
  "4f9b23de6f9cfe24882cd8fa423b1448",
  "694837b1069fb93750e9d2393a64b682",
  "aa451b89b21b649c47ad55247e48f25e"
];

const wmKeys = [
  "R8V8CpBbYCv8zXXGfSU1VUDa812Y4KTF2rvFnjS1",
  "yXhTyBaLxNQSs73zqKW0WeEoVcbX3HWpIqgV9fkz",
  "5izGd0jD0X4lS2XAL2tu6p2J6BcEe8GhYkMljbsU",
  "l9nHohIhu6uFmTBZKVvZNOGsbygHnEHyXKYmT1HB",
  "VkogIv5ZnH48fVE08y56KzWDvge9gz7JakyJdJjG"
];



//functions

function randKey(service) {
  if (service == "omdb") {
    var keyList = omdbKeys
  }
  if (service == "tmdb") {
    var keyList = tmdbKeys
  }
  if (service == "wm") {
    var keyList = wmKeys
  }
  return (keyList[Math.floor(Math.random()*(keyList.length))])
};

var newMovie = {};

async function addMovie(name) {
  //globalThis.newMovie = {};
  getOmdb(name)
};

// Make a GET request
async function getOmdb(name) {
  fetch("https://www.omdbapi.com/?t="+name+"&plot=full&apikey="+randKey("omdb"))
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      //do stuff w/ data
      newMovie["name"] = name;
      newMovie["csrating"] = null;
      newMovie["imdbid"] = data.imdbID;
      newMovie["poster"] = data.Poster;
      newMovie["runtime"] = data.Runtime;
      newMovie["type"] = data.Type;
      newMovie["plot"] = data.Plot;
      newMovie["genre"] = data.Genre;
      // finds object w/ rt rating
      const rtobj = data.Ratings.find(r => r.Source === "Rotten Tomatoes");
      newMovie["rtrating"] = rtobj ? rtobj.Value : null;
      document.getElementById("text2").innerHTML = (newMovie.imdbid);
      document.getElementById("poster").src = (newMovie.poster);
      //next fxn
      getTmdb(data.imdbID);
    })
    .catch(error => {
      console.error('Error:', error);
    });
};

async function getTmdb(imdbid) {
  fetch("https://api.themoviedb.org/3/movie/"+imdbid+"/watch/providers?api_key="+randKey("tmdb"))
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(initialdata => {
      const data = initialdata.results.US.flatrate
      //do stuff w/ data
      var services = [];
      data.forEach(item => {
        services.push(item.provider_name)
      });
      newMovie["services"] = services;
      //next fxn
      sendData("unwatched",newMovie);
    })
    .catch(error => {
      console.error('Error:', error);
    });
};

async function sendData(root,obj) {
  try {
    const docRef = await addDoc(collection(db, root), obj);
    console.log("Document written with ID: ", docRef.id
      , "\nDocument contents:"
    );
    console.log(obj)
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}


//code

// add movie
//await addMovie("her");


// set movie

/*
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
*/

// get

/*
const dataSnapshot = await getDocs(collection(db, "unwatched"));
dataSnapshot.forEach((doc) => {
  console.log(` imdbid: ${doc.id} \n name: ${doc.data().name}`);
  document.getElementById("text").innerHTML =(` imdbid: ${doc.id}, name: ${doc.data().name}`)
});
*/