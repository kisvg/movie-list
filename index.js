//#region firebase config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, setDoc, deleteDoc, updateDoc, doc, 
  onSnapshot, 
  query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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

import * as service_list from './service_list.js'

// I mean it doesn't really matter but WHY are they not always in the same order Google
async function loadServiceList(){
  let docRef = doc(db, "cloud", "services");
  let docSnap = await getDoc(docRef);
  let unordered = docSnap.data()
  // not the best way, but it works. alternative (that I think does the same thing):
  /*
  const entries = Object.entries(obj);
  entries.sort((a, b) => b[1] - a[1]); // Sort true values first
  const sortedObj = Object.fromEntries(entries);
  */
  globalThis.serviceList = Object.keys(unordered)
  .sort((a, b) => unordered[b] - unordered[a])
  .reduce((acc, key) => {
    acc[key] = unordered[key];
    return acc;
  }, {})
  service_list.renderServiceList(serviceList)
}

loadServiceList()
document.getElementById("save-service-list").onclick = function(){saveServiceList(service_list.getServiceList())};

export function saveServiceList(serviceList){
  globalThis.serviceList = serviceList
  setDoc(doc(db,"cloud","services"),serviceList)
}

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
    //triggers for opening popup
    document.getElementById(id).onclick = function() {openPop(id)};
  });
}

// updating

// this runs if firestore updates or at the very beginning
const update = onSnapshot(unwatchedRef, (querySnapshot) => {
  populate(querySnapshot)
});

//#endregion

//#region adding movies

//if button clicked
document.getElementById('button-add-movie').onclick = function() {addMovie(document.getElementById("input-add-movie").value)};
//if enter clicked in text box
document.getElementById('input-add-movie').addEventListener("keyup", function(event) {
  if (event.key === "Enter") {
    addMovie(document.getElementById("input-add-movie").value)
  }
})

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

// Make GET request for general movie info
async function getOmdb(name) {
  try{
  const response = await fetch("https://www.omdbapi.com/?t="+name+"&plot=full&apikey="+randKey("omdb"))
  if (!response.ok) {
    throw new Error('Response was not ok');
  }
  const data = await response.json();
  // add relevant data from response to newMovie
  newMovie["timestamp"] = serverTimestamp(); //n (displayed?)
  newMovie["title"] = data.Title; //y
  newMovie["csrating"] = null; //y
  newMovie["imdbid"] = data.imdbID; //n
  newMovie["poster"] = data.Poster; //y
  newMovie["runtime"] = data.Runtime; //n
  newMovie["type"] = data.Type; //n
  newMovie["plot"] = data.Plot; //y
  newMovie["genres"] = data.Genre.split(", "); //y
  newMovie["year"] = data.Year; //y
  newMovie["releasedate"] = data.Released; //n
  newMovie["notes"] = "" //y
  // finds object w/ rt rating
  const rtobj = data.Ratings.find(r => r.Source === "Rotten Tomatoes");
  newMovie["rtrating"] = Number((rtobj ? rtobj.Value : null).replace("%","")); //y
  }
  catch (error) {
    console.error('Error:', error);
  }
};

// GET request only for streaming services given imdb id
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
  newMovie["services"] = services; //y
    }
    catch (error) {
      console.error('Error:', error);
    }
};

//#endregion

//#region filters

var doServiceFilter = true

/*
{
  name:,
  key:,
  operators:{

  },
  value_type:,
},
*/

const math_operators = {
  'is':"==",
  'is less than':"<",
  'is greater than':">",
}

const filters = [
  {
    name:"type",
    key:"type",
    operators:{
      '':"==",
    },
    value_type:{
      'movies':"movie",
      'shows': "series"},
  },
  {
    name: "CSM rating",
    key: "csrating",
    operators: math_operators,
    value_type:"input"
  },
  {
    name:"genre",
    key:"genres",
    operators:{
      '':"array-contains",
    },
    value_type:"input",
  },
  {
    name:"RT rating",
    key:"rtrating",
    operators:{
      'is over':">",
    },
    value_type:"input",
  },
]

async function q(criteria, order = ''){
  if (order){

  };
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

function generateChips(filters) {
  let html = ``;
  //let keys = [];
  filters.forEach((filter) => {
    let operatorsHtml = ``;

    // If operators shown, generate a dropdown
    if (Object.keys(filter.operators) == ['']) {
      operatorsHtml = ``;
    }
    else{
      // For blank operators
      if (Object.keys(filter.operators).length === 1){
        operatorsHtml = `<p class="chip-operator">${Object.keys(filter.operators)[0]}</p>`
      }
      else{
      operatorsHtml = `
        <select name="operator" class="chip-operator" id="chip-operator-${filter.key}">
          ${Object.entries(filter.operators)
            .map(([key, value]) => `<option value="${value}">${key}</option>`)
            .join("")}
        </select>`;
      }
    }
    let valueHtml = ``;
    if (filter.value_type === "input") {
      valueHtml = `<input class="chip-value" type="text" id="chip-value-${filter.key}">`;
    }
    else{
      valueHtml = `
      <select class="chip-value" id="chip-value-${filter.key}">
        ${Object.entries(filter.value_type)
          .map(([key, value]) => `<option value="${value}">${key}</option>`)
          .join("")}
      </select>`;
    } 
    html += `
      <div class="chip" id="chip-${filter.key}">
        <p class="chip-key">${filter.name}</p>
        <div class="chip-contents" id="chip-contents-${filter.key}" onclick="event.stopPropagation()">
          ${operatorsHtml}
          ${valueHtml}
        </div>
      </div>
    `;
    
    //keys.push(filter.key)
    
  });

  // Inject the compiled HTML into the chip-container div
  document.getElementById("chip-container").innerHTML = html;

  filters.forEach((filter)=>{
    let key = filter.key
    document.getElementById(`chip-${key}`).onclick = function(){toggleFilter(key)}
    if (filter.value_type === "input") {
      document.getElementById(`chip-value-${key}`).addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
            applyFilters()
        }
      })
      }
  })
}

function toggleFilter(key){
  //toggle selected
  document.getElementById(`chip-${key}`).classList.toggle('active');
  //toggle contents shown
  document.getElementById(`chip-contents-${key}`).classList.toggle('active');
}

generateChips(filters);

document.getElementById("chip-container").insertAdjacentHTML("afterend", `<button id="apply-filters">filter</button>`);
document.getElementById('apply-filters').onclick = function() {applyFilters()};

async function applyFilters(){
  var active_chips = []
  var queries = []
  Array.from(document.getElementsByClassName("active chip")).forEach(element=>{
    active_chips.push(element.id)
  })
  filters.forEach(filter=>{
    if (active_chips.includes(`chip-${filter.key}`)){
      let key = filter.key
      try{
        var operator = document.getElementById(`chip-operator-${key}`).value
      }
      catch(e){
        var operator = Object.values(filter.operators)[0]
      }
      if(isNaN(Number(document.getElementById(`chip-value-${key}`).value))){
        var value = document.getElementById(`chip-value-${key}`).value
      }
      else{
        var value = Number(document.getElementById(`chip-value-${key}`).value)
      }
      queries.push({key:key,operator:operator,value:value})
    }
  })

  if (doServiceFilter == true){
    let serviceList = globalThis.serviceList
    let serviceArray = Object.keys(serviceList).filter(key => serviceList[key])
    queries.push({key:'services',operator:'array-contains-any',value:serviceArray})
  }

  //console.log(queries)

  try {
    // Execute all queries concurrently
    const querySnapshots = await Promise.all(queries.map(q => getDocs(query(unwatchedRef, where(q.key,q.operator,q.value)))));
    //populate(querySnapshots[0])

    populate_multiple(querySnapshots)

  } catch (error) {
    console.error('Error applying filters:', error);
  }
}

//TODO: allow for zero filters
function populate_multiple(querySnapshots){
  // Delete previous inserted HTML
  document.getElementById("list").innerHTML = '';

  // Initialize an array to store all movies
  let allMovies = [];

  // Populate the allMovies array with the movies from each querySnapshot
  querySnapshots.forEach(querySnapshot => {
    const unwatched = [];
    querySnapshot.forEach((doc) => {
      unwatched.push({
        id: doc.id, 
        data: doc.data()
      });
    });
    allMovies.push(unwatched);
  });

  // Find the intersection of movies across all querySnapshots
  let commonMovies = allMovies.reduce((acc, current) => {
    return acc.filter(movie => current.some(item => item.id === movie.id));
  });

  // Display the common movies
  commonMovies.forEach(movie => {
    var data = movie.data;
    var id = movie.id;
    var markup = `
      <div class="movie" id="${id}">
        <img class="poster" src="${data.poster}">
        <h2 class="title">${data.title}</h2>
      </div>
    `;
    document.querySelector('.list').insertAdjacentHTML('beforeend', markup);
    // Triggers for opening popup
    document.getElementById(id).onclick = function() { openPop(id); };
  });
}

//#endregion

//#region popups

// Function to open the popup
async function openPop(movieId) {
  document.getElementById("popup").classList.add('active');
  document.getElementById("pop-bg").classList.add('active');
  //get data
  const docRef = doc(db, "unwatched", movieId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    var data = docSnap.data()
    //console.log("Document data:", data);
    //text displays
    document.getElementById("pop-title").innerHTML=data.title
    document.getElementById("pop-plot").innerHTML=data.plot
    document.getElementById("pop-year").innerHTML=data.year
    document.getElementById("pop-rtrating").innerHTML=data.rtrating
    //images
    document.getElementById("pop-poster").src=data.poster
    //inputs
    document.getElementById("pop-notes").value=data.notes
    document.getElementById("pop-csrating").value=data.csrating
    //console.log(data.services)
    if(data.services.length == 0){
      //if no services
      document.getElementById("pop-services").innerHTML=`<div class=no-service> No streaming services. </div>`
    }
    else{
      //if there are services
      document.getElementById("pop-services").innerHTML=`<div class=service>${data.services.join("</div><div class='service'>")}</div>`
    }
    document.getElementById("pop-genres").innerHTML=`<div class=genre>${data.genres.join("</div><div class='genre'>")}</div>`
  } 
  else {
    // docSnap.data() will be undefined in this case
    console.log("No such document!");
  }
  globalThis.currentId = movieId
  //console.log(currentId)

  //content loaded
  document.getElementById("pop-content").classList.add('active');
  document.body.classList.add('no-scroll');
}

//triggers for closing popup
document.getElementById('close-pop').onclick = function() {closePop()};
document.getElementById('pop-bg').onclick = function() {closePop()};

// there's a question as to whether we should make the triggers for closePop have an await, which would mean
// a waterfall of async functions

// Function to close the popup
async function closePop() {
  document.getElementById("popup").classList.remove('active');
  document.getElementById("pop-bg").classList.remove('active');
  document.getElementById("pop-content").classList.remove('active');
  //allow scrolling on body
  document.body.classList.remove('no-scroll');
  await saveChanges();
}

async function saveChanges(){
  if (document.getElementById("pop-csrating").value != ""){
    try{
    var csrating = Number(document.getElementById("pop-csrating").value)
    }
    catch(e){
      console.log("error: number not inputted")
    }
  }
  else{
    var csrating = null
  }
  var notes = document.getElementById("pop-notes").value
  //console.log(csrating, notes)
  var currentMovieRef = doc(db, "unwatched", currentId)
  await updateDoc(currentMovieRef, {
    csrating: csrating,
    notes: notes,
  })
  globalThis.currentId = null
}

//#endregion
