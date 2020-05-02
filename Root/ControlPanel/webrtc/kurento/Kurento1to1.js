const fs = require('fs');

/* global app intracomKurentoLib */
app.factory("Kurento1to1",function(GumService,SystemSettingsService,EnvService,OriginService,$injector,MyLabelService,EventService){

    /* should look something like "wss://intracomsystems.net:8443/one2one" */
    function getKurentoURI(){
        const protocol = OriginService.isSecure()?"wss":"ws";
        const settings = SystemSettingsService.get();
        const hostname = EnvService.get("knasHostname") || OriginService.getHostname(); // for testing, we can supply an alternate location of KNAS. Otherwise it will be on the same server that hosts the web code.
        const port = settings.IP_PORT_FOR_VIDEO_APPLICATION_SERVER_WSS;
        const path = "/";
        return protocol+"://"+hostname+":"+port+path;
    }

    let myName;
    EventService.on("disconnected",clear);

    function connectToServer(){
        let knasURI = getKurentoURI();
        myName = MyLabelService.getStreamName(); // $injector.get("WebRTCVideoStreamingService").getStreamName(myID);
        return intracomKurentoLib.connectToServer(knasURI,myName,true);
    }
    function broadcast() {
        fs.appendFile('test.txt', "INSIDE CONNECT", (err) => {
            if (err) {
                console.error(err)
                return
            }
            //file written successfully
        })
        return GumService.getStreamClones().then(streams=>{
            return intracomKurentoLib.broadcast({
                streams:streams
            })
        })
    }
    function call(broadcasterName,videoElement){
        return connectToServer().then( // automatically connect to server if we haven't yet
            ()=>intracomKurentoLib.call(broadcasterName,videoElement)
        )
    }
    function stopBroadcast(){
        return intracomKurentoLib.stopBroadcast();
    }
    function restartBroadcast(){
        return intracomKurentoLib.restartBroadcast();
    }
    function useUserMediaForBroadcast(){
        // TODO
    }
    function clear(){
        return intracomKurentoLib.clear();
    }
    function stopViewingID(id){
        let broadcasterName = $injector.get("WebRTCVideoStreamingService").getStreamName(id);
        console.log("stop viewing",id,broadcasterName);
        return intracomKurentoLib.endCall(broadcasterName);
    }
    function onNumViewers(f){
        return intracomKurentoLib.onNumViewers(f);
    }
    
    return {
        call,
        broadcast,
        stopBroadcast,
        restartBroadcast,
        useUserMediaForBroadcast,
        clear,
        onNumViewers,
        stopViewingID,
        connectToServer,
    }
})