/* Kurento Config file looks like this:
{
  "HOSTNAME_FOR_VIDEO_MEDIA_SERVER":"74.208.22.32",
  "IP_PORT_FOR_VIDEO_APPLICATION_SERVER_WSS":8443,
  "IP_PORT_FOR_VIDEO_MEDIA_SERVER_WS":8888,
  "IP_PORT_FOR_VIDEO_MEDIA_SERVER_WSS":8433
}
*/
var fs = require('fs');
const KURENTO_CONFIG_FILE_PATH = './KurentoConfig.json';

let config = {
    knasPath:"/",
    serverOptions:{
        /* Default min and max bandwidth settings. 0 is interpreted as unlimited/unconstrained */
        // const BANDWIDTH_MIN = 0;
        // const BANDWIDTH_MAX = 0;
        key:  fs.readFileSync('keys/server.key'),
        cert: fs.readFileSync('keys/server.crt')
    }
}
function init(){
    loadConfigSync();
}
function loadConfigSync(){
    let rawdata = fs.readFileSync(KURENTO_CONFIG_FILE_PATH);
    Object.assign(config,JSON.parse(rawdata));
    let kmsHostname = config.HOSTNAME_FOR_VIDEO_MEDIA_SERVER;
    let kmsWSPort = config.IP_PORT_FOR_VIDEO_MEDIA_SERVER_WS;
    let kmsWSSPort = config.IP_PORT_FOR_VIDEO_MEDIA_SERVER_WSS;
    let kmsPath = "/kurento";
    let knasPort = config.IP_PORT_FOR_VIDEO_APPLICATION_SERVER_WSS; // port on which to host KNAS WSS
    config.kmsWSURI =  "ws://" +kmsHostname+":"+kmsWSPort + kmsPath;
    config.kmsWSSURI = "wss://"+kmsHostname+":"+kmsWSSPort+ kmsPath;
    config.knasPort = knasPort;
    console.log("config",config);
}

init();
module.exports = config;