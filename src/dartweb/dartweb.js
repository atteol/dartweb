// npm install ws
const WebSocket = require("ws");

const https = require("https");


// internal classes
class DartwebRequest {
    constructor(_p, _i, _o, _r, _h) {
        this.path = _p;
        this.ip = _i;
        this.port = _o;
        this.receivedAt = _r;
        this.respond = _h;
    }
}
class DartwebResponse {
    constructor(code, content) {
        this.code = code;
        this.content = content;
    }
}



function _DWreq(targetServer, targetPath, onError, onResponse) {
    let reqData = JSON.stringify({
        "target": targetServer + "/" + targetPath
    });

    let req = https.request({
        "hostname": "dartweb.kantondev.org",
        "method": "POST",
        "port": 58510,
        "path": "/",
        "headers": {
            "Content-Type": "application/json",
            "Content-Length": reqData.length,
        }
    }, (resData) => {
        let rawPayload = [];
        resData.on("data", (chk) => rawPayload.push(chk));
        resData.on("end", () => {
            let strPayload = Buffer.concat(rawPayload).toString(),
                payload = JSON.parse(strPayload);

            if (payload.error) onError(payload);
            else onResponse(payload);
        });
    });
    req.on("error", (e) => onError(`Failed to connect to Dartweb`));

    req.write(reqData);
    req.end();
}


function _createDWServer(dartwebToken, serverName, allowTypes, onError, onConnect, onRequest) {

    // Establish WebSocket connection to default (KantonDev) Dartweb central server
    var sock = new WebSocket("wss://dartweb.kantondev.org:51371");

    sock.onerror = () => onError(`Failed to connect to Dartweb`);
    sock.onclose = () => onError(`Channel closed`);

    // Authenticate server when the WS channel has opened
    sock.onopen = () => {
        let openData = {
	        "type": 0,
            "tk": dartwebToken,
            "sn": serverName,
            "br": Object.keys(allowTypes).includes("browser") ? allowTypes.browser : true,
            "ap": Object.keys(allowTypes).includes("api") ? allowTypes.api : true,
        }
        sock.send(JSON.stringify(openData));
    }

    // Handle incoming messages from the central server
    sock.onmessage = (e) => {
        let received = JSON.parse(e.data);
        if (received.type == 0) {
            if (received.est) onError(received.est);
            else onConnect();
        } else if (received.type == 1) {
            let _respond = (resp) => {
                let respondData = {
                    "type": 1,
                    "tk": dartwebToken,
                    "rid": received.rid,
                    "res": resp
                }
                sock.send(JSON.stringify(respondData));
            }
            let req = new DartwebRequest(received.req.path, received.req.ip, received.req.port, received.req.receivedAt, _respond);
            onRequest(req);
        } else if (received.type == 2) {
            onError(received.est);
        }
    }

}

// Export library for use in Nodejs applications
module.exports = {
    hostServer: _createDWServer,
    request: _DWreq
}
