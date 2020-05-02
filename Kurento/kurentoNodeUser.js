/* global require module */
const Kurento = require("./kurentoNodeServerHelper.js");
const Servers = require("./Servers.js");

let logE = Servers.logE;
let logENoWebsocket = Servers.logENoWebsocket;
let log = Servers.log;
let logNoWS = Servers.logNoWS;
let sendSafe = Servers.sendSafe;

const MAX_TIME_TO_CONNECT = 15000;

function CandidateBag(){
    this.candidates = [];
    this.endpoint = null;
    return this;
}

CandidateBag.prototype.add = function(candidate){
    this.candidates.push(candidate);
    if(this.endpoint)this.unload();
}
CandidateBag.prototype.attach = function(endpoint){
    this.endpoint = endpoint;
    this.unload()
}
CandidateBag.prototype.unload = function(){
    if(this.endpoint && this.candidates.length > 0){
        while(this.candidates.length){
            this.endpoint.addIceCandidate(this.candidates.shift())
        }
    }
}






/* config looks like 
{
    sessionName, // either 'broadcaster' or 'viewer-'+name
    socket,
    candidates,
    sdpOffer,
    bandwidth:{recvMax,recvMin},

}

session includes...
    endpoint
    hubPort
    sdpAnswer

*/
function kurentoSession(config,callback){
    this.sdpOffer = config.sdpOffer;
    this.sessionName = config.sessionName;
    this.socket = config.socket;
    this.viewers = [];
    this.candidates = [];

    setTimeout(()=>{
        if(this.state !== "CONNECTED" && this.state !== "READY"){
            logE("(Session  '"+this.sessionName+"')'s WebRTC endpoint took over ",MAX_TIME_TO_CONNECT," ms to connect. It has timed out.");
            this.stop();
        }
    },MAX_TIME_TO_CONNECT)


    Kurento.createWebRtcEndPoint((error,endpoint)=>{
        // console.log("created webrtc endpoint",this.sessionName);
        if(error){
            if(endpoint){endpoint.release();}
            return callback(error);
        }
        this.endpoint = endpoint;
        this.applyBandwidth(config.bandwidth);
        
        endpoint.on('OnIceComponentStateChanged',ev=>{
            log(this.sessionName,"ice component state",ev.state);
            this.state = ev.state;
            if(ev.state === "FAILED"){
                logE(this.sessionName,"ICE Component state set to FAILED");
                this.stop();
            }
        })
        endpoint.on('OnIceGatheringDone',ev=>{
            // console.log(this.sessionName, "ice gathering done");
        })

        /* Establish OnIceCandidates handler for when our endpoint generates candidates locally */
        endpoint.on('OnIceCandidate', event=> {
            var candidate = Kurento.getComplexIceCandidate(event.candidate);
            // console.log("sent candidate to",this.sessionName)
            sendSafe(this.socket,{
                id : 'iceCandidate',
                sessionName: this.sessionName,
                candidate : candidate
            });
        });
        /* Analyze SDP Offer and respond with SDP Answer */
        endpoint.processOffer(this.sdpOffer, (error, sdpAnswer)=> {
            if (error || !sdpAnswer) {
                this.stop();
                logE("Error processing SDP offer ",error,". offer:",this.sdpOffer,". answer:",sdpAnswer);
                return callback(error);
            }
            // console.log("processed offer from",this.sessionName);
            this.sdpAnswer = sdpAnswer;
            callback( null, this); // this is the only successful way to call the callback
        });
        endpoint.gatherCandidates((error)=>{
            if (error) {
                this.stop();
                logE("Error gathering ICE candidates",error);
                return callback(error);
            }
        });
        /* Create hubPort and connect our endpoint and hubPort */
        Kurento.createHubPort((error, _hubPort)=>{
            if (error) {
                this.stop();
                return callback(error);
            }
            this.hubPort = _hubPort;
            try{
                this.endpoint.connect(this.hubPort);
                this.hubPort.connect(this.endpoint);
            }catch(e){
                logE("Error connecting new WebRTC Endpoint to new HubPort",e);
                this.stop();
            }
        });
    })
}

kurentoSession.prototype.stop = function(){
    if(this.endpoint){
        this.endpoint.release();
        this.endpoint = undefined;
    }
    if(this.hubPort){
        this.hubPort.release();
        this.hubPort = undefined;
    }
}

/* This needs to be called after the endpoint has been created but before the SDP answer has been sent */
kurentoSession.prototype.applyBandwidth = function(bw){
    if(bw.sendMin)this.endpoint.setMinVideoSendBandwidth(bw.sendMin,onError);
    if(bw.sendMax)this.endpoint.setMaxVideoSendBandwidth(bw.sendMax,onError);
    if(bw.recvMin)this.endpoint.setMinVideoRecvBandwidth(bw.recvMin,onError);
    if(bw.recvMax)this.endpoint.setMaxVideoRecvBandwidth(bw.recvMax,onError);
    function onError(e){
        if(e)return logE("failed to set bandwidth",e);
    }
}

//////////////////////////////////

/*
    config looks like 
    {
        socket,
        id,
        streamName
    }

    other internal properties:

    {
        candidates
    }
*/
function kurentoNodeUser(config){
    this.id = config.id;
    this.streamName = config.streamName;
    this.socket = config.socket;

    this.session = null;
    this.candidateBag = new CandidateBag();
    this.sessionName = undefined; //
    
    this.broadcaster = undefined; // if we are a viewer, this will be populated with the user that is broadcasting to us
    this.viewers = []; // if we are a broadcaster, array of users that are viewing us

    return this;
}
kurentoNodeUser.prototype.getEndpoint = function(){
    return this.session.endpoint;
}

kurentoNodeUser.prototype.getHubPort = function(){
    return this.session.hubPort;
}
kurentoNodeUser.prototype.getSdpAnswer = function(){
    return this.session.sdpAnswer;
}
kurentoNodeUser.prototype.addRemoteIceCandidate = function(candidate){
        this.candidateBag.add(candidate);
}
kurentoNodeUser.prototype.createSession = function(sessionName,sdpOffer,bandwidth,callback){
    this.candidateBag = new CandidateBag();
    
    new kurentoSession({
        sessionName:sessionName,
        bandwidth:bandwidth,
        socket:this.socket,
        sdpOffer:sdpOffer
    },(error,session) =>{
        // console.log("session created",sessionName);
        if(error){
            logE("Error creating session",error,sessionName,bandwidth,sdpOffer)
            return callback(error);
        }
        this.session = session;
        this.sessionName = sessionName;
        this.candidateBag.attach(session.endpoint);
        callback(null,session);
    })
}
kurentoNodeUser.prototype.stop = function(){
    log("stop",this.sessionName);
    try{
        this.session.stop();
        if(this.sessionName !== "broadcaster"){ // we are a viewer
            this.notifyBroadcasterWeStoppedWatching();
         }
         else{ // we are a broadcaster
             this.notifyViewersOfBroadcastEnd();
         }
        //  delete this.session;
         this.viewers = null;
         this.broadcaster = null;
    }
    catch(e){
        logE("Could not stop session",this.sessionName,e);
        // console.log("session",this.sessionName,"already stopped"); // TODO: what causes this?
    }
}

kurentoNodeUser.prototype.registerBroadcaster = function(broadcasterUser){
    this.broadcaster = broadcasterUser;
}
kurentoNodeUser.prototype.registerViewer = function(targetViewer){
    this.viewers = this.viewers.filter(user=>user!==targetViewer); // ensure we don't act like we have multiple copies of the same viewer watching
    this.viewers.push(targetViewer);
    this.updateNumberOfViewers();
}
kurentoNodeUser.prototype.unregisterViewer = function(targetViewer){
    this.viewers = this.viewers.filter(user=>user!==targetViewer);
    this.updateNumberOfViewers();
}
kurentoNodeUser.prototype.notifyViewersOfBroadcastEnd = function(){
    this.viewers.forEach(viewer=>{
        sendSafe(viewer.socket,{
            sessionName:viewer.sessionName,
            id:"viewState",
            viewState:"ended"
        })
    })
}
kurentoNodeUser.prototype.notifyBroadcasterWeStoppedWatching = function(){
    if(this.broadcaster){
        this.broadcaster.unregisterViewer(this);
    }
}
kurentoNodeUser.prototype.updateNumberOfViewers = function(){
    sendSafe(this.socket,{
        id:"viewerInfo",
        number:this.viewers.length 
    })
}

module.exports = kurentoNodeUser;