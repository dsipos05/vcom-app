/* global app Util */
app.factory("AudioSignalingService",function(AudioWebSocketService,AudioPlayerService){
    const pcConfig = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
    const pcOptions = {
        optional: [
            {DtlsSrtpKeyAgreement: true}
        ]
    }
    const mediaConstraints = {
        'offerToReceiveAudio': true,
        'offerToReceiveVideo': false 
    };
    // Do we need these browser-compatibility checks?
    // const RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    // const RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    // const RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

    let pc; // peerconnection
    let isNegotiating; // workaround for chrome
    let localStream;
    let statusObservable = new Util.Observable();

    function init(){
        initializeVariables();
        AudioWebSocketService.get().obs.message.on(handleFromSocket); // handle responses from server
        Util.beforeUnload(disconnect); // disconnect when we leave the page
    }
    function initializeVariables(){
        isNegotiating = false;
        statusObservable.set("uninitialized");
        localStream = AudioPlayerService.getSilence();
        pc = undefined;
    }
    function connect(){
        loading();
        initiateConnection(); // create connection and send initial message to server
    }

    /* Send data to server */
    function send(data){
        try {
            log("Sending", data);
            AudioWebSocketService.get().send(data);
        } catch (e) {
            logE("Error sending message to server",e);
            fatal();
        }
    }
    /* Receive data from server  */
    function handleFromSocket(data){
        log("Received message from server:",data);
        try{
            var dataJson = JSON.parse(data);
            /* If we receive an answer from our offer, then update our peerconnection obj */
            if(dataJson.type == "answer"){
                pc.setRemoteDescription(new RTCSessionDescription(dataJson)).catch(e=>logE("RemoteSDP Error",e));
            }
            else if(dataJson.type == "offer"){
                logE("Received offer from peer. Not expecting this since we should be initiating the connection.");
            }
            /* Otherwise assume ice candidates */
            else {
                var candidate = new RTCIceCandidate({sdpMLineIndex: dataJson.sdpMLineIndex, candidate: dataJson.candidate});
                pc.addIceCandidate(candidate).catch(e=>logE("Failed to add ICE candidate",e));
            }
        }catch(e){
            logE("could not handle webrtc signaling message from server.",e);
        }
    }


    /* Initiate connection by creating an offer, then sending it */
    function initiateConnection(){
        log("Initiating connection to server.");
        AudioWebSocketService.open().then(()=>{
            createPeerConnection();
            /* Previously, we would call sendOffer here to get things rolling.
            Now when we add the initial silent stream, renegotiation is triggered which results in sendOffer being called. */
        })
    }

    function createPeerConnection() {
        log("Creating new RTCPeerConnection.",pcConfig,pcOptions);
        try {
            if(pc) console.warn("Signaling >> previously existing RTCPeerConnection. Could mean we didn't disconnect properly.");
            pc = new RTCPeerConnection(pcConfig, pcOptions);
            // Typically, this stream starts as silence and will be replaced when a microphone stream is available
            // But if a stream is somehow set before we make our webrtc connection, then we will go ahead and use that stream.
            pc.addStream(localStream); 
            pc.onicecandidate = onIceCandidate;
            // pc.onconnecting = onSessionConnecting;
            // pc.onopen = onSessionOpened;
            pc.onaddstream = onRemoteStreamAdded;
            // pc.onremovestream = ()=>log("remote stream removed");

            /* TODO: Add Chrome-specific renegotiation guard from here https://stackoverflow.com/questions/48963787/failed-to-set-local-answer-sdp-called-in-wrong-state-kstable */ 
            pc.onsignalingstatechange = (e) => {  // Workaround for Chrome: skip nested negotiations
                if(!pc){
                    console.warn("signaling state changed but lost the peerconnection itself",pc);
                    return;
                }
                isNegotiating = (pc.signalingState != "stable");
              }
            pc.onnegotiationneeded = ()=>{
                if (isNegotiating) {
                    log("SKIP nested negotiations");
                    return;
                }
                isNegotiating = true;
                log("Renegotiating.");
                try{
                    sendOffer();
                }catch(e){logE("Error renegotiating",e)}
            }
            pc.onconnectionstatechange = function(event) {
                log("connection state",pc.connectionState,event);
              }
        } 
        catch (e) {
            fatal();
            logE("Failed to create RTCPeerConnection due to exception",e);
        }
    }
    function sendOffer(){
        pc.createOffer(mediaConstraints)
        .then(offer => pc.setLocalDescription(customizeSDPOffer(offer))) // note we are manually modifying the SDP
        .then(() => send(JSON.stringify(pc.localDescription)));
    }

    
    /* End the WebRTC connection. Returns a promise.*/
    function disconnect() {
        log("Disconnecting from server.");
        removeStream();
        if(pc)pc.close();
        closed();
        initializeVariables();

    }
    /* Disconnect and reconnect */
    function refresh(){
        disconnect();
        setTimeout(initiateConnection,1000);
    }


    /* Handlers */
    function onRemoteStreamAdded(event) {
        log("Successfully received stream from server.");
        try{
            playStream(event.stream);
        }catch(e){
            fatal();
            logE("error adding remote stream",e);
        }
    }
    function onIceCandidate(event){
        if (event.candidate) {
            log("ICE Candidate:",event.candidate);
            var candidate = {
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                sdpMid: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            };
            send(JSON.stringify(candidate));
        } else {
            log("End of candidates.");
        }
    }

    /* Manually modify the SDP to set stereo=0 */
    function customizeSDPOffer(sdp){
        // BEFORE                      (1)           (2)
        // ...   a=fmtp:111 minptime=10;useinbandfec=1\r\n            ...
        // ...   a=fmtp:111 minptime=10;useinbandfec=1;stereo=0\r\n   ...
        // AFTER
        let content = sdp.sdp;
        let index1 = content.indexOf("useinbandfec=");
        let index2 = content.indexOf("\r\n",index1); // just in case useinbandfec is not always =1
        let newContent = content.slice(0,index2)+";stereo=0"+content.slice(index2);
        sdp.sdp = newContent
        return sdp;
    }

    const playStream = stream => {
        AudioPlayerService.playStream(stream).then(success);
    }

    /* Remove existing stream and add this new one */
    const setStream = stream => {
        log("setting stream",stream);
        localStream = stream;
        if(pc){
            /* Instead of calling pc.addStream, we replace the tracks */
            replaceStream(stream);
        }
    }
    /* Replaces the tracks of an existing stream with the supplied stream, which doesn't require renegotiation!
    This requires the use of a polyfill for Chrome as of May 2019. */
    const replaceStream = stream => {
        let senders = pc.getSenders();
        senders.map(sender=>{
            let track = stream.getTracks().find(t => t.kind == sender.track.kind);
            sender.replaceTrack(track, stream)
        });
    }
    /* Remove existing stream. If no stream has been added, then do nothing */
    const removeStream = () => {
        if(localStream && pc){
            log("removing stream",localStream);
            pc.removeStream(localStream);
        }
        localStream = undefined;
    }

    /* These functions are shorthand to note that the status has changed */
    const fatal = () => statusObservable.set("failed");
    const closed = () => {statusObservable.set("closed");log("Disconnected from server.")}
    const loading = () => {statusObservable.set("loading");}
    const success = () => statusObservable.set("success");
    /* log normal and error messages */
    function log() {console.log("Signaling >> ",...arguments);}
    function logE(){console.error("Signaling >> ",...arguments);}
    init();
    return {
        connect,
        refresh,
        setStream,
        removeStream,
        onStatusUpdate:statusObservable.on.bind(statusObservable),
        getStatus:statusObservable.get.bind(statusObservable),
        disconnect
    }
})