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

document.getElementById('edit-services').onclick = function(){
  document.getElementById('service-list-container').classList.toggle('active')
}

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

  //apply filters now that services are updated
  applyFilters()
}

function lowerArray(array){
  return array.map(item => item.toLowerCase())
}

//#region ui

// TODO: change based on user preference
document.getElementById("list").classList.add("list-view");
document.getElementById("button-list").classList.add("active");

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


//#endregion

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
    // ('Item could not be added to MovieList')
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
  await getTmdb(name);
  await getOmdb(newMovie);
}

async function get(url){
  let response = await fetch(url)
    if (!response.ok) {
      throw new Error('Response was not ok');
    }
    let data = await response.json();
    return data
}

// GET request
async function getTmdb(name) {
  try{
    let initialdata = await get("https://api.themoviedb.org/3/search/multi?query="+name+"&apikey="+randKey("tmdb"))
    let data = initialdata.results[0]
    let tmdbid = data.id
    newMovie["tmdbid"] = tmdbid //n (displayed?)
    newMovie["timestamp"] = serverTimestamp(); //n 
    newMovie["title"] = data.name //y
    newMovie["poster"] = "https://image.tmdb.org/t/p/w600_and_h900_bestv2"+data.poster_path //y
    newMovie["type"] = data.media_type //n
    newMovie["plot"] = data.overview //y
    newMovie["csrating"] = null; //y
    newMovie["notes"] = "" //y
    initialdata = await get ("https://api.themoviedb.org/3/movie/"+tmdbid+"/external_ids")
    newMovie["imdbid"] = initialdata.imdb_id //n
    // now for the streaming services
    let url
    if (newMovie.type == "tv"){
      url = "https://api.themoviedb.org/3/tv/"+tmdbid+"/watch/providers?api_key="+randKey("tmdb")
    }
    else{
      url = "https://api.themoviedb.org/3/movie/"+tmdbid+"/watch/providers?api_key="+randKey("tmdb")
    }
    initialdata = await get(url)
    data = initialdata.results.US?.flatrate;
    var services = [];
    //if there are any flatrates
    if(data){
      data.forEach(item => {
        services.push(item.provider_name)
      });
    }
    let services_lower = lowerArray(services)
    newMovie["services"] = services; //y
    newMovie["services_lower"] = services_lower //n
  }
  catch (error) {
    console.error('Error:', error);
  }
};

// Make GET request for more general movie info
async function getOmdb(newMovie) {
  try{
    const response = await fetch("https://www.omdbapi.com/?i="+newMovie.imdbid+"&plot=full&apikey="+randKey("omdb"))
    if (!response.ok) {
      throw new Error('Response was not ok');
    }
    const data = await response.json();
    // add relevant data from response to newMovie
    newMovie["runtime"] = data.Runtime; //n
    newMovie["year"] = data.Year; //y
    newMovie["releasedate"] = data.Released; //n
    // genres
    let genres = data.Genre.split(", ")
    let genres_lower = lowerArray(genres)
    newMovie["genres"] = genres; //y
    newMovie["genres_lower"] = genres_lower //n

    // finds object w/ rt rating
    try{
      const rtobj = data.Ratings.find(r => r.Source === "Rotten Tomatoes");
      newMovie["rtrating"] = Number((rtobj ? rtobj.Value : null).replace("%","")); //y
    }
    catch(error){
      console.error('Error:', error);
    }
  }
  catch (error) {
    console.error('Error:', error);
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
      'movies':"movie",
      'shows': "tv"},
  },
  {
    name: "CSM rating",
    key: "csrating",
    operators: math_operators,
    value_type:"input"
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

var table_columns={
  // this is always force displayed
  // title:{header:"Title", display:true},
  // timestamp shows up funny because firebase
  timestamp:{header:"Time Added", display:false},
  csrating:{header:"CommonSense Rating", display:true},
  runtime:{header:"Length", display:true},
  // either "movie" or "tv"
  type:{header:"Type", display:false},
  year:{header:"Year Released", display:true},
  releasedate:{header:"Release Date", display:false},
  notes:{header:"Notes", display:false},
  rtrating:{header:"RottenTomatoes Rating", display:true},
}

function movieElement(movie) {
  let data = movie.data;
  let id = movie.id;
  let markup = `
    <div class="movie row" id="${id}">
      <img class="poster" src="${data.poster}">
      <h2 class="title cell">${data.title}</h2>
      <!--details-->
    `
  Object.keys(table_columns).forEach(key =>{
    let value = data[key]
    if(table_columns[key]["display"]){
      if(value==null){
        value = "N/A"
        key+=" ghost"
      }
      else{
        if(key=="rtrating"){
          value += "%"
        }
      }
      markup += `<p class="${key} cell">${value}</p>`
    }
  })
  markup+=`
    </div>
  `
  return markup
  
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

// updating

// this runs if firestore updates or at the very beginning
const update = onSnapshot(unwatchedRef, (querySnapshot) => {
  //populate(querySnapshot)
  applyFilters()
});

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

  // add services filter
  html+=`
    <div class="chip" id="chip-services">
    <p class="chip-key">free to me</p>
    <div class="chip-contents" id="chip-contents-services">
    </div>
  </div>
  `

  // Inject the compiled HTML into the chip-container div
  document.getElementById("chip-container").innerHTML = html;

  // make services filter toggleable
  document.getElementById(`chip-services`).onclick = function(){
    toggleFilter('services');
  }

  //make service filter toggled initially (by default)
  globalThis.doServiceFilter = true
  document.getElementById(`chip-services`).classList.toggle('active')
  

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
  if(key == 'services'){
    globalThis.doServiceFilter = !doServiceFilter
    applyFilters();
  }
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
        // if it is a string
        var value = document.getElementById(`chip-value-${key}`).value.toLowerCase()
        // makes all inputs received as lowercase
      }
      else{
        // if it is a number
        var value = Number(document.getElementById(`chip-value-${key}`).value)
      }
      queries.push({key:key,operator:operator,value:value})
    }
  })

  if (globalThis.doServiceFilter == true){
    let serviceList = globalThis.serviceList
    let serviceArray = lowerArray(Object.keys(serviceList).filter(key => serviceList[key]))
    queries.push({key:'services_lower',operator:'array-contains-any',value:serviceArray})
  }

  if (queries.length != 0){
    // if there are any filters
    try {
      // Execute all queries concurrently
      const querySnapshots = await Promise.all(queries.map(q => getDocs(query(unwatchedRef, where(q.key,q.operator,q.value)))));
      //populate(querySnapshots[0])

      populate_multiple(querySnapshots)

    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }
  else{
    //if there are no filters
    let querySnapshot = await getDocs(unwatchedRef)
    populate(querySnapshot)
  }
}

// TODO: allow for zero filters
// did I do this?
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

  // Display the common movies
  commonMovies.forEach(movie => {
    var markup = movieElement(movie);
    document.querySelector('.list').insertAdjacentHTML('beforeend', markup);
    // Triggers for opening popup
    let id = movie.id
    document.getElementById(id).onclick = function() { openPop(id); };
  });
}

function populate(querySnapshot){
  //delete previous inserted html
  clearList();
  const unwatched = [];
  querySnapshot.forEach((doc) => {
    unwatched.push({
      id: doc.id, 
      data: doc.data()
    })
  });
  unwatched.forEach(movie => {
    var markup = movieElement(movie)
    document.querySelector('.list').insertAdjacentHTML('beforeend', markup)
    //triggers for opening popup
    let id = movie.id
    document.getElementById(id).onclick = function() {openPop(id)};
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
    let rtrating = data.rtrating
    if (rtrating==undefined){
      rtrating = "N/A"
      document.getElementById("pop-rtrating").classList.add("ghost")
    }
    else{
      rtrating +="%"
    }
    document.getElementById("pop-rtrating").innerHTML=rtrating
    //images
    document.getElementById("pop-poster").src=data.poster
    //inputs
    document.getElementById("pop-notes").value=data.notes
    document.getElementById("pop-csrating").value=data.csrating
    //console.log(data.services)
    try{
      if(data.services.length == 0){
        //if no services
        document.getElementById("pop-services").innerHTML=`<div class=no-service> No streaming services. </div>`
      }
      else{
        //if there are services
        document.getElementById("pop-services").innerHTML=`<div class=service>${data.services.join("</div><div class='service'>")}</div>`
      }
    }
    catch(e){
      // because that might not work for some reason
      document.getElementById("pop-services").innerHTML=`<div class=no-service> No streaming services. </div>`
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
      console.log("Error: number not inputted")
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

//#region etc

// to transfer files from spreadsheet. extreme jank warning.

/*
async function addMM(movies){
  for (const movie of movies) {
    await addMovie(movie)
  };
}

let movies = ['American Dreamer','Bambi','Battle of the Sexes','Better Nate Than Ever','Bourne','Boyhood','Bridge to Terabithia','Clueless','Deaf Mute Heroine','Enchanted','Fantasia','Gilmore Girls','Ginny & Georgia','The Diplomat','Hollywood Stargirl','Into the Night','Irresistible','James Bond ','Knight and Day','Life Animated','Lord of the Rings','Mission Impossible ','Nick & Noras Infinite Playlist','Nomadland','Pantheon','Passengers','Planet of the Apes','Pop Star','Rocks','Say Anything','See You Yesterday','Sex Education','Shake the Dust','Short Circuit','Song of the Sea','Spaceship Earth','Sword of the Stranger','Tar','Ted Lasso','Tekkonkinkreet','The Call of the Wild','The Duff','The Kissing Booth','The Sandlot','The Way Way Back','Three Amigos','Time Travelers Wife','To Kill a Mockingbird','Umbrella Academy','Waltz with Bashir','Whats so Bad About Feeling Good?','Where to Invade Next','White Fang','Winter Days','Rocks','Fantastic Fungi','El Chivo','Lost City','The Prince of Egypt','Promare','The Secret of Kells','Endless Summer','1000 Me','Americanish','Kundun','Tony Hawk','Miss Congeniality','Super 8','Brothers of the Wind','Tonight Youre Mine','Dancer in the Dark','China Blue','The Point of No Return','La Femme Nikita','Beef','Dog Gone','Casa de papel','Divergent ','Cyrano','Creed','Brigsby Bear','Map of Tiny Perfect Things','Miss Juneteenth','Fried Green Tomatoes','The Sisterhood of the Traveling Pants','Gran Turismo','Archies','Family Switch','13 the musical','Secret Diary of an Exchange Student','Blackpink: Light up the sky','The Italian Job','Now You See Me','Logan Lucky','Theory of everything','Liar liar','Dumplin','500 days of summer','My Spy','One Piece: Baron Omatsuri and the Secret Island','Alien','Fight Club','Snatch','Pulp Fiction','Mcfarland USA','Nine to Five','Sharper','Death at a Funeral','Woman King','Bottle Shock','Conclave']
//addMM(movies)
*/

//#endregion