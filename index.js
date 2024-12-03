//#region firebase config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, setDoc, deleteDoc, doc, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAj4WhOtO_5fuUK7xqEU8ZOAlYrVTOx8uA",
  authDomain: "movie-list-9f569.firebaseapp.com",
  projectId: "movie-list-9f569",
  storageBucket: "movie-list-9f569.appspot.com",
  messagingSenderId: "589814390646",
  appId: "1:589814390646:web:2e4577feb327a0e11a6457",
  measurementId: "G-HSCPQX2LLT"
};

// initialize firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

//#endregion

// refs
const unwatchedRef = collection(db, "unwatched")
const watchedRef = collection(db, "watched")

//#region lists

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

//#endregion

//#region adding movies

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

//var newMovie = {};

async function addMovie(name) {
  globalThis.newMovie = {};
  await getInfo(name);
  await sendData("unwatched",newMovie);
};

async function getInfo(name) {
  await getOmdb(name);
  await getTmdb(newMovie.imdbid);
  console.log(newMovie);
}

// Make GET request
async function getOmdb(name) {
  try{
  const response = await fetch("https://www.omdbapi.com/?t="+name+"&plot=full&apikey="+randKey("omdb"))
  if (!response.ok) {
    throw new Error('Response was not ok');
  }
  const data = await response.json();
  // add important data to newMovie
  newMovie["title"] = data.Title;;
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
  }
  catch (error) {
    console.error('Error:', error);
  }
};

async function getTmdb(imdbid) {
  try{
  const response = await fetch("https://api.themoviedb.org/3/movie/"+imdbid+"/watch/providers?api_key="+randKey("tmdb"))
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const initialdata = await response.json();
  const data = initialdata.results.US?.flatrate;
  var services = [];
  //if there are any flatrates
  if(data){
  data.forEach(item => {
    services.push(item.provider_name)
  });
  }
  newMovie["services"] = services;
    }
    catch (error) {
      console.error('Error:', error);
    }
};

//#endregion

//#region managing data

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

async function moveData(root, name, destination){
  const docRef = doc(db, root, name);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    try{
      await setDoc(doc(db, destination, name), docSnap.data())
      //sendData(destination,docSnap.data())
    }
    catch(e){
      console.log("error sending data")
    }
    await deleteDoc(doc(db, root, name));
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document");
  }
}

function populate(querySnapshot){
  //delete previous inserted html
  document.getElementById("list").innerHTML = '';
  const unwatched = [];
  querySnapshot.forEach((doc) => {
    unwatched.push({
      id: doc.id, 
      data: doc.data()
    })
  });
  unwatched.forEach(movie => {
    var data = movie.data;
    var id = movie.id;
    var markup = `
      <div class="movie" id="${id}">
        <img class="poster" src="${data.poster}">
        <h2 class="title">${data.title}</h2>
      </div>
    `
    document.querySelector('.list').insertAdjacentHTML('beforeend', markup)
    document.getElementById(id).onclick = function() {openPop(id)};
  });
}

// updating
const update = onSnapshot(unwatchedRef, (querySnapshot) => {
  populate(querySnapshot)
});

//#endregion

//#region queries

async function q(criteria){
  const q = query(unwatchedRef, where(criteria.key,criteria.operator,criteria.value));
  const querySnapshot = await getDocs(q);
  populate(querySnapshot)
  /*
  console.log(querySnapshot)
  querySnapshot.forEach((doc) => {
  console.log(doc.data());
  });
  */
}

//#endregion

//#region popups

document.getElementById('close-pop').onclick = function() {closePop()};

/*
function clearPop(){
  document.getElementById("pop-title").innerHTML=null
  document.getElementById("pop-plot").innerHTML=null
  document.getElementById("pop-poster").src=""
}
*/

// Function to open the popup
async function openPop(movieId) {
  document.getElementById("loading").classList.add('active');
  //get data
  const docRef = doc(db, "unwatched", movieId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    var data = docSnap.data()
    console.log("Document data:", data);
    document.getElementById("pop-title").innerHTML=data.title
    document.getElementById("pop-plot").innerHTML=data.plot
    document.getElementById("pop-poster").src=data.poster
    console.log(data.services)
    //if no services
    if(data.services.length == 0){
      document.getElementById("pop-services").innerHTML=`<div class=no-service> No streaming services. </div>`
    }
    else{
    document.getElementById("pop-services").innerHTML=`<div class=service>${data.services.join("</div><div class='service'>")}</div>`
    }
    document.getElementById("pop-genres").innerHTML=`<div class=genre>${data.genre.split(", ").join("</div><div class='genre'>")}</div>`
    
    /*var markup = `
      <p class="service">${data.genre.split(",").join("<div></div>")}</p>
    `
    document.querySelector('.services').insertAdjacentHTML('beforeend', markup)*/

  } 
  else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
  }
  //globalThis.currentId = movieId
  //console.log(currentId)
  document.getElementById("loading").classList.remove('active');
  document.getElementById("popup").classList.add('active');
  document.body.classList.add('no-scroll');
}

// Function to close the popup
function closePop() {
  document.getElementById("popup").classList.remove('active');
  document.body.classList.remove('no-scroll');
  //clearPop()
  //globalThis.currentId = null
}

// Close popup when clicking outside the content
window.onclick = function(event) {
  if (event.target.id === "pop-bg") {
    closePop()
  };
}

//#endregion

document.getElementById('button-add-movie').onclick = function() {addMovie(document.getElementById("input-add-movie").value)};

var criteria = {
  operator: 'array-contains',
  key: 'services',
  value: 'Disney Plus'
}

//q(criteria)