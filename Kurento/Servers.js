/* global __dirname */

var express = require('express');
var https = require('https');
var path = require('path');
var wsLibrary = require('ws');
var kurento = require ('kurento-client');
/* Loggly */
const winston = require('winston');
const {Loggly} = require('winston-loggly-bulk');

var Config = require("./config.js");
let Misc = require("./misc.js");


let wss; // websocket server. used to host connections to web clients
let connectedURI = null;
function init(){
    setupLoggly();
    setupWebsocketServerForWebClients();
}


/*********************/
/* Connect to Loggly */
/*********************/
function setupLoggly(){
    winston.add(new Loggly({
        token: "2bc8118f-8e68-4a53-9d69-3882a846ccb2",
        sendConsoleErrors:true,
        subdomain: "intracom",
        tags: ["Winston-NodeJS"],
        json: true
    }));
}


/*************************/
/* Connect to web client */
/*************************/


function setupWebsocketServerForWebClients(){
    wss = createWebSocketServer();
    wss.broadcast = function broadcast(data) {
        try{
            wss.clients.forEach(function each(client) {
                try{
                    if(client.broadcastEnabled)sendSafe(client,data);
                }
                catch(e){
                    logENoWebsocket("error broadcasting to client",client,e);
                }
            });
        }catch(e){
            logENoWebsocket("could not broadcast to any clients",e);
        }
    };
}


function createWebSocketServer(){
    let app = express();
    let port = Config.knasPort;
    let server = https.createServer(Config.serverOptions, app).listen(port, function() {
        console.log('Kurento Node Application Server started, running on port',port);
    });
    
    let wss = new wsLibrary.Server({
        server : server,
        path : Config.knasPath
    });

    app.use(express.static(path.join(__dirname, 'static')));
    return wss;
}


/******************/
/* Connect to KMS */
/******************/
function connectToKMSWSS(){
    const options = {
        failAfter: 5 // reconnection attempts (~1100 ms)
    }
    let wssURI = Config.kmsWSSURI;
    return new Promise((res,rej)=>{
        kurento(wssURI,options,function(error,_kurentoClient){
            if(error){
                logE("Could not connect to VMS over secure WebSocket (WSS) at ",wssURI);
                return rej(error);
            }
            else{
                // successfully connected WSS
                connectedURI = wssURI;
                log("Successfully connected to VMS over secure WebSocket (WSS) at",wssURI);
                return res(_kurentoClient);
            }
        })
    });
}
function connectToKMSWS(){
    const options = {
        failAfter: 5 // reconnection attempts (~1100 ms)
    }
    let wsURI = Config.kmsWSURI;
    return new Promise((res,rej)=>{
        kurento(wsURI,options,function(error,_kurentoClient){
            if(error){
                logE("Could not connect to VMS over WebSocket (WS) at",wsURI);
                return rej(error);
            }
            else{
                // successfully connected WS
                connectedURI = wsURI;
                log("Successfully connected to VMS over WebSocket(WS) at",wsURI);
                return res(_kurentoClient);
            }
        })
    });
}
function connectToKMS(){
    return connectToKMSWSS().catch(()=>{return connectToKMSWS()});
}

/************/
/* Handling */
/************/

function log(){
    logNoWS(...arguments);
    broadcastSafe("log",...arguments);
}
function logE(){
    logENoWebsocket(...arguments);
    broadcastSafe("error",...arguments);
}
function logNoWS(){
    console.log(...arguments);
}
function logENoWebsocket(){
    console.error(...arguments);
    let str = Misc.stringify(...arguments);
    winston.log("error",str);
}

function broadcastSafe(){
    try{
        wss.broadcast(Misc.stringify({
            id:arguments[0],
            msg:Array.from(arguments).slice(1)
        }));
    }catch(e){
        logENoWebsocket("failed to broadcast ws message",e,...arguments);
    }
}

/* Just a wrapper for ws.send that will prevent us from crashing the server
if we try to send a message on a closed socket or something*/
function sendSafe(socket,msg){
    try{
        socket.send(Misc.stringify(msg));
    }catch(e){
        logENoWebsocket("failed to send ws message",e,msg);
    }
}

function getPublicConfig(){
    let copy = Object.assign({},Config);
    copy.serverOptions.key = "[Hidden]";
    copy.serverOptions.cert = "[Hidden]";
    copy.connectedToKMSatURI = connectedURI;
    return copy;
}

init();

module.exports = {
    getPublicConfig,
    wss,
    logE,
    log,
    logENoWebsocket,
    logNoWS,
    broadcast:broadcastSafe,
    sendSafe,
    connectToKMS
}