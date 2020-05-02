
/* local helper files */
const KurentoHelper = require("./kurentoNodeServerHelper.js")
const KurentoUser = require("./kurentoNodeUser.js");
const Servers = require('./Servers.js');


let idCounter = 0;
let idToNameMap = {} // maps from stream name to client/socket ID
let nameToIDMap = {};
let users = {}; // map from id to client object. client object looks like...
/* {
    id:id,
    sessions:{
        name:obj
    }
} */

let logE = Servers.logE;
let logENoWebsocket = Servers.logENoWebsocket;
let log = Servers.log;
let logNoWS = Servers.logNoWS;
let sendSafe = Servers.sendSafe;


init();

function init(){
    KurentoHelper.getKurentoClient(()=>{});
    Servers.wss.on('connection', function(ws) {
        try{
            var socketID = nextUniqueId();
            users[socketID] = {};
            // welcome the user
            sendSafe(ws,{
                id:'log',
                msg:'Successfully connected to the VAS.  Your socket ID is '+socketID
            })

            ws.on('error', function(error){
                logE('error with socket',socketID,error);
                clear(socketID);
            });
        
            ws.on('close', function(){
                log(socketID,'closed');
                clear(socketID);
            });
        
            ws.on('message', function(_message){
                try{
                    var message = JSON.parse(_message);
                    log(socketID," sent ",message.id);
                    // console.log(socketID, "  >> ", _message.slice(0,150));
                    ws.broadcastEnabled = true;
                    switch (message.id){
                        case 'debug':
                            ws.broadcastEnabled = true;
                            log("configuration",Servers.getPublicConfig());
                            break;
                        // case 'broadcaster':
                        //     handleNewBroadcaster(socketID,message.streamName,message.sdpOffer,ws);
                        //     break;
                        // case 'viewer':
                        //     handleNewViewer(socketID,message.streamName,message.sessionName,message.sdpOffer,ws,message.sourceName);
                        //     break;
                        case 'connect':
                            handleNewConnection(socketID,message.streamName,message.sessionName,message.sdpOffer,ws,message.bandwidth);
                            break;
                        case 'view':
                            handleView(socketID,message.sessionName,message.sourceName,error=>{
                                if(error){
                                    logE("couldnt handle view",error);
                                    sendSafe(ws,{
                                        remoteExecutionCode: message.remoteExecutionCode,
                                        response:{
                                            type:"error",
                                            message:"Error patching you through to view " + message.sourceName
                                        }
                                    })
                                }
                                else{
                                    setTimeout(()=>{
                                        sendSafe(ws,{
                                            remoteExecutionCode: message.remoteExecutionCode,
                                            response:{
                                                type:"success"
                                            }
                                        })
                                    },100) // TODO: use endpoint's media state change event rather than just waiting a bit.
                                }
                            })
                            break;
                        case 'stop':
                            stop(socketID,message.sessionName);
                            break;
                        case 'onIceCandidate':
                            onIceCandidate(socketID, message);
                            break;
                    
                        default:
                            logE("Invalid message",message);
                                break;
                    }
                }catch(e){
                    logE("ERROR FROM WEBSOCKET MESSAGE",_message,e,"\n");
                }
            });
        }catch(e){
            logE("ERROR IN WEBSOCKET CONNECTION",e,"\n");
        }
    })
}




function handleView(socketID,sessionName,sourceName,callback){
    // console.log("nametoidmap get",nameToIDMap,sourceName);
    let viewer = getUser(socketID,sessionName);
    if(!viewer){
        logE("View Failed. Couldn't find viewer user with id",socketID);
        return callback("viewer not found");
    }
    let sourceId = nameToIDMap[sourceName];
    let broadcaster = getUser(sourceId,'broadcast');
    if(!broadcaster){
        logE("View Failed. No broadcasting user with name",sourceName," and ID ",sourceId);
        return callback("broadcaster not found");
    }
    KurentoHelper.getDispatcher((error,dispatcher)=>{
        if(error){
            logE("couldnt get dispatcher",error);
            return;
        }
        console.log("dispatcher connecting hubports",sourceId,socketID)
        dispatcher.connect(broadcaster.getHubPort(),viewer.getHubPort());
        broadcaster.registerViewer(viewer); // so the broadcaster knows the viewer is watching
        viewer.registerBroadcaster(broadcaster); // so the viewer knows 
        
        return callback(null);
    })
}

function handleNewConnection(socketID,streamName,sessionName,sdpOffer,ws,bandwidth){
    /* close an existing connection if one exists */
    let user = getUser(socketID,sessionName);
    if(user){
        log("stopping user because one already exists",sessionName);
        user.stop();
    }
    user = new KurentoUser({
        id:socketID,
        streamName:streamName,
        socket:ws
    })
    setUser(socketID,sessionName,user);
    nameToIDMap[streamName] = socketID;
    idToNameMap[socketID] = streamName;
    // console.log("nametoidmap set",nameToIDMap);

    user.createSession(sessionName,sdpOffer,bandwidth,(error,session)=>{
        if(error){
            logE("Connection rejected",error);
            return sendSafe(ws,{
                id : 'connection',
                sessionName:sessionName,
                response : 'rejected',
                message : error
            })
        }
        else{
            sendSafe(ws,{
                id : 'connection',
                sessionName: sessionName,
                response : 'accepted',
                sdpAnswer : session.sdpAnswer
            }) 
            console.log("CONECTION ACCEPTED **** KURENTONODESERVER");
        }
    })
}

function clear(id){
    log("clearing user",id);
    if(users[id]){
        Object.keys(users[id]).forEach(sessionName=>{
            let user = getUser(id,sessionName);
            if(user){
                user.stop();
            }
        })
    }
    delete users[id];
    let streamName = idToNameMap[id];
    delete idToNameMap[id];
    delete nameToIDMap[streamName];
    // if no clients are connected, release our pipeline and dispatcher
    if (isEveryClientDisconnected()) {
        KurentoHelper.cleanup();
    }
}
// Stop and remove a webRTC client
function stop(id,sessionName) {
    let user = getUser(id,sessionName);
    if(!user)return console.log("couldnt stop user",id,"sessionName",sessionName,"couldnt find the user");
    user.stop();
    delete users[id][sessionName];
    if(Object.keys(users[id]).length<1){
        clear(id);
    }
}
function isEveryClientDisconnected(){
    return Object.getOwnPropertyNames(users).length == 0
}

/* Handle remote peer sending us ice candidates */
function onIceCandidate(socketID,message) {
    var candidate = KurentoHelper.getComplexIceCandidate(message.candidate);

    let user;
    try{
        user = getUser(socketID,message.sessionName);
        user.addRemoteIceCandidate(candidate);
    }catch(e){
        // do nothing
        logE("couldn't add remote ice candidate for user",socketID);
    }
}
function nextUniqueId() {
    idCounter++;
    return idCounter.toString();
}

function getUser(socketID,sessionName){
    try{
        return users[socketID][sessionName];
    }catch(e){
        return undefined;
    }
}
function setUser(socketID,sessionName,newUser){
    if(!users[socketID]){
        users[socketID] = {};
    }
    users[socketID][sessionName] = newUser;
}