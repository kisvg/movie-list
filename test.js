// get const from API and log it

async function getFrom(url){
  try {
    const response = await fetch(url);
    return response.json(); // Return the data from the response
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error; // Rethrow error to handle it in the calling function
  }
};

async function send(url){
const users = await getFrom(url); // Await the result of asyncExample
console.log(users); // Log the result to the console
}

send("https://www.omdbapi.com/?t=bambi&plot=full&apikey=f58b2e26")