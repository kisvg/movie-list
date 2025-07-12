// renders service list

import * as index from "./index.js"

export async function renderServiceList(service_list){
  getServiceSuggestions()
  var html = ``
  Object.keys(service_list).forEach(service=>{
    if(service_list[service]){
      //if checked
      html +=  `
        <div class="service-item">
          <input type="checkbox" checked="true" />
          <input list="service-suggestions" class="service-input" placeholder="Enter streaming service" value="${service}"></input>
        </div>
      `
    }
    //not checked
    else{
      html +=  `
        <div class="service-item">
          <input type="checkbox" />
          <input list="service-suggestions" class="service-input" placeholder="Enter streaming service" value="${service}"></input>
        </div>
      `
    }
    })
  //last item
  html +=`
    <div class="service-item">
      <input type="checkbox" id="service-checkbox-last"/>
      <input list="service-suggestions" class="service-input" placeholder="Enter streaming service" id="service-input-last"></input>
    </div>
  `
  document.getElementById("service-list").innerHTML = html
  document.getElementById('popup-service').classList.add("active")
  document.getElementById("pop-bg").classList.add('active');
  document.getElementById('service-input-last').addEventListener("keyup", handleNewServiceInput)
  addListeners()
}

export async function getServiceSuggestions(){
  let html = ``
  //movies
  let initialdata = await index.get(`https://api.themoviedb.org/3/watch/providers/movie?api_key=`+index.randKey("tmdb"))
  let data = initialdata.results
  let movies = []
  data.forEach(item=>{
    movies.push(item.provider_name)
  })
  //shows
  initialdata = await index.get(`https://api.themoviedb.org/3/watch/providers/movie?api_key=`+index.randKey("tmdb"))
  data = initialdata.results
  let shows = []
  data.forEach(item=>{
    shows.push(item.provider_name)
  })
  // merge them without duplicates
  let services = [...new Set([...movies, ...shows])]
  services.forEach(service_name => {
    html += `<option value="${service_name}">`
  })
  document.getElementById("service-suggestions").innerHTML = html
}

// handles keyup on last service input
export function handleNewServiceInput(event){
    if (document.getElementById('service-input-last').value!=="" && event.target.id == "service-input-last") {
        updateServiceList()
    }
}

// adds listeners to all items
export function addListeners(){
  let service_items = document.getElementsByClassName("service-item")
  Array.from(service_items).forEach((service_item) =>{
    let checkbox_element = service_item.children[0]
    let input_element = service_item.children[1]
    //if no event listeners attatched
    if (!(service_item.hasAttribute("listeners-attached"))){
      service_item.setAttribute("listeners-attached", "true")
      // if keyup on input
      input_element.addEventListener("keyup", function(event){
        // enter => check
        if (event.key === "Enter" && input_element.value !== ""){
          //check the box next to it
          checkbox_element.checked = true
          index.saveServiceList(getServiceList())
        }
        // removes item if service input is blank
        else if (input_element.value === "" && input_element.id !== "service-input-last"){
          service_item.remove()
        }
      })
      // end if keyup on input

      // manual check toggle => update list
      checkbox_element.addEventListener("change", function(event){
          index.saveServiceList(getServiceList())
      })

    }// end if no event listeners attatched
  })
}

// when new service added, inject html with space for another to be added
export function updateServiceList(){
  document.getElementById('service-list').insertAdjacentHTML("beforeend", `
      <div class="service-item">
        <input type="checkbox" class="checkbox"/>
        <input list="service-suggestions" class="service-input" placeholder="Enter streaming service" id="service-input-last-placeholder"></input>
      </div>
  `)

  document.getElementById('service-input-last').id = "service-input"
  document.getElementById('service-input-last-placeholder').id = "service-input-last"
  document.getElementById('service-input-last').addEventListener("keyup", handleNewServiceInput)
  // reassign listeners
  addListeners()
}

export function getServiceList(){
  let service_items = document.getElementsByClassName('service-item')
  let service_list = {}
  Array.from(service_items).forEach((service_item) => {
    //
    if (service_item !== service_items[service_items.length-1]){
      let checkbox_element = service_item.children[0]
      let input_element = service_item.children[1]
      let key = input_element.value
      let value = checkbox_element.checked
      service_list[key] = value
    }
  })
  
  return service_list
}