const https = require("https"), fs = require("fs"), path = require("path");

// npm install ws
const WebSocket = require("ws");


// replace with your SSL files
const ssl = {
    key: fs.readFileSync("/etc/letsencrypt/live/dartweb.kantondev.org/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/dartweb.kantondev.org/cert.pem"),
    ca: fs.readFileSync("/etc/letsencrypt/live/dartweb.kantondev.org/fullchain.pem")
}

const EXT_PORT_LISTEN = 9999;
const API_PORT_LISTEN = 58510;
const INT_PORT_LISTEN = 51371;

const REQ_TIMEOUT = 7500;
const MIN_SERVERNAME_LENGTH = 2;
const MAX_SERVERNAME_LENGTH = 24;

const VERSION = "v1.01";

/*
    TOKENS.json format (used in the default central server):
    {
        "token1": {
            "address": "server1",
            "owner": "owner1",
            "created": "day1/month1/year1"
        },
        "token2": {
            "address": "server2",
            "owner": "owner2",
            "created": "day2/month2/year2"
        }
        etc...
    }
*/
const toks = JSON.parse(fs.readFileSync("./TOKENS.json"));

var SERVERS = {},
    WAITINGREQS = {};

const HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": false,
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "*",
}

function GET_FORMATTED_DATE() {
    let dt = "",
        dto = new Date();

    let year = String(dto.getFullYear()).padStart(4, "0"),
        month = String(dto.getMonth() + 1).padStart(2, "0"),
        day = String(dto.getDate()).padStart(2, "0"),
        hour = String(dto.getHours()).padStart(2, "0"),
        minute = String(dto.getMinutes()).padStart(2, "0"),
        second = String(dto.getSeconds()).padStart(2, "0");

    dt = `${day}/${month}/${year} @ ${hour}:${minute}:${second}`

    return dt;
}

function GET_RANDOM_HEX_STR(len) {
    let out = ``;
    while (out.length < len) {
        out += Math.floor(Math.random()*17).toString(16);
    }
    return out;
}

function IS_VALID_JSON(txt) {
    try {
        JSON.parse(txt);
        return true;
    } catch (e) {
        return false;
    }
}


function serverToken(addr) {
    for (let t in toks) {
        if (toks[t].address == addr) return t;
    }
    return null;
}
function serverSock(addr) {
    for (let a in SERVERS) {
        if (a == addr) return SERVERS[a].sock;
    }
    return null;
}
function serverExist(addr) {
    for (let t in toks) {
        if (toks[t].address == addr) return true;
    }
    return false;
}

function getReqID() {
    let rid = null;
    while (Object.keys(WAITINGREQS).includes(rid) || !rid) rid = GET_RANDOM_HEX_STR(12);
    return rid;
}

function isValidURL(string) {
    var res = string.match(/([a-zA-Z0-9_.#?&/%]+)/g);
    return (res !== null)
}

function processAllow(rl) {
    if (typeof rl != "boolean" && rl != "number") return false;
    else return rl ? true : false;
}

function formatReqIP(i) {
    return i ? (i.startsWith("::ffff:") ? i.substring("::ffff:".length) : i) : "unknown";
}
function formatReqPort(i) {
    return i ? i : "unknown";
}

console.log("Starting External...");
https.createServer(ssl, (req, res) => {

    if (typeof req.headers.host != "undefined" && !req.headers.host.includes("dartweb.kantondev.org")) {
        return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nInvalid source`);
    } else if (!["GET"].includes(req.method)) {
        return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nUnsupported request method. Use GET`);
    } else {

        let ogUrl = req.url;

        if (ogUrl == "/") return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nMissing target server. Use URL format: https://dartweb.kantondev.org:9999/serveraddress/path/path2/etc`);
        else ogUrl = ogUrl.substring(1);

        if (!isValidURL(ogUrl)) return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nInvalid target server`);

        let recTs = new Date().getTime();

        let addr = ogUrl.split("/")[0],
            pt = ogUrl.substring(addr.length + 1);
        
        if (addr == "favicon.ico") return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nInvalid target server`);

        if (!serverExist(addr)) return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\n'${addr}' is not the registered address of any server in the Dartweb network.`);
        let ss = serverSock(addr);
        if (!ss || ss.readyState != WebSocket.OPEN) {
            if (ss) delete SERVERS[addr];
            return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\n'${addr}' is a Dartweb server (owned by: ${toks[serverToken(addr)].owner}) but is not currently online and connected to the Dartweb root server.`);
        } else {
            if (!SERVERS[addr].brow) return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\n'${addr}' does not allow this type of request (browser)`);
            let r = getReqID();
            let dt = {
                "type": 1,
                "req": {
                    "path": pt.length ? pt : null,
                    "ip": formatReqIP(req.connection.remoteAddress),
                    "port": formatReqPort(req.connection.remotePort),
                    "type": "browser",
                    "receivedAt": recTs
                },
                "rid": r
            }
            WAITINGREQS[r] = { "t": 0, "addr": addr, "path": path, "ip": formatReqIP(req.connection.remoteAddress), "https": res }
            ss.send(JSON.stringify(dt));
            setTimeout(() => {
                if (Object.keys(WAITINGREQS).includes(r)
                    && WAITINGREQS[r].ip == formatReqIP(req.connection.remoteAddress)) {
                        delete WAITINGREQS[r];
                        if (!Object.keys(SERVERS).includes(addr)) res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nThe server at ${addr} went offline.`);
                        else res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\n'${SERVERS[addr].name}' (${addr}) did not respond in time.`);
                    }
            }, REQ_TIMEOUT);
        }
    }
}).listen(EXT_PORT_LISTEN);
console.log("Ext ok");

console.log("Starting API...");
https.createServer(ssl, (req, res) => {

    if (typeof req.headers.host != "undefined" && !req.headers.host.includes("dartweb.kantondev.org")) {
        return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nInvalid source`);
    } else if (!["POST", "OPTIONS"].includes(req.method)) {
        return res.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\nUnsupported request method. Use POST`);
    } else {
        if (req.method != "POST" && req.method != "OPTIONS") return null;

        if (req.method == "OPTIONS") {
            res.writeHead(200, HEADERS);
            res.end();
        } else if (req.method == "POST") {
            var st = 200, payl = null, resp = {};

            let paylBuf = [];

            req.on("data", (c) => {
                paylBuf.push(c);
            }).on("end", () => {
                let conBuf = Buffer.concat(paylBuf).toString();
                res.writeHead(200, HEADERS);

                if (!IS_VALID_JSON(conBuf)) return res.end(JSON.stringify({ "error": "Invalid JSON data", "version": VERSION, "ts": new Date().getTime() }));

                payl = JSON.parse(conBuf);
                if (!Object.keys(payl).includes("target")) return res.end(JSON.stringify({ "error": "Missing target server", "version": VERSION, "ts": new Date().getTime() }));
                let ogUrl = payl.target;

                if (!isValidURL(ogUrl)) return res.end(JSON.stringify({ "error": "Invalid target server", "version": VERSION, "ts": new Date().getTime() }));

                let recTs = new Date().getTime();

                let addr = ogUrl.split("/")[0],
                    pt = ogUrl.substring(addr.length + 1);
                
                if (addr == "favicon.ico") return res.end(JSON.stringify({ "error": "Invalid target server", "version": VERSION, "ts": new Date().getTime() }));

                if (!serverExist(addr)) return res.end(JSON.stringify({
                    "error": `Unknown server address`,
                    "address": addr,
                    "serverName": null,
                    "serverOwner": null,
                    "version": VERSION,
                    "ts": new Date().getTime() }));
                let ss = serverSock(addr);
                if (!ss || ss.readyState != WebSocket.OPEN) {
                    if (ss) delete SERVERS[addr];
                    return res.end(JSON.stringify({
                        "error": `Server is currently offline`,
                        "address": addr,
                        "serverName": null,
                        "serverOwner": toks[serverToken(addr)].owner,
                        "version": VERSION,
                        "ts": new Date().getTime() }));
                } else {
                    if (!SERVERS[addr].api) return res.end(JSON.stringify({
                        "error": `Server does not allow this type of request (API)`,
                        "address": addr,
                        "serverName": SERVERS[addr].name,
                        "serverOwner": toks[serverToken(addr)].name,
                        "version": VERSION,
                        "ts": new Date().getTime() }));
                    let r = getReqID();
                    let dt = {
                        "type": 1,
                        "req": {
                            "path": pt.length ? pt : null,
                            "ip": formatReqIP(req.connection.remoteAddress),
                            "port": formatReqPort(req.connection.remotePort),
                            "type": "api",
                            "receivedAt": recTs
                        },
                        "rid": r
                    }
                    WAITINGREQS[r] = { "t": 1, "addr": addr, "path": path, "ip": formatReqIP(req.connection.remoteAddress), "https": res }
                    ss.send(JSON.stringify(dt));
                    setTimeout(() => {
                        if (Object.keys(WAITINGREQS).includes(r)
                            && WAITINGREQS[r].ip == formatReqIP(req.connection.remoteAddress)) {
                                delete WAITINGREQS[r];
                                return res.end(JSON.stringify({
                                    "error": `Server did not respond in time`,
                                    "address": addr,
                                    "serverName": SERVERS[addr].name,
                                    "serverOwner": toks[serverToken(addr)].name,
                                    "version": VERSION,
                                    "ts": new Date().getTime() }));
                            }
                    }, REQ_TIMEOUT);
                }
            });
        }
    }
}).listen(API_PORT_LISTEN);
console.log("API ok");


console.log("Starting Internal...");
const s = https.createServer(ssl).listen(INT_PORT_LISTEN), wss = new WebSocket.Server({ server: s });

wss.on("connection", (ws) => {
    ws.on("message", (m) => {
        let j = null;
	try {
	    j = JSON.parse(m);
	} catch (e) { return; }

	if (!Object.keys(j).includes("type")) return;
	switch (j.type) {
	    case 0:
            if (!Object.keys(j).includes("tk")) return;
            if (!Object.keys(j).includes("sn")) return;
            if (!Object.keys(j).includes("br")) return;
            if (!Object.keys(j).includes("ap")) return;

            j.br = processAllow(j.br);
            j.ap = processAllow(j.ap);

            if (!Object.keys(toks).includes(j.tk)) return ws.send(JSON.stringify({ "type": 0, "est": "Invalid token" }));
            else if (j.sn.length < MIN_SERVERNAME_LENGTH) return ws.send(JSON.stringify({ "type": 0, "est": "Too short server name" }));
            else if (j.sn.length > MAX_SERVERNAME_LENGTH) return ws.send(JSON.stringify({ "type": 0, "est": "Too long server name" }));
            else if (Object.keys(SERVERS).includes(toks[j.tk].address)) {
                let ss = serverSock(toks[j.tk].address);
                if (ss && ss.readyState != WebSocket.OPEN) delete SERVERS[toks[j.tk].address];
                if (ss && ss.readyState == WebSocket.OPEN) {
                    return ws.send(JSON.stringify({ "type": 0, "est": "Server already online" }));
                }
            }
            
            if (!j.br && !j.ap) return ws.send(JSON.stringify({ "type": 0, "est": "Browser and API are both denied. You need to allow at least one request type." }));
            else {
                SERVERS[toks[j.tk].address] = { "name": j.sn, "sock": ws, "brow": j.br, "api": j.ap }
                return ws.send(JSON.stringify({ "type": 0, "est": null }));
            }
        case 1:
            if (!Object.keys(j).includes("tk")) return;
            if (!Object.keys(j).includes("rid")) return;
            if (!Object.keys(j).includes("res")) return;
            if (!Object.keys(toks).includes(j.tk)) return ws.send(JSON.stringify({ "type": 0, "est": "Invalid token" }));
            if (!Object.keys(j.res).includes("code")) return ws.send(JSON.stringify({ "type": 2, "est": "You attempted to send data without a code." }));
            if (!Object.keys(j.res).includes("type")) return ws.send(JSON.stringify({ "type": 2, "est": "You attempted to send data without a type." }));
            if (!Object.keys(j.res).includes("content")) return ws.send(JSON.stringify({ "type": 2, "est": "You attempted to send data without content." }));
            else {
                if (!Object.keys(WAITINGREQS).includes(j.rid)) return;
                else {
                    if (WAITINGREQS[j.rid].t == 0) {
                        if (j.res.code == 0) {
                            if (typeof j.res.content != "string") {
                                WAITINGREQS[j.rid].https.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\n'${SERVERS[WAITINGREQS[j.rid].addr].name}' (${WAITINGREQS[j.rid].addr}) responded with an invalid response.`);
                                ws.send({ "type": 2, "est": "You attempted to send data of an invalid type. Strings only" });
                            } else {
                                if (j.res.type == "file") {
                                    let buf = null;
                                    try { buf = Buffer.from(j.res.content, "base64"); }
                                    catch (e) { ws.send({ "type": 2, "est": "You attempted to send invalid base64 data with type 'file'." }); }
                                    if (buf) WAITINGREQS[j.rid].https.end(buf);
                                } else WAITINGREQS[j.rid].https.end(j.res.content);
                            }
                        }
                        else WAITINGREQS[j.rid].https.end(`[DARTWEB ERROR] ${GET_FORMATTED_DATE()}\n'${SERVERS[WAITINGREQS[j.rid].addr].name}' (${WAITINGREQS[j.rid].addr}) responded with code: ${j.res.code}`);
                    } else if (WAITINGREQS[j.rid].t == 1) {
                        if (j.res.code == 0) {
                            if (typeof j.res.content != "string") {
                                WAITINGREQS[j.rid].https.end(JSON.stringify({
                                    "error": "Invalid response",
                                    "code": j.res.code,
                                    "response": null,
                                    "address": WAITINGREQS[j.rid].addr,
                                    "serverName": SERVERS[WAITINGREQS[j.rid].addr].name,
                                    "serverOwner": toks[serverToken(WAITINGREQS[j.rid].addr)].owner,
                                    "version": VERSION,
                                    "ts": new Date().getTime() }));
                                    ws.send({ "type": 2, "est": "You attempted to send data of an invalid type. Strings only" });
                                }
                            else WAITINGREQS[j.rid].https.end(JSON.stringify({
                                "error": null,
                                "code": j.res.code,
                                "response": j.res.content,
                                "address": WAITINGREQS[j.rid].addr,
                                "serverName": SERVERS[WAITINGREQS[j.rid].addr].name,
                                "serverOwner": toks[serverToken(WAITINGREQS[j.rid].addr)].owner,
                                "version": VERSION,
                                "ts": new Date().getTime() }));
                            }
                        else WAITINGREQS[j.rid].https.end(JSON.stringify({
                            "error": "Non-zero response code",
                            "code": j.res.code,
                            "response": null,
                            "address": WAITINGREQS[j.rid].addr,
                            "serverName": SERVERS[WAITINGREQS[j.rid].addr].name,
                            "serverOwner": toks[serverToken(WAITINGREQS[j.rid].addr)].owner,
                            "version": VERSION,
                            "ts": new Date().getTime() }));
                    }

                    return delete WAITINGREQS[j.rid];
                }
            }
	}
    });
});

console.log("Int ok");

console.log("Dartweb Central Server started. Version: " + VERSION);
