# Dartweb Nodejs library Documentation
* **Note**: This documentation assumes you are using the default (KantonDev) central server.

## How to install
Currently, the Dartweb library is only available by cloning/downloading from the repository. The library is very compact and only requires one file (dartweb.js). It can be found in `src/dartweb/`.

* Place the file in whatever directory you want to. A recommended location is in the same directory as your Node app's entry point.
* You will also need to install [ws](https://github.com/websockets/ws), a Nodejs library enabling WebSocket support. You can install ws using `npm i ws`.

## Using Dartweb in your app
Add this to your file:
```js
const dartweb = require("./dartweb"); // or ("./dartweb.js"), however you like
```

The Dartweb library only has 2 methods: `request` and `hostServer`.
* `request` allows you to use the Dartweb API (client).
* `hostServer` allows you to connect your own server to the Dartweb network (server).

Let's take a look at both methods.

### `request`
Sends a Dartweb request to the specified server and path.

Usage:
```js
dartweb.request(
    (string) targetServer,
    (string) targetPath,
    ((error) => void) onError,
    ((response) => void) onResponse
)
```

Parameters:
* **targetServer**: The address of the Dartweb server that is being queried.
* **targetPath**: The path to request from. Leave empty (`""`) to request from the root path.
* **onError(Error)**: Callback to be called when an error occurs.
* **onResponse(Response)**: Callback to be called when a response is received from the server.

The `onError` callback in `request` provides you an Error object, unlike the `onError` callback in `hostServer` as it only provides the error message as a string.

An Error is an object containing the same information as a Response (server name, owner, timestamp etc). To get the error message only, use `e.error`.

#### Response
A Response is an object that contains the following properties:

`error`: Error message (always `null`)

`code`: Status code given by the target server

`response`: The content given by the target server

`address`: The address requested by you

`serverName`: The name of the server requested

`serverOwner`: The owner of the server requested

`version`: The version of the central server

`ts`: The timestamp (milliseconds since Jan 1 1970 midnight UTC) of the central server responding to you


### `hostServer`
Connects a server to Dartweb with the specified token.

Usage:
```js
dartweb.hostServer(
    (string) dartwebToken,
    (string) serverName,
    (object {"browser": (boolean), "api": (boolean)}) allowTypes,
    ((error) => void) onError,
    (() => void) onConnect,
    ((request) => void) onRequest
)
```

Parameters:
* **dartwebToken**: Your server token. Check the [readme](https://github.com/botboi37/dartweb/blob/master/README.md) for more information.
* **serverName**: The name of your server. Server names are visible in some error messages and all API requests. The server name can be any string 2-24 characters long, and it can change each time you connect.
* **allowTypes**: An object containing your request type allow/deny preferences. For example, `{"browser": true, "api": false}` would mean your server can be accessed via browser (GET) and cannot be accessed via the Dartweb API (POST). If either (or both) preferences are not specified, they default to `true`.
* **onError(error)**: Callback to be called when the server experiences an error, such as an unauthorized token, or sending invalid data to clients.
* **onConnect()**: Callback to be called when the server has successfully connected to Dartweb and is available for requests.
* **onRequest(Request)**: Callback to be called when the server receives a request from a Dartweb client.



#### Request
A Request is an object that contains the following properties:

`path`: The path requested by the client. For example, requesting `https://dartweb.kantondev.org:9999/yourserver/hello/world/foo/bar` will result in `hello/world/foo/bar`.

`ip`: The remote address of the client, or `unknown` in case it's unknown.

`port`: The remote port of the client, or `unknown` in case it's unknown.

`type`: How the client requested from your server, `browser` or `api`

`receivedAt`: The timestamp (milliseconds since Jan 1 1970 midnight UTC) of the central server forwarding the request

A Request also contains a method to respond to it:

`respond(Response)`: Responds to the request with specified Response. Will have no effect if used multiple times.

A proper Response to be used in `respond` must contain the following properties:

`code`: The status code of the response. On Dartweb, `0` indicates OK/success.

`type`: The type of the resource (`file` or `text`).

* If type is `file`, a binary base64-decoded version of the content is sent back to the client. **Note:** you must send valid base64-encoded data! An error will be sent by the central server if you send invalid data.
* If type is `text`, the content is sent without modifications.

`content`: The content to be sent. If sending a file, use something like the value from `fs.readFileSync()` or preferably the asynchronous `fs.readFile()`. Just make sure the content is base64-encoded if you send data with the `file` type.


## Need some examples to get started?
For a few practical examples of using the library, check the [tests](https://github.com/botboi37/dartweb/tree/master/tests).