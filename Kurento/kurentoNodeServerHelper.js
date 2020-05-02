
/* global require module */
const kurento = require('kurento-client');
const Servers = require('./Servers.js');

let logE = Servers.logE;
let logENoWebsocket = Servers.logENoWebsocket;
let log = Servers.log;
let logNoWS = Servers.logNoWS;
let sendSafe = Servers.sendSafe;



const Kurento = (()=>{
    let storedKurentoClient = null;
    let storedMediaPipeline = null;
    let storedDispatcher = null;
    let storedComposite = null;

    function getComplexIceCandidate(iceCandidate){
        return kurento.getComplexType('IceCandidate')(iceCandidate); 
    }
    /* Connect to KMS for the first time */
    function getKurentoClient(callback) {
        if (storedKurentoClient !== null) {
            return callback(null, storedKurentoClient);
        }
        Servers.connectToKMS().then(client=>{
            storedKurentoClient = client;
            callback(null,storedKurentoClient);
            /* If the media server crashes or restarts, this will allow us to properly reinstate our connection.
            This is an attempt to fix a response of connection rejected "SyntaxError: Client has been disconnected"
            When trying to establish a new kurentoSession in kurentoNodeUser.js
             https://groups.google.com/forum/#!msg/kurento/jgixOim5hbk/9DV3CySrJwAJ */
            client.on('disconnect', function(e) {
                logE("Connection to KMS has been disconnected.",e);
                kurentoClient = null;
            });
        }).catch(error=>{
            // var message = 'Could not connect to VMS at ' + getConfig().kmsWSURI + ' or ' + getConfig().kmsWSSURI;
            // message +=". Exiting with error " + error;
            // callback(message);
            logE("Could not get Kurento Client",error);
        })
    }

    // Retrieve or create mediaPipeline
    function getMediaPipeline( callback ) {
        if ( storedMediaPipeline !== null ) {
            return callback( null, storedMediaPipeline );
        }
        getKurentoClient(function(error, _kurentoClient) {
            if (error) {
                return callback(error);
            }
            _kurentoClient.create( 'MediaPipeline', function( error, _pipeline ) {
                // console.log("creating MediaPipeline");
                if (error || !_pipeline) {
                    logE("Could not create media pipeline. error:",error);
                    return callback(error);
                }
                storedMediaPipeline = _pipeline;
                callback(null, storedMediaPipeline);
            });
        });
    }


    
    // Retrieve or create dispatcher hub
    function getDispatcher( callback ) {
        if ( storedDispatcher !== null ) {
            return callback( null, storedDispatcher, storedMediaPipeline);
        }
        getMediaPipeline( function( error, _pipeline) {
            if (error) {
                return callback(error);
            }
            _pipeline.create( 'Dispatcher',  function( error, _dispatcher ) {
                // console.log("creating dispatcher");
                if (error || !_dispatcher) {
                    logE("Could not create Dispatcher. error:",error);
                    return callback(error);
                }
                storedDispatcher = _dispatcher;
                callback( null, storedDispatcher, storedMediaPipeline);
            });
        });
    }

    // Retrieve or create composite hub
    function getComposite( callback ) {
        if ( storedComposite !== null ) {
            // console.log("Composer already created");
            return callback( null, storedComposite );
        }
        getMediaPipeline( function( error, _pipeline) {
            if (error) {
                return callback(error);
            }
            _pipeline.create( 'Composite',  function( error, _composite ) {
                // console.log("creating Composite");
                if (error || !_composite) {
                    logE("Could not create Composite. error:",error);
                    return callback(error);
                }
                storedComposite = _composite;
                callback( null, storedComposite );
            });
        });
    }


    // Create a hub port
    function createHubPortFromDispatcher(callback) {
        getDispatcher(function(error, _dispatcher) {
            if (error) {
                return callback(error);
            }
            _dispatcher.createHubPort( function(error, _hubPort) {
                // console.info("Creating hubPort");
                if (error || !_hubPort) {
                    logE("Could not create HubPort from Dispatcher. error:",error);
                    return callback(error);
                }
                callback( null, _hubPort, _dispatcher);
            });
        });
    }

    
    // // Create a hub port
    // function createHubPortFromComposite(callback) {
    //     getComposite(function(error, _composite) {
    //         if (error) {
    //             return callback(error);
    //         }
    //         _composite.createHubPort( function(error, _hubPort) {
    //             console.info("Creating hubPort");
    //             if (error) {
    //                 return callback(error);
    //             }
    //             callback( null, _hubPort, _composite);
    //         });
    //     });
    // }

    function createHubPort(callback){
        return createHubPortFromDispatcher(callback);
    }


    // Create a webRTC end point
    function createWebRtcEndPoint (callback) {
        getMediaPipeline( function( error, _pipeline) {
            if (error) {
                return callback(error);
            }
            _pipeline.create('WebRtcEndpoint',  function( error, _webRtcEndpoint ) {
                // console.info("Creating webrtc endpoint",_webRtcEndpoint);
                if (error || !_webRtcEndpoint) {
                    logE("Could not create WebRTC Endpoint. error:",error);
                    return callback(error);
                }
                callback( null, _webRtcEndpoint );
            });
        });
    }

    function releaseDispatcher(){
        if (storedDispatcher) {
            storedDispatcher.release();
            storedDispatcher = null;
        }
    }

    function releaseMediaPipeline(){
        
        if (storedMediaPipeline) {
            storedMediaPipeline.release();
            storedMediaPipeline = null;
        }
    }
    function releaseComposite(){
        if(storedComposite){
            storedComposite.release();
            storedComposite = null;
        }
    }

    function cleanup(){
        log("Cleaning up VMS objects - dispatcher, mediapipeline, and composite");
        releaseDispatcher();
        releaseMediaPipeline();
        releaseComposite();
    }



    return {
        cleanup,
        getKurentoClient,
        getDispatcher,
        createHubPort,
        createWebRtcEndPoint,
        getComplexIceCandidate
    }
})();

module.exports = Kurento;