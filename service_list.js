// renders service list
export async function renderServiceList(service_list){
  var html = ``
  Object.keys(service_list).forEach(service=>{
    if(service_list[service]){
      //if checked
      html +=  `
        <div class="service-item">
          <input type="checkbox" checked="true" />
          <input type="text" class="service-input" placeholder="Enter streaming service..." value="${service}"></input>
        </div>
      `
    }
    //not checked
    else{
      html +=  `
        <div class="service-item">
          <input type="checkbox" />
          <input type="text" class="service-input" placeholder="Enter streaming service..." value="${service}"></input>
        </div>
      `
    }
    })
  //last item
  html +=`
    <div class="service-item">
      <input type="checkbox" id="service-checkbox-last"/>
      <input type="text" class="service-input" placeholder="Enter streaming service..." id="service-input-last"></input>
    </div>
  `
  document.getElementById("service-list").innerHTML = html
  document.getElementById('service-input-last').addEventListener("keyup", handleNewServiceInput)

  // enter => check
  let elements = document.getElementsByClassName("service-input")
  Array.from(elements).forEach((element) =>
    element.addEventListener("keyup", function(event){
      if (event.key === "Enter" && element.value !== ""){
        //check the box next to it
        element.previousElementSibling.checked = true
      }
    })
  )
}

// handles keyup on last service input
export function handleNewServiceInput(event){
    if (document.getElementById('service-input-last').value!=="" && event.target.id == "service-input-last") {
        updateServiceList()
    }
}

// when new service added, inject html with space for another to be added
export function updateServiceList(){
  document.getElementById('service-input-last').insertAdjacentHTML("afterend",`
      <div class="service-item">
      <input type="checkbox" class="checkbox"/>
      <input type="text" class="service-input" placeholder="Enter streaming service..." id="service-input-last-placeholder"></input>
      </div>
  `)
  document.getElementById('service-input-last').removeAttribute("id")
  document.getElementById('service-input-last-placeholder').id = "service-input-last"
  document.getElementById('service-input-last').addEventListener("keyup", handleNewServiceInput)
  // reassign enter => check for all inputs
  let elements = document.getElementsByClassName("service-input")
  Array.from(elements).forEach((element) =>
    element.addEventListener("keyup", function(event){
      if (event.key === "Enter" && element.value !== ""){
        //check the box next to it
        element.previousElementSibling.checked = true
      }
    })
)
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