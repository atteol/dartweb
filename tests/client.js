// Include the Dartweb library (minified)
const dartweb = require("../dist/dartweb.min");

// Basic request with an error handler.
// Requests the root path (empty path string: "") from the address "exampleserver".
// prints the error/response data only
dartweb.request("exampleserver", "", (e) => {
    // Unlike in hostServer, an Error is an object containing the same information as a Response (server name, owner, timestamp etc).
    // To get the error message only, use e.error
    console.log("Error: " + e.error);
}, (r) => {
    // A Response is an object that contains the following properties:

    // error - Error message (always null)
    // code - Status code given by the target server
    // response - The content given by the target server
    // address - The address requested by you
    // serverName - The name of the server requested
    // serverOwner - The owner of the server requested
    // version - The version of the central server
    // ts - The timestamp (milliseconds since Jan 1 1970 midnight UTC) of the central server responding to you

    // To get the content only, use r.response
    console.log("Response: " + r.response);
});

// Basic request with an error handler.
// Requests the root path (empty path string: "") from the address "exampleserver".
// prints the error/response objects with other information from the central server, such as timestamp, server name, server owner...
dartweb.request("exampleserver", "", (e) => {
    // Whole error object
    console.log("Error: " + JSON.stringify(e, null, 2));
}, (r) => {
    // Whole response object
    console.log("Response: " + JSON.stringify(r, null, 2));

    // Some server information
    console.log("You requested a server called: " + r.serverName);
    console.log("The server is owned by: " + r.serverOwner);
});