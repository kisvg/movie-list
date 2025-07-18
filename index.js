//#region firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { 
  getFirestore, collection, getDocs, getDoc, addDoc, setDoc, deleteDoc, updateDoc, doc, deleteField,
  query, where, 
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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

// make sure html loaded
window.addEventListener('DOMContentLoaded', function(){
  addTriggers()
  loadServiceList()
  generateChips(filters);
  preferences()
  globalThis.reverseOrder = false
})

function addTriggers(){
  // grid / list ui
  document.getElementById("button-list").onclick = function(){
    document.getElementById("button-list").classList.add("active");
    document.getElementById("button-grid").classList.remove("active");

    document.getElementById("list").classList.add("list-view");
    document.getElementById("list").classList.remove("grid-view");
  }
  document.getElementById("button-grid").onclick = function(){
    document.getElementById("button-grid").classList.add("active");
    document.getElementById("button-list").classList.remove("active");

    document.getElementById("list").classList.remove("list-view");
    document.getElementById("list").classList.add("grid-view");
  }
  //services
  document.getElementById('edit-services').onclick = function(){
    service_list.renderServiceList(globalThis.serviceList)
  }
  document.getElementById("save-service-list").onclick = async function(){
    document.getElementById('popup-service').classList.remove('active')
    document.getElementById("pop-bg").classList.remove('active');
    try{
      await saveServiceList(service_list.getServiceList())
      displayNotification("Service list saved")
    }
    catch(e){
      displayNotification("Saving service list failed. Try again.")
    }
  }
  //add movie
  document.getElementById('button-add-movie').onclick = function() {
    if(document.getElementById("input-add-movie").value != ""){
      // if it isn't blank
      addMovieByName(document.getElementById("input-add-movie").value)
    }
  };
  const debouncedHandleSuggestions = debounce(handleSuggestions, 300);
  document.getElementById("input-add-movie").addEventListener('keyup', function(event){
    if (event.key === "Enter") {
      addMovieByName(document.getElementById("input-add-movie").value)
    }
    else{
      debouncedHandleSuggestions(event)
    }
  })
  document.getElementById('apply-filters').onclick = function() {applyFilters()};
  // order
  document.getElementById("order").addEventListener("change", function(event) {
    globalThis.reverseOrder = false
    document.getElementById("reverse-order").classList.remove("active")
    applyFilters()
  })
  document.getElementById("reverse-order").onclick = function(){
    globalThis.reverseOrder = !globalThis.reverseOrder
    document.getElementById("reverse-order").classList.toggle("active")
    applyFilters()
  }
  // movie popup
  document.getElementById("mark-watched").onclick = async function(){
    await moveData("unwatched",globalThis.currentId,"watched")
    displayNotification("Marked as watched")
  }
  document.getElementById("pop-update").onclick = function(){
    updateCurrentMovie()
  }
  // triggers for closing movie popup
  document.getElementById('pop-close').onclick = function() {closePop()};
  document.getElementById('pop-bg').onclick = function() {
    // close popup if it's the movie popup
    if (document.getElementById('popup-movie').classList.contains('active')){
      closePop()
    }
  }
}

async function loadServiceList(){
  let docRef = doc(db, "cloud", "services");
  let docSnap = await getDoc(docRef);
  let unordered = docSnap.data()
  // not the best way, but it works. alternative (that I think does the same thing):
  /*
  const entries = Object.entries(obj);
  entries.sort((a, b) => b[1] - a[1]); // sort true values first
  const sortedObj = Object.fromEntries(entries);
  */
  globalThis.serviceList = Object.keys(unordered)
  .sort((a, b) => unordered[b] - unordered[a])
  .reduce((acc, key) => {
    acc[key] = unordered[key];
    return acc;
  }, {})
  if (globalThis.doServiceFilter){
    applyFilters()
  }
}

function preferences(){
  // TODO(?): change default based on user preference
  if (window.innerWidth > 500){
    document.getElementById("list").classList.add("list-view");
    document.getElementById("button-list").classList.add("active");
  }
  else{
    document.getElementById("list").classList.add("grid-view");
    document.getElementById("button-grid").classList.add("active");
  }
}

function lowerArray(array){
  return array.map(item => item.toLowerCase())
}

/*
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, (time)*1000));
}
*/

export async function saveServiceList(serviceList){
  globalThis.serviceList = serviceList
  //apply filters now that services are updated
  applyFilters()
  await setDoc(doc(db,"cloud","services"),serviceList)
}

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
    // ('Item could not be added to MovieList')
  }
}

async function moveData(root, id, destination){
  const docRef = doc(db, root, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    try{
      await setDoc(doc(db, destination, id), docSnap.data())
      //sendData(destination,docSnap.data())
    }
    catch(e){
      console.log("error sending data: ", e)
    }
    await deleteDoc(doc(db, root, id));
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No such document");
  }
}

//#endregion

//#region lists

// get api keys here 
// https://omdbapi.com/apikey.aspx
// TODO: add tmdb link maybe

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

export function randKey(service) {
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

function debounce(func, delay) {
  let timer;
  return function(...args) {
    const context = this;
    if(timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      func.apply(context, args);
    }, delay);
  }
}

export async function get(url){
  let response = await fetch(url)
    if (!response.ok) {
      throw new Error('Response was not ok');
    }
    let data = await response.json();
    return data
}

globalThis.suggestions = []
globalThis.goodTypes = ["tv","movie"]

// make dropdown when search is typed in
async function handleSuggestions(event){
  let key = event.key
  // key shouldn't be enter unless I change it later
  if (!(key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter')){
    let name = event.target.value
    if (name == ""){
      document.getElementById("suggestion-container").classList.remove("active")
      return
    }
    try{
      let initialdata = await get("https://api.themoviedb.org/3/search/multi?query="+name+"&api_key="+randKey("tmdb"))
      let data = initialdata.results
      data = data.filter(item => globalThis.goodTypes.includes(item.media_type))
      globalThis.suggestions = data
      let markup = ``
      data.forEach((item, id) => {
        let imgSrc="./images/placeholder.png"
        if (item.poster_path && typeof item.poster_path === "string"){
          imgSrc = "https://image.tmdb.org/t/p/w300_and_h450_bestv2"+item.poster_path
        }

        let title
        if (item.media_type == "tv"){
          title = item.name
        }
        else{
          title = item.title
        }

        markup += `
          <div id="${id}" class = "suggestion">
            <img id="${id}" class= "poster" src="${imgSrc}">
            <p id="${id}">${title}</p>
          </div>
        `
      })
      if (markup == ""){
        markup = `<p>No results.</p>`
      }
      document.getElementById("suggestion-container").innerHTML = markup

      let elements = document.querySelectorAll(".suggestion")
      elements.forEach(element => {
        element.onclick = function(){
          let id = this.id
          let data = globalThis.suggestions[id]
          addMovie(data)
        }
      })

      // show it
      document.getElementById("suggestion-container").classList.add("active")
    }
    catch(e){
      console.error(e)
    }
  }
}

async function addMovieByName(name){
  try{
    let initialdata = await get("https://api.themoviedb.org/3/search/multi?query="+name+"&api_key="+randKey("tmdb"))
    let data
    let i = 0
    while(true){
      data = initialdata.results[i]
      let type = data.media_type
      // we don't want that infinite loop
      if ((globalThis.goodTypes.includes(type))){
        break
      }
      if (i > 20){
        return
      }
      // console.log("woah, that's a "+type)
      i+=1
    }
    await addMovie(data)
  }
  catch(e){
    console.error(e)
  }
}

async function addMovie(data) {
  globalThis.newMovie = {};
  await getInfo(data);
  if (newMovie.title){
    await sendData("unwatched",newMovie);
    if (newMovie.type == "tv"){
      displayNotification("Show added: "+newMovie.title)
    }
    else{
      displayNotification("Movie added: "+newMovie.title)
    }
    document.getElementById("input-add-movie").value = ""
    document.getElementById("suggestion-container").classList.remove("active")
  }
  // if fetching it fails
  else{
    displayNotification("Failed. Typo?",false)
  }
};

async function getInfo(data) {
  await getTmdb(data);
  await getOmdb(newMovie);
}

// from this I could also get genres (it contains genre ids) and release date
async function getTmdb(data) {
  // data = initialdata.results[i]
  try{
    let type = data.media_type
    let tmdbid = data.id

    newMovie["tmdbid"] = tmdbid //n (displayed?)
    newMovie["type"] = type //n
    newMovie["timestamp"] = serverTimestamp(); //n 
    newMovie["plot"] = data.overview //y
    newMovie["notes"] = "" //y

    if (data.poster_path && typeof data.poster_path === "string"){
      newMovie["poster"] = "https://image.tmdb.org/t/p/w300_and_h450_bestv2"+data.poster_path //y
    }
    else{
      newMovie["poster"] = "./images/placeholder.png"
    }
    // get imdb id
    let initialdata = await get ("https://api.themoviedb.org/3/"+type+"/"+tmdbid+"/external_ids?api_key="+randKey("tmdb"))
    newMovie["imdbid"] = initialdata.imdb_id //n
    // get streaming services
    if (type == "tv"){
      newMovie["title"] = data.name //y
    }
    else{
      newMovie["title"] = data.title //y
    }
    let services = await getServiceArray({
      tmdbid: tmdbid,
      type: type
    })
    let services_lower = lowerArray(services)

    newMovie["services"] = services; //y
    newMovie["services_lower"] = services_lower //n
  }
  catch (e) {
    console.error(e);
  }
};

async function getServiceArray(info){
  let initialdata = await get("https://api.themoviedb.org/3/"+info.type+"/"+info.tmdbid+"/watch/providers?api_key="+randKey("tmdb"))
  let data = initialdata.results.US?.flatrate;
  var services = [];
  //if there are any flatrates
  if(data){
    data.forEach(item => {
      services.push(item.provider_name)
    });
  }
  return services
}

// get more general movie info
async function getOmdb(newMovie) {
  try{
    // remove "&plot=full" to get a more concise plot
    const response = await fetch("https://www.omdbapi.com/?i="+newMovie.imdbid+"&plot=full&apikey="+randKey("omdb"))
    if (!response.ok) {
      throw new Error('Response was not ok');
    }
    const data = await response.json();
    // add relevant data from response to newMovie
    newMovie["runtime"] = data.Runtime; //n
    newMovie["year"] = data.Year; //y
    newMovie["releasedate"] = data.Released; //n
    //rated
    let rated = data.Rated
    if (rated == "Unrated" || rated == "Not Rated"){
      rated = "N/A"
    }
    newMovie["rated"] = rated //y
    // genres
    let genres = []
    if (data.Genre){
      genres = data.Genre.split(", ")
    }
    let genres_lower = lowerArray(genres)
    newMovie["genres"] = genres; //y
    newMovie["genres_lower"] = genres_lower //n

    // finds object w/ rt rating
    try{
      let rtobj = null
      if (Array.isArray(data.Ratings)) {
        rtobj = data.Ratings.find(r => r.Source === "Rotten Tomatoes");
      }
      if (rtobj && rtobj.Value) {
        newMovie["rtrating"] = Number(rtobj.Value.replace("%",""));
      } 
      else {
        newMovie["rtrating"] = null;
      }
    } catch(e){
      console.error(e);
    }
  } catch (e) {
    console.error(e);
  }
};

//#endregion

//#region filters

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
      'movies': "movie",
      'shows': "tv"},
  },
  {
    name: "rated",
    key: "rated",
    operators:{
      '':"==",
    },
    value_type:{
      //TODO: make this a checklist
      'Approved': "Approved",
      'G': "G",
      'PG': "PG",
      'PG-13': "PG-13",
      'R': "R",

      'TV-G': "TV-G",
      'TV-PG': "TV-PG",
      'TV-14': "TV-14",
      'TV-MA': "TV-MA",
    },
  },
  {
    name:"genre",
    key:"genres_lower",
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

var table_columns = {
  // this is always force displayed
  // title:{header:"Title", display:true},
  // timestamp shows up funny because firebase
  timestamp:{header:"Time Added", display:false},
  rtrating:{header:"Rotten Tomatoes", display:true},
  rated:{header:"Rated", display:true},
  runtime:{header:"Length", display:true},
  // either "movie" or "tv"
  type:{header:"Type", display:false},
  year:{header:"Year Released", display:false},
  releasedate:{header:"Release Date", display:false},
  notes:{header:"Notes", display:false},
  
}

function movieElement(movie) {
  let data = movie.data;
  let id = movie.id;

  let poster = "./images/placeholder.png"
  if (data.poster){
    poster = data.poster
  }

let ghost = {"rtrating": "", "rated": ""}

  let gray = {}
  let markup = ``
  Object.keys(data).forEach(key => {
    let value = data[key]
    gray[key] = ""
    if(value==null || value=="N/A"){
      gray[key] = "grayscale "
      data[key] = "N/A"
      // weird hack perhaps
      if (Object.keys(ghost).includes(key)){
        ghost[key] = "ghost"
      }
    }
    else{
      if(key == "rtrating"){
        data[key]+="%"
      }
    }
  })

  // only show specific columns
  Object.keys(table_columns).forEach(key => {
    if(table_columns[key].display){
      let value = data[key]
      if (gray[key]){
        key+=" ghost"
      }
      markup+=`<p class="${key}">${value}</p>`
    }
  })

  return `
    <div class="movie" id="${id}">
      <div class="grid">
        <img class="poster" src="${poster}">
        <h2 class="title">${data.title}</h2>
        <div class="info-flex">
          <div class = "rtrating-flex">
            <img class="${gray.rtrating}rtrating-logo" src="./images/rtrating.svg">
            <p class="${ghost.rtrating}">${data.rtrating}</p>
          </div>
          <div class = "rated-flex">
            <img class="${gray.rated}rated-logo" src="./images/rated.svg">
            <p class="${ghost.rated}">${data.rated}</p>
          </div>
        </div>
      </div>

      <div class="row">
        <h2>${data.title}</h2>
        ${markup}
      </div>
    </div>
    `
}

function clearList(){
  //only leave column headers
  let markup = `
  <div class="headers row">
    <p class="header">Title</p>
  `
  Object.keys(table_columns).forEach(key =>{
    if(table_columns[key]["display"]){
      markup += `<p class="header">${table_columns[key]["header"]}</p>`
    }
  })
  markup+=`
    </div>
  `
  document.getElementById("list").innerHTML = markup;
}

//unused
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
  
  // add services filter
  html+=`
    <div class="chip" id="chip-services">
    <p class="chip-key">free to me</p>
    <div class="chip-contents" id="chip-contents-services">
    </div>
  </div>
  `

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
      // dropdown
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

  // make services filter toggleable
  document.getElementById(`chip-services`).onclick = function(){
    toggleFilter('services');
  }

  // make service filter toggled initially (by default)
  globalThis.doServiceFilter = true
  document.getElementById(`chip-services`).classList.toggle('active')
  
  // listen for change in dropdowns
  document.getElementById("chip-value-type").addEventListener("change", function(event) {
    applyFilters()
  })
  document.getElementById("chip-value-rated").addEventListener("change", function(event) {
    applyFilters()
  })

  //TODO: make it so clicking on "is over" in rtrating deactivates the chip
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

  // for chips without an input
  if(key == 'services'){
    globalThis.doServiceFilter = !doServiceFilter
    applyFilters();
  }
  // if it was just deactivated (no longer active)
  else if(!(document.getElementById(`chip-${key}`).classList.contains('active'))){
    applyFilters();
  }
}

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
        // if it is a string

        // TODO: make this a checklist instead to avoid this jank
        if (key == "rated"){
          var value = document.getElementById(`chip-value-${key}`).value
        }
        else{
          var value = document.getElementById(`chip-value-${key}`).value.toLowerCase()
          // makes all inputs received as lowercase
        }
      }
      else{
        // if it is a number
        var value = Number(document.getElementById(`chip-value-${key}`).value)
      }
      queries.push({key:key,operator:operator,value:value})
    }
  })

  if (globalThis.doServiceFilter && globalThis.serviceList){
    let serviceList = globalThis.serviceList
    let serviceArray = lowerArray(Object.keys(serviceList).filter(key => serviceList[key]))
    queries.push({key:'services_lower',operator:'array-contains-any',value:serviceArray})
  }

  if (queries.length != 0){
    // if there are any filters
    try {
      // Execute all queries concurrently
      const querySnapshots = await Promise.all(queries.map(q => getDocs(query(unwatchedRef, where(q.key,q.operator,q.value)))));

      populate_multiple(querySnapshots)

    } catch (e) {
      console.error('Error applying filters:', e);
    }
  }
  else{
    //if there are no filters
    let querySnapshot = await getDocs(unwatchedRef)
    populate(querySnapshot)
  }
}

function populate_multiple(querySnapshots){
  // Delete previous inserted HTML
  clearList();

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
  orderDisplay(commonMovies)
}

function populate(querySnapshot){
  //delete previous inserted html
  clearList();
  let unwatched = [];
  querySnapshot.forEach((doc) => {
    unwatched.push({
      id: doc.id, 
      data: doc.data()
    })
  })
  orderDisplay(unwatched)
}

// orders and displays movies
function orderDisplay(unwatched){
  unwatched = unwatched.sort((a, b) => {return orderMovies(a,b)})
  clearList()
  // display common movies
  unwatched.forEach(movie => {
    var markup = movieElement(movie)
    document.querySelector('.list').insertAdjacentHTML('beforeend', markup)
    //triggers for opening popup
    let id = movie.id
    document.getElementById(id).onclick = function() {openPop(id)};
  })
}

function orderMovies(a,b){
  let order = document.getElementById("order").value
  let reverseOrder = globalThis.reverseOrder
  let autoSwapList = ["timestamp","rtrating","year"]
  if (autoSwapList.includes(order)){
    reverseOrder = !reverseOrder
  }
  a = a.data[order]
  b = b.data[order]
  if (order == "timestamp"){
    a = Number(a.seconds)
    b = Number(b.seconds)
  }
  // null / undefined values go to end
  if (a == null) return 1
  if (b == null) return -1

  //hack
  if (reverseOrder){
    [a,b] = [b,a]
  }

  // if numbers, sort numerically
  if (typeof a === "number" && typeof b === "number") {
    return a - b
  }
  // otherwise, sort as strings
  return String(a).localeCompare(String(b))
}

// this runs if firestore updates or at the very beginning
const update = onSnapshot(unwatchedRef, (querySnapshot) => {
  //populate(querySnapshot)
  if (globalThis.serviceList) {
    applyFilters()
  }
});

//#endregion

//#region popups

// Function to open the movie popup
async function openPop(movieId) {
  document.getElementById("popup-movie").classList.add('active');
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
    document.getElementById("pop-rated").innerHTML=data.rated
    let rtrating = data.rtrating
    if (rtrating==undefined){
      rtrating = "N/A"
      document.getElementById("pop-rtrating").classList.add("ghost")
    }
    else{
      rtrating +="%"
      document.getElementById("pop-rtrating").classList.remove("ghost")
    }
    document.getElementById("pop-rtrating").innerHTML=rtrating
    //images
    let poster = "./images/placeholder.png"
    if (data.poster){
      poster = data.poster
    }
    document.getElementById("pop-poster").src=poster
    //input(s)
    document.getElementById("pop-notes").value=data.notes
    //console.log(data.services)
    try{
      if(data.services.length == 0){
        //if no services
        document.getElementById("pop-services").innerHTML=`<div class="no-service faded"> Not streaming. </div>`
      }
      else{
        //if there are services
        document.getElementById("pop-services").innerHTML=`<div class="service">${data.services.join("</div><div class='service'>")}</div>`
      }
    }
    catch(e){
      // because that might not work for some reason
      document.getElementById("pop-services").innerHTML=`<div class="no-service faded"> Not streaming. </div>`
    }
    document.getElementById("pop-genres").innerHTML=`<div class="genre">${data.genres.join("</div><div class='genre'>")}</div>`
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

// Function to close the popup
async function closePop() {
  //TODO: make this not disappear and throw errors for other popups
  try{
    saveChanges();
    document.getElementById("popup-movie").classList.remove('active');
    document.getElementById("pop-content").classList.remove('active');
    document.getElementById("pop-bg").classList.remove('active');
    //allow scrolling on body
    document.body.classList.remove('no-scroll');
  }
  catch(e){
    // it's fine
  }
}

async function saveChanges(){
  var notes = document.getElementById("pop-notes").value
  var currentMovieRef = doc(db, "unwatched", currentId)
  await updateDoc(currentMovieRef, {
    notes: notes,
  })
  globalThis.currentId = null
}

//#endregion

//#region notifs

const notification = document.getElementById("notification")

export function displayNotification(message, isGood = true, time = 5){
  time*=1000
  if (isGood){
   notification.style.backgroundColor = 'lightgreen'
   document.getElementById("notification-bad").style.display = 'none'
   document.getElementById("notification-good").style.display = 'block'
  }
  else{
    notification.style.backgroundColor = 'pink'
    document.getElementById("notification-good").style.display = 'none'
    document.getElementById("notification-bad").style.display = 'block'
  }

  document.getElementById("message").innerHTML = message
  if (!notification.classList.contains("active")){
    notification.classList.add("active")
    setTimeout(function() {
      notification.classList.remove("active")
    }, time);
  }
}

//#endregion

//#region updating

async function updateList(){
  try{
    let querySnapshot = await getDocs(unwatchedRef)
    for (let doc of querySnapshot.docs) {
      let ref = doc(db,"unwatched", doc.id)
      let data = doc.data()
      let services = await getServiceArray({
        type: data.type,
        tmdbid: data.tmdbid
      })
      await updateDoc(ref,{
        services: services,
        services_lower: lowerArray(services)
      })
    }
  }
  catch(e){
    console.error(e)
  }
}

async function updateCurrentMovie(){
  try{
    let currentMovieRef = doc(db, "unwatched", currentId)
    let docSnap = await getDoc(currentMovieRef)
    let data = docSnap.data()
    let services = await getServiceArray({
      type: data.type,
      tmdbid: data.tmdbid
    })
    await updateDoc(currentMovieRef,{
      services: services,
      services_lower: lowerArray(services)
    })
  }
  catch(e){
    console.error(e)
  }
}

//#endregion

//#region dev

/*
async function devUpdateList(){
  try{
    let querySnapshot = await getDocs(unwatchedRef)
    for (let docSnap of querySnapshot.docs) {
      try{
      let ref = doc(db,"unwatched", docSnap.id)
      let data = docSnap.data()
      if (data.rated== "Unrated" || data.rated == "Not Rated")
      await updateDoc(ref,{
        rated: "N/A"
      })
    }
    catch(e){
      console.error(e)
    }
    }
  }
  catch(e){
    console.error(e)
  }
}

devUpdateList()
*/

/*
async function addMM(movies){
  for (const movie of movies) {
    await addMovieByName(movie)}
}

let movies =[]

addMM(movies)
*/

// if (!globalThis.a){


//#endregion