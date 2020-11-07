// Include the Dartweb library (minified)
const dartweb = require("./dartweb.min.js");

// Include filesystem for reading files (built-in)
const fs = require("fs");

// Token to be used to authenticate your server
const token = "<insert your token here>";


dartweb.hostServer(token, "My First Dartweb Server", { "browser": true, "api": false }, (e) => {
    // called when an error occurs
    console.log("Error: " + e);
}, () => {
    // called when your server was successfully authenticated by the central server & has connected to Dartweb
    console.log("Connected!");
}, (req) => {
    // called when your server receives a request from Dartweb. req is a Request object.
    // A Request is an object that contains the following properties:

    // path - The path requested by the client. For example, requesting https://dartweb.kantondev.org:9999/yourserver/hello/world/foo/bar will result in hello/world/foo/bar.
    // ip - The remote address of the client, or "unknown" in case it's unknown.
    // port - The remote port of the client, or "unknown" in case it's unknown.
    // type - How the client requested from your server, "browser" or "api"
    // receivedAt - The timestamp (milliseconds since Jan 1 1970 midnight UTC) of the central server forwarding the request

    // A Request also contains a method to respond to it:
    // respond(Response) - Responds to the request with specified Response. Will have no effect if used multiple times.

    // A proper Response to be used in "respond" must contain the following properties:
    // code - The status code of the response. On Dartweb, 0 indicates OK/success.
    // type - The type of the resource ("file" or "text").
    //      If type is "file", a binary base64-decoded version of the content is sent back to the client. Note: you must send valid base64-encoded data! An error will be sent by the central server if you send invalid data.
    //      If type is "text", the content is sent without modifications.
    // content - The content to be sent. If sending a file, use something like the value from fs.readFileSync() or preferably the asynchronous fs.readFile().
    //      Just make sure the content is base64-encoded if you send data with the "file" type.


    // Handle the path, respond accordingly using req.respond()
    switch(req.path) {
        case null: return req.respond({
            "code": 0,
            "type": "text",
            "content": "Hello, this is the root path!"
        });

        case "kantondev.png": return req.respond({
            "code": 0,
            "type": "file",
            "content": fs.readFileSync("kantondev.png", "base64")
        });

        default: return req.respond({
            "code": 0,
            "type": "text",
            "content": "Oops, not found!"
        });
    }
});

