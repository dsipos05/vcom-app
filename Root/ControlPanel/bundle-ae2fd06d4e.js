window.vcomBuildVersion = '0.5755483383889479';
/* Promise.finally polyfill */
(function () {
    // based on https://github.com/matthew-andrews/Promise.prototype.finally
  
    // Get a handle on the global object
    let globalObject;
    if (typeof global !== 'undefined') {
      globalObject = global;
    } else if (typeof window !== 'undefined' && window.document) {
      globalObject = window;
    }
  
    // check if the implementation is available
    if (typeof Promise.prototype['finally'] === 'function') {
      return;
    }
  
    // implementation
    globalObject.Promise.prototype['finally'] = function (callback) {
      const constructor = this.constructor;
  
      return this.then(function (value) {
        return constructor.resolve(callback()).then(function () {
          return value;
        });
      }, function (reason) {
        return constructor.resolve(callback()).then(function () {
          throw reason;
        });
      });
    };
  }());

 /* Chrome webrtc replaceTrack polyfill from https://jan-ivar.github.io/replacetrack-polyfill/replacetrack-polyfill.js */
  (()=>{
    if (!window.RTCPeerConnection.prototype.getSenders) {
      let orgRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(config) {
        let pc = new orgRTCPeerConnection(config);
        pc._senders = [];
        pc.getSenders = () => pc._senders;
        pc._orgAddStream = pc.addStream;
        pc.addStream = stream => {
          pc._orgAddStream(stream);
          stream.getTracks().forEach(track => pc._senders.push({ track,
            replaceTrack: function (withTrack, stream) {
              return new Promise(resolve => {
                stream.removeTrack(track);
                stream.addTrack(withTrack);
                let onn = pc.onnegotiationneeded;
                pc.onnegotiationneeded = null;
                pc.removeStream(stream);
                pc._orgAddStream(stream);
                if (onn) {
                  Promise.resolve().then(onn);
                  pc.addEventListener("signalingstatechange", function listener() {
                    if (pc.signalingState != "stable") return;
                    pc.removeEventListener("signalingstatechange", listener);
                    pc.onnegotiationneeded = onn;
                    resolve();
                  });
                }
              });
            }
          }));
        };
        return pc;
      }
    }
  })();


/* Mobile CSS vh units that don't count nav bars */
  (function(){

    // alert("polyfill js");
    // from https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
    // keeps up-to-date a custom css variable "--vh" that accounts for mobile browser bars that take up vertical space
    function updateCustomVH(){
      let vh = window.innerHeight * 0.01;
      console.log("update custom VH",vh,"px");
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    };
    window.addEventListener('resize',updateCustomVH);
    updateCustomVH();

  })();

const Sorting = (()=>{
    /* Comparators as used by ag-grid are called with the following parameters:
        left value
        right value
        left node
        right node
        isInverted

        So far, there is no need to evaluate the nodes, so in this file they are unused parameters,
        unused parameters are marked as _ and __ as you can see in the below comparators */

/* Functions to aid in the creation and manipulation of comparators */
    /* Run of the mill comparator! */
    const basicComparator = (l,r) => {
        if(l<r) return -1;
        if(l>r) return  1;
        return 0;
    }

    /* A comparator that will correctly handle strings that represent numbers */
    const genericComparator = (l,r) => {
        if(typeof(l) === "string" && typeof(r) === "string"){
            /* If both items are strings that look like numbers, then compare them like numbers */
            if(looksLikeANumber(l) && looksLikeANumber(r)){
                return basicComparator(parseFloat(l),parseFloat(r));
            }
            /* if they are both strings, use the built-in localeCompare method */
            else return l.localeCompare(r);
        }
        else{
            return basicComparator(l,r);
        }
    }

    /* Before performing comparisons with the given comparator, perform the conversion on each value to be compared.
    Example: addConversion(Math.abs,basicComparator) would give a comparator for the magnitude of numbers */
    const addConversion = (conversion,comparator) => {
        return (l,r) => {
            l = conversion(l);
            r = conversion(r);
            return comparator(l,r);
        }
    }

    /* After performing the comparison, return the opposite value.
    Example: invert(basicComparator) would give a comparator that sorts by reverse alphabetical order */
    const invert = (comparator) => {
        return (l,r) => {
            return -comparator(l,r);
        }
    }

    /* take in a comparator and before doing the comparison, make all the requisite checks
    for undefined or null values. This way we don't have to manually write those checks
    at the beginning of every other comparator.
    You can specify additional bad values that should be treated the same as undefined */
    const protectComparator = (comp,badValues) =>{
        return (l,r,_,__,isInverted)=>{
            // check for undefined, null, empty string, NaN (the only value that isn't equal to itself), or anything in the optional array 'badValues'
            let lNull = (l === undefined || l === null || l === "" || l!==l || (badValues && badValues.includes(l)));
            let rNull = (r === undefined || r === null || r === "" || r!==r || (badValues && badValues.includes(r)));
            let badLocation = 1; // count bad stuff as 'greater' (end of list)
            if(isInverted) badLocation = -1; // count bad stuff as 'lesser' (end of list is now lesser, because we are inverted)
            if( lNull && rNull ) return 0;
            if( lNull ) return badLocation;
            if( rNull ) return -badLocation;
            return comp(l,r);
        }
    }

    /* instead of comparing two values, compare two arrays of values by zipping them together
    and comparing pairs of elements from the two arrays.
    Later elements in the array break ties for earlier elements in the array.
    
    For example, comparing [1,2,3,4] vs [1,2,4,1] would give comparisons of [0,0,-1,1] and we would take
    the first nonzero comparison, -1, as the result, so these two arrays are in the correct order.*/
    const arrayify = comp => {
        return (lArray,rArray) => {
            if(Array.isArray(lArray) && Array.isArray(rArray) && lArray.length == rArray.length){
                let zippedComparisons = lArray.map((l,i)=>{ // array like [0,0,1,-1] of comparison results
                    let r = rArray[i];
                    return comp(l,r);
                });
                return zippedComparisons.find(compared => { // return the first nonzero value in the above array
                    return compared != 0
                }) || 0; // return 0 if no nonzero value is found in the array
            }
            else{ // We either aren't comparing arrays or they have different lengths.
                return 0;
            }
        }
    }

/* Client Statistics sorting */
    /* Here are some conversions used for sorting on the Client Statistics page */
    const looksLikeANumber = str => {
        /* 
            Number(' ') => 0
            parseFloat(' ') => NaN
            Number('8/17/18') => NaN
            parseFloat('8/17/18') => 8
        */
        if(isNaN(Number(str))) return false;
        if(isNaN(parseFloat(str))) return false;
        /* neither one is giving us NaN, so we're probably good! */
        return true;
    }
    const dateTimeToMilliseconds = dateStr => {
        let date = new Date(dateStr);
        return date.getTime();
    }
    const ipAddressToNumbers = ip => {
        return ip.split('.').map(parseInt);
    }
    const durationToSeconds = duration => {
        /* durations look like....
        973d, 22h, 21m
        8m, 47s
        8d, 21h, 19m
        1h, 12m */
        // if(!duration || typeof duration != "string") return 0;
        let array = duration.split(", ");
        let durationObj = {
            d:0,
            h:0,
            m:0,
            s:0
        }
        array.forEach(item=>{
            let lastChar = item[item.length-1];
            durationObj[lastChar] = parseInt(item.slice(0,-1));
        })
        return 86400 * durationObj.d + 3600 * durationObj.h + 60 * durationObj.m + durationObj.s;
    };
    const versionStringToNumbers = version => {
        /* versions look like ...
        4.3.2-2 (iOS)
        4.4.0-10 (Windows x86)
        4.4.2-6 (Droid)
        n/a
        n/a
        */
       if(version == undefined || version == null || !version.indexOf(" ")) return [];
       if(version == "n/a") return "n/a";
       let numberString = version.split(" ")[0]; // just the 4.3.2-2 part
       let array = numberString.split(/[.-]/); // [4,3,2,2]
       let numArray = array.map(item=>parseInt(item,10)); // for some reason these were being interpreted as binary
       return numArray;
    }
    const cpuStringToNumber = cpuString => {
        /* cpu string looks like ...
        9% (1%)
        43%
        11% (2%)
        6%
        */
        return parseInt(cpuString.split("%")[0]); // the first bit before the first % sign
    }
    const boa = arrayify(basicComparator); // just basic comparisons over an array
    /* Client Statistics page comparators */
    const ipAddressComparator = protectComparator(addConversion(ipAddressToNumbers,boa));
    const durationComparator = protectComparator(addConversion(durationToSeconds,basicComparator));
    const versionComparator = protectComparator(addConversion(versionStringToNumbers,boa));
    const cpuComparator = protectComparator(addConversion(cpuStringToNumber,basicComparator));
    /* Activity Log page comparators */
    const dateComparator = protectComparator(addConversion(dateTimeToMilliseconds,basicComparator))

/* Client Comparator 
    In LabelStorageService, the labels we receive from the server are sorted using this comparator
    before they are put in the grid, so that with no sorting applied they are sorted by this comparator. */
    const typeOrder = {
        "VCP":0,
        "VDI":1,
        "SIP":2,
        "RTSP":3,
        "P2P":4,
        "PL":5,
        "FG":6
    }
    /* sorts clients by their LABEL_TYPE_PREFIX property, according to the ordering above */
    const toTypeOrder = label => typeOrder[label.LABEL_TYPE_PREFIX]; 
    const typeComparator = protectComparator(addConversion(toTypeOrder,basicComparator));
    /* sorts clients by their LABEL_NAME property, ignoring case */
    const toNameCaseInsensitive = label => (label.LABEL_NAME ||"").toLowerCase()
    const nameComparator = protectComparator(addConversion(toNameCaseInsensitive,basicComparator))
    /* sorts clients by system type, system name, client type, then label name */
    const clientComparator = protectComparator(mergeComparators(["LABEL_SYSTEM_TYPE","LABEL_SYSTEM_NAME",typeComparator,nameComparator]));
    /* for client statistics rows */
    const toOnlineState = label => label.state;
    const clientStatisticsRowComparator =  protectComparator(invert(addConversion(toOnlineState,basicComparator)))
/* Other helpful functions to expose */
    /* compare objects by a chosen property on those objects */
    function getComparatorByProperty(propertyName){
        return protectComparator(addConversion(i=>i[propertyName],genericComparator))
    }

    /* Takes an array of comparators and returns one comparator that combines them all.
    If the first comparator returns 0, then the next comparator will be used, until all are exhausted.
    As an additional feature, your array of comparators can also contain a string, rather than a comparator.
    That string will be converted to a comparator that treats that string as the property name that you'd like to sort by.
    */
    function mergeComparators(comparators){
        /* convert any strings to their own comparators */
        comparators = comparators.map(sort=>{
            if(typeof sort == "string"){ // sort by this prop
                return getComparatorByProperty(sort);
            }
            if(typeof sort == "function"){ // should already be a comparator
                return sort;
            }
        })
        /* merge all the comparators */
        let merged = (a,b) => {
            for( let i = 0; i < comparators.length; ++i){
                let c = comparators[i](a,b);
                if(c) return c; // we got a 1 or -1, we can stop;
                // otherwise, continue to the next comparator in the list
            }
            return 0; // all comparators returned 0
        }
        return merged;
    }

    
    /* finds the appropriate location in a sorted array for a new item, based on a comparator */
    const findInsertionSortIndex = (arr,item,comparator) =>{
        let len = arr.length;
        let i = 0;
        while(i < len){
            // will be inserted before the first item tied or ranked later than it.
            // if this item is already in the list, i will match the index of the item
            if(comparator(item,arr[i]) < 1){
                return i;
            }
            ++i;
        }
        return i;
    };

    /* This is used as the default comparator for ag-grid */
    const genericComparison = protectComparator(genericComparator);

    return {
        getComparatorByProperty,
        clientStatisticsRowComparator,
        genericComparison:genericComparison,
        clientComparator:clientComparator,
        ipAddressComparator:ipAddressComparator,
        durationComparator:durationComparator,
        versionComparator:versionComparator,
        dateComparator:dateComparator,
        cpuComparator:cpuComparator,
        findInsertionSortIndex:findInsertionSortIndex
    }
})();
/* global $ angular */
var Util = (()=>{
    const urlContains = str => {
        const urlStr = location.origin + ""; // convert from DOMString;
        const contained = urlStr.includes(str);
        return contained;
    }
    const isOnGithub = () => urlContains("stevenlove.github.io");
    const isNgrok = () => urlContains(".ngrok.io");
    const baseURL = isOnGithub()?"VCOM_Web":""; // base url should not have trailing '/'. will be prepended to absolute URLs
    const animationMap = {};
    const getDefaultHost = () => {
        const PRIMARY_HOST = location.origin;
        /* get environment variables */
        var env = {};
        if(window){  
            Object.assign(env, window.__env);
        }
        var host;
        /* determine which API we'll use */

        if(env.hosts == undefined){ // in case something is wrong with the env.js file, don't bother trying to access it
            host = PRIMARY_HOST
        }
        else if(isOnGithub()){
            host = env.hosts.github;
        }
        else if(isNgrok()){
            host = env.hosts.ngrok;
        }
        else if(env.environment == "development"){
            let port = parseInt(location.port);
            if(env.hosts[port]){
                host = env.hosts[port]
            }
            else{
                host = PRIMARY_HOST;
            }
        }
        else{
            host = PRIMARY_HOST;
        }
        return host;
    };
    let currentHost = getDefaultHost();
    console.log("default host",currentHost);
    const getHost = () => currentHost;

return {
	getWebApiEndpoint: function(action) {
        return getHost() + "/api/v1" + action;
    },
    getHost:getHost,
    getDefaultHost:getDefaultHost,
    setHost: function(newHost){
        console.log("set host",newHost);
        currentHost = newHost;
    },
    setHostname: function(newHostname){
        this.setHost("http://"+newHostname);
    },
    replaceHost: function(url,newHost){
        const oldHost = url;
        let path;
        let regex = /([^\/]*\/[^\/]*\/[^\/]*\/)/; // all the text up through the third slash (/)
        let oldNonHostPart = url.replace(regex,"");
        let newURL = newHost+"/"+oldNonHostPart;
        console.log("url,newHost,newURL",url,newHost,newURL);
        return newURL;
    },
    getSystemStatusRefreshInterval: function() {
        /*
         * This is the data refresh interval for the
         * System Status screen
         * The value is in milliseconds
         */
        return 1000;  
    },
    getClientStatisticsRefreshInterval: function() {
        /*
         * This is the data refresh interval for the
         * Client Statistics screen
         * The value is in milliseconds
         */
        return 1000;  
    },
    getSIPRegistrationsInterval: function() {
        /*
         * This is the data refresh interval for the
         * SIP Registrations screen
         * The value is in milliseconds
         */
        return 1000;  
    },
    getActivityLogRefreshInterval: function() {
        /*
         * This is the data refresh interval for the
         * Activity Log screen
         * The value is in milliseconds
         */
        return 1000;  
    },
    getDebugLogRefreshInterval: function() {
        /*
         * This is the data refresh interval for the
         * Debug Log screen
         * The value is in milliseconds
         */
        return 1000;  
    },
    getNotificationTimeout: function() {
        /*
         * Timeout for Notifications
         * After this value expires, the existing notification will be closed
         * The value is in milliseconds
         * 
         * Set to 0 for no timeout - displays the message until the user closes the message
         * or a new meesage overwrites the existing message
         */
        return 30000;  
    },
    getAPIRequestTimeout: function(){
        /*
         * Timeout for HTTP requests
         * If an API request has not gotten a response after this much time, then consider it failed
         * The value is in milliseconds
         */
        return 60000; // 1 minute
    },
    getAPIRequestExtendedTimeout: function(){
        /*
         * Timeout for HTTP requests that we expect to take longer
         * The value is in milliseconds
         */
        return 120000; // 2 minutes
    },
    getKeepaliveInterval: function() {
        /*
         * If a user doesn't communicate with the server for a minute they are disconnected
         * So pages that need to can use this interval to keep their connection alive
         * The value is in milliseconds
         */
        return 1000; // 1 second
    },
    getTelephoneStatusRefreshInterval: function() {
        /*
         * This is the status refresh interval for the
         * Telephone Interface
         * The value is in milliseconds
         */
        return 1000;
    },
    getLevelDecibelRange: function() {
        /*
         * The minimum and maximum dB values of levels retrieved from the server
         */
        return {
            min:-100, // dB
            max:0 // dB
        }
    },
	multiSelectStringify: function(data) {
		/*
		 * Convert Multiple select2 data array to comma delimited string
		 */
		if(data != undefined) {
			var str = '';
			$.each(data, function(index, value) {
				str += val.id;
				if( (index+1) != data.length ) str += ',';
			});
			
			return str;
		} else {
			return '';
		}
	},
	roundUpDecimal: function(origValue, decimal) {
		var pow10 = Math.pow(10, decimals);
		var result = Math.round(origVal * pow10)/pow10;
		
		return result;
    },
    capitalize: function(str){
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
	getFloat: function(val) {
		if(isNaN(parseFloat(val))) {
			return 0;
		} else {
			return parseFloat(val);
		}
	},
	getTrueMonth: function(m) {
		var month = new Array();
		month[0] = ['1', 'January'];
		month[1] = ['2', 'February'];
		month[2] = ['3', "March"];
		month[3] = ['4', "April"];
		month[4] = ['5', "May"];
		month[5] = ['6', "June"];
		month[6] = ['7', "July"];
		month[7] = ['8', "August"];
		month[8] = ['9', "September"];
		month[9] = ['10', "October"];
		month[10] = ['11', "November"];
		month[11] = ['12', "December"];
		//var n = month[d.getMonth()];
		return month[m];
	},
	getStates: function() {
		return [ { state : 'ALABAMA', abbr : 'AL'},{ state : 'ALASKA',abbr : 'AK'},{ state : 'ARIZONA',abbr : 'AZ'},{ state : 'ARKANSAS',abbr : 'AR'},{ state : 'CALIFORNIA',abbr : 'CA'},{ state : 'COLORADO',abbr : 'CO'},{ state : 'CONNECTICUT',abbr : 'CT'},{ state : 'DELAWARE',abbr : 'DE'},{ state : 'FLORIDA',abbr : 'FL'},{ state : 'GEORGIA',abbr : 'GA'},{ state : 'HAWAII',abbr : 'HI'},{ state : 'IDAHO',abbr : 'ID'},{ state : 'ILLINOIS',abbr : 'IL'},{ state : 'INDIANA',abbr : 'IN'},{ state : 'IOWA',abbr : 'IA'},{ state : 'KANSAS',abbr : 'KS'},{ state : 'KENTUCKY',abbr : 'KY'},{ state : 'LOUISIANA',abbr : 'LA'},{ state : 'MAINE',abbr : 'ME'},{ state : 'MARYLAND',abbr : 'MD'},{ state : 'MASSACHUSETTS',abbr : 'MA'},{ state : 'MICHIGAN',abbr : 'MI'},{ state : 'MINNESOTA',abbr : 'MN'},{ state : 'MISSISSIPPI',abbr : 'MS'},{ state : 'MISSOURI',abbr : 'MO'},{ state : 'MONTANA',abbr : 'MT'},{ state : 'NEBRASKA',abbr : 'NE'},{ state : 'NEVADA',abbr : 'NV'},{ state : 'NEW HAMPSHIRE',abbr : 'NH'},{ state : 'NEW JERSEY',abbr : 'NJ'},{ state : 'NEW MEXICO',abbr : 'NM'},{ state : 'NEW YORK',abbr : 'NY'},{ state : 'NORTH CAROLINA',abbr : 'NC'},{ state : 'NORTH DAKOTA',abbr : 'ND'},{ state : 'OHIO',abbr : 'OH'},{ state : 'OKLAHOMA',abbr : 'OK'},{ state : 'OREGON',abbr : 'OR'},{ state : 'PENNSYLVANIA',abbr : 'PA'},{ state : 'RHODE ISLAND',abbr : 'RI'},{ state : 'SOUTH CAROLINA',abbr : 'SC'},{ state : 'SOUTH DAKOTA',abbr : 'SD'},{ state : 'TENNESSEE',abbr : 'TN'},{ state : 'TEXAS',abbr : 'TX'},{ state : 'UTAH',abbr : 'UT'},{ state : 'VERMONT',abbr : 'VT'},{ state : 'VIRGINIA',abbr : 'VA'},{ state : 'WASHINGTON',abbr : 'WA'},{ state : 'WEST VIRGINIA',abbr : 'WV'},{ state : 'WISCONSIN',abbr : 'WI'},{ state : 'WYOMING',abbr : 'WY' } ];
	},
	getStateObj: function(abbr) {
		var stateObj = { state: '', abbr: '' };
		if(abbr != undefined && abbr != '') {
			var states = Util.getStates();
			angular.forEach(states, function(value, key) {
				if(value.abbr == abbr) {
					stateObj = value;
				}
			});
		}
		
		return stateObj;
	},
    generateUUID: function() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    },
    checkForDebug: function() {
        /*
         * Checks query params in the URL for debug mode
         * Used on Logon/authentication to tell the server we are in debug mode
         */
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == 'debug') {
                //return decodeURIComponent(pair[1]);
                return true;
            }
        }
        return false;
    },
    buildLabelTypes: function() {
        var labelTypes = [];
        labelTypes.push({
            value: 'TELEX_PORT',
            label: 'RTS Port'
        });
        labelTypes.push({
            value: 'TELEX_PARTY_LINE',
            label: 'RTS Partyline'
        });
        labelTypes.push({
            value: 'TELEX_IFB',
            label: 'RTS IFB'              
        });
        labelTypes.push({
            value: 'TELEX_SPECIAL_LISTS',
            label: 'RTS Special List'
        });
        labelTypes.push({
            value: 'TELEX_RELAYS',
            label: 'RTS Relay'
        });
        labelTypes.push({
            value: 'TELEX_ISOS',
            label: 'RTS ISO'
        });
        labelTypes.push({
            value: 'TELEX_UPL_RESOURCES',
            label: 'RTS URL Resources'
        });
        labelTypes.push({
            value: 'TELEX_IFB_SPECIAL_LISTS',
            label: 'RTS IFB Special List'
        });
        labelTypes.push({
            value: 'TELEX_IFB_WITH_AUTO',
            label: 'RTS IFB with Auto-Table'
        });
        return labelTypes;
    },
    autoFailBackOptions: function() {
        var options = [];
        options.push({
            label: 'Never. Failback done manually',
            value: 'Disabled'
        });
        options.push({
            label: 'After Primary restored for the specified amount of time',
            value: 'Relative'
        });
        options.push({
            label: 'At the specified time of day',
            value: 'Fixed'
        });
        return options;
    }, 
    objectToArray: function(obj) {
        /*
         * Takes an object and brekas all elements out
         * and puts them in a key/value array
         */
        var array = [];
        var keys = Object.keys(obj);
        angular.forEach(keys, function(keyValue, idx) {
            var item = {
                label: obj[keyValue],
                value: keyValue
            };
            array.push(item);
        });
        return array;
    },
    findElementWithProperty: function(array,propertyName,propertyValue){
        /* Helps to look through a dropdown-style array
            [
                {value:blah,label:blah},
                {value:blah2,label:blah2},
                ...
            ]
            and find an element based on its value or by its label
        */
       if(!Array.isArray(array)) return undefined;
       return array.find(element=>element[propertyName] === propertyValue);
    },
    negateOnOff: function(input){
        if(input == "ON") return "OFF";
        if(input == "OFF") return "ON";
        /* If input was undefined or anything else, treat that as OFF, and return ON */
        return "ON";
    },
    /* To make it easier to fire events when a file is chosen on a <input type='file'> element */
    onFileChosen: function($fileElement,func){
        /* resets the value to address navigating away from the page
        and choosing to upload the same file */
        $fileElement.on('click touchstart' , function(){
            $(this).val('');
        });

        // Trigger now when you have selected any file
        $fileElement.on("change",func);
    },
    getEnvironmentVariables: function(){
        var env = {};
        Object.assign(env,window.__env);
        return env;
    },
    /* makes a new simple cache that can be used to store data.
     Try not to create a memory leak here */
    Cache: function(){
        var __cache = {};
        const clear = () => {
            __cache = {};
        }
        const get = key => {
            return __cache[key];
        }
        const add = (key,val) => {
            __cache[key] = val;
        }
        return {
            add:add,
            set:add,
            clear:clear,
            get:get
        }
    },
    /* Access properties of an object, 
    but return undefined instead of throwing an error if a property is missing */
    getPropertySafe: function(){
        let args = Array.from(arguments);
        let obj = args.shift();
        let result = args.reduce((acc,curr)=>{
            if(acc == undefined || curr == undefined){
                return undefined;
            }
            else{
                return acc[curr];
            }
        },obj)
        return result;
    },
    deepCopy:obj=>{
        return angular.copy(obj);
    },
    /* Set a deep property on an object like obj.child.childOfChild.prop = true;
        and create intermediate properties if they don't exist. So if obj started off as {}, it would come out as
        {
            child:{
                childOfChild{
                    prop: true
                }
            }
        }
    */
    setSafe: function(obj,propName,propValue){
        let args = Array.from(arguments);
        if(args.length <  3) return;
        if(args.length == 3){
            obj[propName] = propValue;
        }
        if(args.length > 3){
            if(obj[propName] == undefined){
                obj[propName] = {};
            }
            // now obj[propName] becomse the base object
            // and the remaining args are all shifted up one.
            return this.setSafe(obj[propName],...args.slice(2));
        }
    },
    objToMultilineString: function(obj){
        const keyValPairs = Object.keys(obj).map(key=>{
            return(key+":"+Util.ensureString(obj[key]));
        })
        return "{\n"+keyValPairs.join("\n")+"\n}";
    },
    /* Input a query selector for an <input> element
    returns a boolean that is true IFF the element has been autofilled
    though we may not know the actual value that the element has been filled with */
    hasAutofill:(selector) => {
        var hasValue = $(selector).val().length > 0;//Normal
        if(!hasValue){
            hasValue = $(selector+":-webkit-autofill").length > 0;//Chrome
        }
        return hasValue; 
    },
    disableContextMenu:element=>{
        element.oncontextmenu = function(event) {
            event.preventDefault();
            event.stopPropagation();
            return false;
       };
    },
    waitForElement: (selector,period) => {
        return Util.timeoutPromise(new Promise((resolve,reject)=>{
            if($(selector).length > 0){
                resolve($(selector));
                return;
            }
            if(!period)period = 100; //ms
            let handle = window.setInterval(()=>{
                if($(selector).length > 0){
                    window.clearInterval(handle);
                    resolve($(selector));
                }
            },period)
        }),10000);
    },
    wait: ms => {
        return new Promise((resolve,reject)=>{
            setTimeout(resolve,ms);
        })
    },
    // Waiter:(()=>{
    //     let obs = Util.Observable(false);
    //     function on(f){
    //         if(obs.get()){
    //             f();
    //         }
    //         obs.onChange(f)
    //     }
    //     function notify(){
    //         obs.set(true);
    //     }
    //     return {
    //         on,
    //         notify
    //     }
    // }),
    timeoutPromise:(promise,ms)=>{
        if(ms == undefined)ms=0;
        let handle;
        let clear = () => {
            if(handle){
                clearTimeout(handle);
            }
        }
        return new Promise((res,rej)=>{
            promise.then(res,rej);
            promise.finally(clear);
            handle = setTimeout(rej,ms);
        })
      },
    loadScript: url => {
        return new Promise((resolve,reject)=>{
            $.ajax({
                url: url,
                dataType: 'script',
                success: resolve,
                async: true
            }).fail(reject)
        })
    },
    scrollTo: (selector,hostSelector) => {
        let hostElement;
        if(hostSelector){
            hostElement = $(hostSelector);
        }
        else{
            hostElement = $('html,body');
        }
        hostElement.animate({scrollTop: $(selector).first().offset().top }, "slow");
    },
    startsWithPound: val => typeof(val) == "string" && val.indexOf("#") == 0,
    startsWith: (str, startVal) => {
        return typeof(str) == "string" &&
        typeof(startVal) == "string" &&
        str.indexOf(startVal) == 0;
    },
    endsWith: (str,endVal) => {
        return typeof(str) == "string" && 
        typeof(endVal) == "string" && 
        str.lastIndexOf(endVal) == (str.length - endVal.length) && 
        str.length > endVal.length // necessary or else endsWith('hi','bro') is true as the -1 value for lastIndexOf is 2-3
    },

    removeFirstChar: val => val.slice(1),
    /* Like Array.prototype.map, the function takes 3 arguments.
    1) the current character in the iteration
    2) the index of the character
    3) the string being iterated over
    The function is called with these arguments and returns a string (probably just a character)
    These strings are all joined up and returned together */
    stringMap: function(str,f){
        let replacement = "";
        for(let i = 0; i < str.length; ++i){
            replacement += f(str.charAt(i),i,str);
        }
        return replacement;
    },
    simplifyUnicode: function(str){
        return Util.stringMap(str,char=>{
            let code = char.charCodeAt(0);
            const fullwidthExclamationMarkCode = 65281;
            const fullwidthTildeCode = 65374;
            const diff = fullwidthTildeCode - '~'.charCodeAt(0);
            if(code >= fullwidthExclamationMarkCode && code <= fullwidthTildeCode){
                code -= diff;
                return String.fromCharCode(code);
            }
            else{
                return char;
            }
        })
    },
    debounce: (f,delay) => {
        let inProgress = false;
        let handle;
        let alteredF = (arg1) => {
            inProgress = false;
            return f(arg1);
        }
        return (arg1,arg2) => {
            if(arg2){
                console.warn("Util.debounce only supports one argument right now, and you've supplied at least two!");
            }
            if(inProgress){
                clearTimeout(handle);
            }
            return new Promise((resolve,reject)=>{
                handle = setTimeout(()=>{
                    resolve(alteredF(arg1))
                },delay)
                inProgress = true;
            })
        }
    },
    clamp:(n,min,max) => {
        if(n>max)return max;
        if(n<min)return min;
        return n;
    },
    exists: x => {
        return x != undefined && x != null && x != "";
    },
    /* combs through an array of objects and looks at one property on those objects.
    returns an array of the unique values of that property over the entire array */
    uniquePropertyValues: (array,propertyName) => {
        let properties = array.map(c=>c[propertyName]);
        return Util.removeDuplicates(properties);
        // return Object.keys(
        //     array.map(c=>c[propertyName]) // strip away everything other than the property we care about
        //     .reduce(
        //         (acc,curr)=>{ // curr will be the value of the property
        //             acc[curr] = true; // setting acc[curr] to true ensures that curr will show up in Object.keys
        //             return acc; // standard for reduce, you need to return the accumulator
        //         },
        //         {} // accumulator starts as an empty object
        //     )
        // )
    },
    scaleToRange: (value,rangeMin,rangeMax) => {
        const total = rangeMax-rangeMin;//[xxxx|xxxxxxxx]
        const portion = value-rangeMin; //[xxxx|        ]
        return portion/total; // a value between 0 and 1 (if value is between rangeMin and rangeMax)
    },
    isNonEmptyArray: val => {
        return Array.isArray(val) && val.length > 0;
    },
    isNonEmptyString: str => {
        return typeof str == "string" && str.length > 0;
    },
    /* Returns an array that has no shallow duplicates */
    removeDuplicates: arr => {
        let map = {};
        /* We have to do some finagling here. In order to properly get undefined as an element of the returned array, we can't
        treat it like other values. map[undefined] = true will set map["undefined"] = true, and so it would be
        indistinguishable from having the actual string "undefined" in the array.*/
        let specialCases = []; // we use an array to keep track of special cases like undefined
        arr.forEach(item=>{
            let test = {};
            test[item] = true;
            let afterKeyifying = Object.keys(test)[0];
            if(afterKeyifying !== item){ // in the case of undefined, this compares undefined with "undefined" and realizes that using the technique of map[item] = true would change the value
                if(specialCases.findIndex(spec => spec === item) === -1){ // so if it isn't already in special cases
                    specialCases.push(item); // then we add it
                }
            }
            else{ // else it is not a special case so we can use the map[item] = true technique.
                map[item] = true;
            }
        });
        return Object.keys(map).concat(specialCases); // make sure to add the special cases onto the end.
    },
    /* Saves data to your downloads folder
        arguments: (filename, data) 
        data is a blob
    */
    storeBlob: (()=>{
        /* Attempting to save multiple files too quickly can prevent files from being saved.
        So we make a queue, and every time this fn is called, we add the task to the queue.
        Periodically process an item from the queue until we are done
        */
        const processDelay = 200; // ms
        let fileQueue = [];
        let intervalHandle;

        const startProcessing = () => {
            if(!intervalHandle)intervalHandle = setInterval(processNextFile,processDelay);
        }

        const downloadBlob = (blob,name) => {
            let a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none"; // invisible <a> element
            let url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = name;
            a.click(); // trigger download
            window.URL.revokeObjectURL(url);
        }

        const processNextFile = () => {
            if(fileQueue.length > 0){
                let file = fileQueue.shift();
                let blob = new Blob([file.data], {type: "octet/stream"});
                downloadBlob(blob,file.filename);
            }
            else{
                // queue is empty, done processing
                clearInterval(intervalHandle);
                intervalHandle = undefined;
            }
        }
        return (filename,data) => {
            fileQueue.push({filename:filename,data:data});
            if(!intervalHandle)startProcessing();
        }
    })(),
    /* this version of modulus works for negative numbers 
    myMod(-1,16) = 15 whereas -1%16 = -1 */
    myMod: (value,modulus) => {
        return ((value%modulus)+modulus)%modulus;
    },
    isOnGithub:isOnGithub,
    indexOfNth: (str,searchTerm,n) => {
        let index = str.indexOf(searchTerm);
        if(n>1){
            if(index > -1){
                return index + 1 + Util.indexOfNth(str.slice(index+1),searchTerm,n-1);
            }
            else{
                return index;
            }
        }
        else if (n<1){ // what is the index of the 0th 'z' in the string "blahblah"? ... 0?
            return 0; 
        }
        else{ // n == 1
            return index;
        }
    },

    /*
    result.headers(Content-Type) looks like this...

    multipart/mixed;boundary=***_Multipart-Boundary-Delimiter_***

    result.data looks like this...

    --***_Multipart-Boundary-Delimiter_***
    Content-Type: application/json;charset=utf-8

    [
    {
    "REQUESTED_START_POSITION":2,
    "RETRIEVED_START_POSITION":73010470,
    "RETRIEVED_END_POSITION":74860580,
    "SEGMENT_START_POSITION":73010470,
    "SEGMENT_END_POSITION":73020470
    }]

    --***_Multipart-Boundary-Delimiter_***
    Content-Type: text/plain;charset=utf-8

    3/18 10:19:12 - [8001]: SIP Invite Session failed ... Response code: 486, Reason: Busy Here
    04/23/18 10:19:13 - [8001]: SIP Invite Session failed ... Response code: 486, Reason: Busy Here
    .
    .
    .
    04/23/18 10:20:07 - [8001]: SIP Invite Session failed ... Response code: 486, Reason: Busy Here
    04/23
    --***_Multipart-Boundary-Delimiter_***--

    */


    /* Input is the result of an http request 
       Output is the multipart boundary */
    getMultipartBoundary: result => {
        let boundary = undefined;
        try{
            let headerItems = result.headers('Content-Type').split(';');
            let boundaryItem = headerItems.find(item=>{
                return item.indexOf("boundary=") == 0; // starts with 'boundary='
            })
            boundary = boundaryItem.slice('boundary='.length);
        }
        catch(error){
            console.error("error trying to get multipart boundary",error);
        }
        return boundary;
    },
    /* Input is the result of an http request and
       the content type that you are looking for ("application/json","text/plain",...)
       and whether or not to leave the content untrimmed (look at next fn for info on trimming)
       Output is the contents of that type */
    getMultipartContent: (result,contentType) => {
        let boundary = Util.getMultipartBoundary(result);
        boundary = "--" + boundary; // The boundary that you define is prefixed by two hyphens in the response. Just how the protocol is; don't ask.
        let contentArray = result.data.split(boundary);
        let foundContent = contentArray.find(content=>{
            let result = content.includes("Content-Type: "+contentType);
            return result;
        })
        return Util.trimMultipartContent(foundContent);
    },
    /* Input is the multipart content (as gotten from the above fn)
       Output is the same content, trimmed.
       The trimming involves removing the line that describes the type of the content. It looks like this...
       "Content-Type: application/json;charset=utf-8"
       Additionally, the newlines surrounding the content are removed.
       And any newlines phrased as '\r\n' are converted to just '\n'
    */
    trimMultipartContent: content => {
        content = content.replace(/Content-Type.*/,"")
        let beginIndex = 4; // remove leading \r\n\r\n
        let endIndex = content.length - 2; // remove trailing \r\n
        let retval = content.slice(beginIndex,endIndex);
        return retval;
    },
    replaceUnprintableWith: (str,replacement) => {
        return str.replace(/[^ -~]/,replacement);
    },
    withoutUnprintables: str => {
        return Util.replaceUnprintableWith(str,"");
    },
    repeater:(func,intervalTime,callImmediately)=>{
        if(!intervalTime){
            return console.error("tried to make a repeater with no intervalTime");
        }
        var handle;
        var on = false;
        const start = function(){
            if(on)return;
            // call the function periodically after intervalTime
            handle = setInterval(func,intervalTime);
            on = true;
            // call the function immediately
            if(callImmediately)func();
        }
        const stop = function(){
            if(!on)return;
            clearInterval(handle);
            on = false;
        }
        const destroyWithScope = scope => {
            scope.$on("$destroy",stop);
        }
        return({
            start:start,
            destroyWithScope:destroyWithScope,
            stop:stop
        })
    },
    repeaterWithHold:(funcToRepeat,intervalTime) => {
        let isHeld = false;
        let callWaiting = false;
        let holdForHandle;
        const wrappedFunc = () => {
            if(isHeld){
                callWaiting = true; // make note that a call was delayed due to holding
            }
            else{ // call function normally
                funcToRepeat();
            }
        }
        let repeater = Util.repeater(wrappedFunc,intervalTime);

        /* Don't allow any invocation of the function until we resume */
        repeater.hold = () => {
            isHeld = true;
        }
        /* Instead of holding indefinitely, hold for a period of time */
        repeater.holdFor = holdTime => {
            repeater.hold();
            if(holdForHandle) clearTimeout(holdForHandle);
            holdForHandle = setTimeout(repeater.resume,holdTime);
        }
        /* Resume the repeater. If an function call was cancelled due to holding, then call the function and restart the timer */
        repeater.resume = () => {
            if(!isHeld) return;
            isHeld = false;
            if(callWaiting){
                wrappedFunc();
                callWaiting = false;
                /* restart repeater so we don't have two calls too close together */
                repeater.stop();
                repeater.start();
            }
        }
        return repeater;
    },
    Timer: (() => {
        function Timer(){
            this.delayTime = 1000;
            this.repeats = false;
            this.obs = new Util.Observer();
            this.handle = undefined;
        }
        Timer.prototype.stop = function(){
            if(this.handle)clearTimeout(this.handle);
            this.handle = undefined;
            return this;
        }
        Timer.prototype.start = function(){
            this.handle = setTimeout(()=>{
                this.obs.notify();
                if(this.repeats)this.start();
            },this.delayTime)
            return this;
        }
        Timer.prototype.reset = function(){
            this.stop();
            this.start();
            return this;
        }
        Timer.prototype.repeat = function(bool){ this.repeats=bool;return this;}
        Timer.prototype.delay = function(ms){this.delayTime = ms; return this;}
        Timer.prototype.repeatEvery = function(ms){this.repeats=true;this.delayTime=ms;return this;}
        Timer.prototype.destroyWith = function(scope){scope.$on("$destroy",this.stop);return this;}
        Timer.prototype.then = function(f){this.obs.on(f); return this;}

        return function(){
            return new Timer();
        }
    })(),
    nStateCycler: n => {
        let i = 0;
        const inc = () => i = (i + 1) % n;

        return {
            inc:inc,
            get:()=>i
        }
    },
    copy: obj => {
        return Object.assign({},obj);
    },
    /* Data structure that allows temporary pushing, useful for notifications */
    MyStack: () => {
        let stack = [];
        const top = () => stack[stack.length-1].data;
        const push = newItem => {
            let id = Math.random();
            stack.push({id:id,data:newItem});
            return id;
        }
        const popID = id => {
            let index = stack.findIndex(item=>item.id==id);
            if(index == -1) return;
            let spliced = stack.splice(index,1).data;
            return spliced;
        }
        const temporaryPush = (newItem,duration) => {
            let id = push(newItem);
            setTimeout(()=>{
                popID(id);
            },duration);
            return id;
        }
        const clear = () => {
            stack = [];
        }
        const get = () => {
            return stack.map(item=>item.data);
        }
        return {
            top:top,
            push:push,
            popID:popID,
            temporaryPush:temporaryPush,
            get:get,
            clear:clear
        }
    },
    /* Help format strings to be used as a query string 
    Option 1: Input an array of strings like ['name=steven','pass=slove']
    Option 2: Input an object with structure like {name:'steven',pass:'slove'}
    Outputs a query string like: "" at minimum or
    "?name=steven&pass=slove"
    */
    toQueryString: params => {
        let fromStrings = array => {
            if(array.length > 0){
                return "?"+array.join("&");
            }
            else{
                return "";
            }
        }
        if(Array.isArray(params)){
            // treat this like ['name=steven','pass=slove']
            return fromStrings(params);
        }
        else if(typeof params === 'object'){
            // treat this like {name:'steven',pass:'slove'}
            let strings = Object.keys(params).map(key=>{
                let val = params[key];
                return key+"="+val;
            })
            return fromStrings(strings);
        }
        else{
            return "";
        }
    },
    /* Helps us invoke asynchronous calls sequentially */
    Serializer: (()=>{
        let queue = [];
        let busy = false;
        const add = f => {
            queue.push(f);
            if(!busy){
                busy = true;
                let call = queue.shift();
                call().finally(callFinished);
            }
        }
        const callFinished = () => {
            if(queue.length > 0){
                let call = queue.shift();
                call().finally(callFinished);
            }
            else{
                busy = false;
            }
        }
        return {
            add:add
        }
    }),
    addClassForDuration:($element,className,duration) => {
        let existingHandler = Util.getPropertySafe(animationMap,$element,className)
        if(existingHandler){
            clearTimeout(existingHandler);
        }
        $element.removeClass(className);
        setTimeout(()=>{
            $element.addClass(className);
        },1)
        let newHandler = setTimeout(()=>{
            $element.removeClass(className);
        },duration)
        Util.setSafe(animationMap,$element,className,newHandler);
    },
    refreshAnimation:($element,className) => {
        $element.removeClass(className);
        setTimeout(()=>{
            $element.addClass(className)
        },1);
    },
    ToggleValue:(initialValue,values) => {
        if(values.length !== 2){
            throw "ToggleValue needs an array of 2 values";
        }
        let a = values[0];
        let b = values[1];
        let cur = initialValue;
        return {
            get:()=>cur,
            toggle:()=>{
                if(cur === a){
                    cur = b;
                }
                else{
                    cur = a;
                }
            }
        }
    },
    

    /* An updatable map used to keep track of up-to-date information on labels */
    Map: (() => {
        let elements = {};
        let obs = new Util.Observers(["set","update"]);
        /* Should this function return copies or direct references to elements? */
        const get = keys => {
            keys = Util.ensureArray(keys);
            let result;
            if(keys.length == 0){
                result = Util.deepCopy(elements); // 0 keys, return everything
            }
            else if(keys.length == 1){
                result = elements[keys[0]]; // 1 key, return that one
            }
            else{ // multiple keys supplied, return an array with those values
                result = keys.reduce((array,key)=>{
                    let el = elements[key];
                    if(el !== undefined){ // Don't push undefined into the array if we ask for an element we don't have
                        array.push(el); 
                    }
                    else{
                        console.log("asked for element we don't have",elements,key);
                    }
                    return array;
                },[])
            }
            return result;
        }
        const asArray = () => {
            return Object.values(elements).filter(x=>x!=undefined);
        }
        const internalSet = (key,val) => {
            elements[key] = val;
        }
        const has = key => {
            return get(key) !== undefined;
        }
        const setTo = (obj)=>{
            Object.keys(obj).forEach(key=>{
                set(key,obj[key]);
            })
        }
        const set = (key,val) => {
            if(typeof(key)=="object"){
                return setTo(key);
            }
            internalSet(key,val);
            obs.set.set(key,val);
        }
        const update = (key,newVal) => {
            let oldVal = get(key);
            let result = Object.assign({},oldVal,newVal);
            internalSet(key,result);
            obs.update.set(key,result);
        }
        const clear = () => {
            obs.clear();
            elements = [];
        }
        // const onAdd = f => onAddF = f;

        return {
            clear,
            obs,
            has,
            set,
            update,
            asArray,
            get,
        }
    }),
    /* Wraps an array acting as a set of unique values.
    We can specify functions to call upon adding a new member or removing an existing one
    While still allowing the ability to attempt to remove a member that is not present
    or attempting to add a member that is already present, without triggering those functions.
    */
    Set: ((initialItems)=>{
        let obs = new Util.Observers(["change","add","remove","addAttempt","removeAttempt"]);
        const elements = [];
        const init = () => {
            if(initialItems){
                set(initialItems)
            }
        }

        const has = target => elements.find(el=>el===target) !== undefined;
        const add = newElements => {
            newElements = Util.ensureArray(newElements);
            newElements.forEach(newEl=>{
                if(!has(newEl)){
                    elements.push(newEl);
                    obs.add.notify(newEl);
                    obs.change.notify(get()); // change is notified AFTER the change has taken place
                }
            })
        }
        const insertOrMove = (newEl,index)=>{
            let indexModifier = 0;
            if(has(newEl)){
                let oldIndex = elements.indexOf(newEl);
                if(oldIndex > index) indexModifier = 0; // trying to insert before previous existing item
                if(oldIndex < index) indexModifier = -1; // trying to insert AFTER existing item
                remove(newEl);
            }
            elements.splice(index+indexModifier,0,newEl); // add it
            obs.add.notify(newEl);
            obs.change.notify(get()); // change is notified AFTER the change has taken place
        }
        const attemptToggle = el => {
            if(has(el)){
                return attemptRemove(el)
            }
            else{
                return attemptAdd(el);
            }
        }
        const attemptAdd = (el) => {
            if(has(el)) return;
            obs.addAttempt.notify(el);
        }
        const attemptRemove = (el) => {
            if(!has(el)) return;
            obs.removeAttempt.notify(el);
        }
        const remove = target => {
            if(has(target)){
                let index = elements.indexOf(target);
                let removedElement = elements[index];
                elements.splice(index,1);
                obs.remove.notify(removedElement);
                obs.change.notify(get()); // change is notified AFTER the change has taken place
            }
        }
        const toggle = el => {
            if(has(el)){
                return remove(el)
            }
            else{
                return add(el);
            }
        }
        const set = newElements => {
            newElements = Util.removeDuplicates(newElements); // ensure the new set is actually a set
            let removed = elements.filter(oldElement=>{ // get only the elements from the old set
                return newElements.indexOf(oldElement) == -1; // not found in new set
            })
            let added = newElements.filter(newElement=>{ // get only the elements from the new set
                return !has(newElement) // not found in the old set
            })
            removed.forEach(remove);
            added.forEach(add);
        }
        const get = () => elements;
        const length = () => elements.length;
        const clear = () => {
            obs.clear();
            set([]);
        }
        init();
        return{
            clear,
            toggle,
            length,
            obs,
            clearObservers:obs.clear.bind(obs),
            onChange:obs.change.on.bind(obs.change),
            onAdd:obs.add.on.bind(obs.add),
            onAddAttempt:obs.addAttempt.on.bind(obs.addAttempt),
            onRemove:obs.remove.on.bind(obs.remove),
            onRemoveAttempt:obs.removeAttempt.on.bind(obs.removeAttempt),
            add,
            insertOrMove,
            remove,
            attemptAdd,
            attemptRemove,
            attemptToggle,
            has,
            get,
            set
        }
    }),
    /* A single value that keeps track of desired changes that may or may not succeed.
    Useful for understanding communication with the server */
    ServerValue: ((val)=>{
        let history = [];
        let confirmed = val;
        let optimismCache = val;
        let optimisticChangeFns = [];
        let pessimisticChangeFns = [];
        const setManual = newValue => {
            history = [];
            updateOptimism();
            updatePessimism(newValue);
        }
        const set = (newValue,promise) => {
            history.push({
                value:newValue,
                promise:promise
            });
            updateOptimism();
            promise.then(()=>{
                updatePessimism(newValue);
            })
            .finally(()=>{
                history = history.filter(v=>v.promise !== promise);
                updateOptimism();
            })
            return promise;
        }
        const updatePessimism = (newValue) => {
            if(newValue != confirmed){
                confirmed = newValue;
                pessimisticChangeFns.forEach(f=>f(confirmed));
            }
        }
        const updateOptimism = () => {
            let calc = calculateOptimistic();
            if(calc != optimismCache){
                optimismCache = calc;
                optimisticChangeFns.forEach(f=>f(optimismCache));
            }
        }
        const onOptimisticChange = f => optimisticChangeFns.push(f);
        const onPessimisticChange = f => pessimisticChangeFns.push(f);
        const calculateOptimistic = () => {
            if(history.length > 0){
                return history[history.length-1].value;
            }
            return getPessimistic();
        }
        const getOptimistic = () => optimismCache;
        const getPessimistic = () => confirmed;

        return {
            onOptimisticChange,
            onPessimisticChange,
            getOptimistic,
            getPessimistic,
            setManual,
            set
        }
    }),
    /* An entire object with multiple properties that all store their history */
    ServerObject: ((obj)=>{
        if(typeof obj !== "object"){
            obj = {};
        }
        /* The authority is an object that mimics the passed-in object but replaces the properties 
        of that object with 'Util.ServerValue' versions of those properties */
        const authority = Object.getOwnPropertyNames(obj).reduce((acc,name)=>{
            acc[name] = Util.ServerValue(obj[name]);
            return acc;
        },{})
        /* Create a property if it doesn't yet exist, and assign any previously existing listeners */
        const ensure = propName => {
            if(authority[propName] === undefined){
                authority[propName] = Util.ServerValue();
                /* assign listeners that were added BEFORE this current property was added */
                pessimisticChangeFns.forEach(fn=>authority[propName].onPessimisticChange(val=>fn(propName,val)));
                optimisticChangeFns.forEach(fn=>authority[propName].onOptimisticChange(val=>fn(propName,val)));
            }
        }
        const set = (propName,value,promiseMaker) => {
            ensure(propName);
            if(value == getOptimistic(propName)){
                return;
            }
            authority[propName].set(value,promiseMaker());
        }
        const setManual = (propName,value)=>{
            ensure(propName);
            authority[propName].setManual(value);
        }
        const getOptimistic = propName => {
            if(propName === undefined){
                return Object.getOwnPropertyNames(authority).reduce((acc,name)=>{
                    acc[name] = getOptimistic(name);
                    return acc;
                },{})
            }
            ensure(propName);
            return authority[propName].getOptimistic();
        }
        const getPessimistic = propName => {
            if(propName === undefined){
                return Object.getOwnPropertyNames(authority).reduce((acc,name)=>{
                    acc[name] = getPessimistic(name);
                    return acc;
                },{})
            }
            ensure(propName);
            return authority[propName].getPessimistic();
        }
        /* These arrays store previously applied handlers and later when we create a new ServerValue with ensure
        We will add all of these handlers to the new ServerValue */
        let pessimisticChangeFns = [];
        let optimisticChangeFns = [];
        const onPessimisticChange = fn => {
            pessimisticChangeFns.push(fn);
            Object.keys(authority).forEach(name=>{
                let sv = authority[name];
                sv.onPessimisticChange(val=>fn(name,val))
            })
        }
        const onOptimisticChange = fn => {
            optimisticChangeFns.push(fn);
            Object.keys(authority).forEach(name=>{
                let sv = authority[name];
                sv.onOptimisticChange(val=>fn(name,val))
            })
        }

        return {
            set,
            setManual,
            onPessimisticChange,
            onOptimisticChange,
            getOptimistic,
            getPessimistic
        }
    }),

   Dimensions:{
        getContentWidth:() => $(document).width(),
        getContentHeight:() => $(document).height(),
   
        getScreenWidth:() => screen.width,
        getScreenHeight:() => screen.height,
   
        getWindowWidth:() => window.outerWidth,
        getWindowHeight:() => window.outerHeight,
   
        getViewportWidth:() => window.innerWidth,
        getViewportHeight:() => window.innerHeight,

        isPortrait:() => window.innerHeight > window.innerWidth
   },
    isNgrok:isNgrok,
    urlContains,
    ensureArray:item=>{
        if(item === undefined || item === null){
            return [];
        }
        if(Array.isArray(item)){
            return item;
        }
        else{
            return [item];
        }
    },
    mergeArrays:(a,b)=>{
        a = Util.ensureArray(a);
        b = Util.ensureArray(b);
        return Util.removeDuplicates(a.concat(b));
    },
    intersectArrays:(a,b)=>{
        a = Util.Set(a), b = Util.Set(b);
        return a.get().filter(v => b.has(v));
    },
    equalArrays:(a,b)=>{
        a = Util.ensureArray(a);
        b = Util.ensureArray(b);
        if (a === b) return true;
        if (a.length != b.length) return false;
        for (var i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    },
    url:(path)=>{
        if(Util.startsWith(path,"/")){
            // absolute path
            return baseURL+path;
        }
        else{
            // relative path
            return path;
        }
    },
    ensureString:function(arg){
        let str;
        switch(typeof arg){
            case "object":
                try{
                    str = JSON.stringify(arg);
                }catch(e){
                    str = "[object Object(couldn't be stringified)]"
                }
                break;
            case "string":
                str = arg;
            case "boolean":
            case "number":
            case "undefined":
            case "function":
            case "bigint":
                str = arg+"";
                break;
            default: // only remaining type is 'symbol'
                str = arg+"";
        }
        return str;
    },
    /* Takes in any number of arguments of any type and converts them each to a string
    then returns the result of them all concatenated.
    This is useful if you aren't sure the types of your variables but still want to print them.
    For instance, if you don't know if an error in a callback will be a string or an object with a string member
    this way you can just throw in the error variable and whatever type it is it will be part of the string. */
    stringify:function(){
        let args = Array.from(arguments);
        let strings = args.map(this.ensureString);
        return strings.join(",");

    },
    beforeUnload:function(f){
        let oldHandler = window.onbeforeunload;
        window.onbeforeunload = function(){
            if(oldHandler)oldHandler();
            f();
        }
    },
    isFunction:function(val){
        return (typeof val === 'function')
    },
    isArray:function(val){
        return Array.isArray(val);
    },
    /* returns true for simple objects, and Object.prototype */
    isSimpleObject:function(val){
        if (val === null) { return false;}
        return (typeof val === 'object') && (!Util.isArray(val));
    },
    /*  */
    setFieldsIfUnset:function(object,fieldNames,fieldValues){
        if(!this.isSimpleObject(object)){
            console.warn("Util.setFieldsIfUnset >> trying to set fields of a non-object",object);
            return;
        }

        if(Util.isSimpleObject(fieldNames) && (fieldValues === undefined)){
            /* dealing with a {key1:val1,key2:val2} type object */
            let map = fieldNames;
            fieldNames = Object.keys(map);
            fieldValues = Object.values(map);
        }
        else if(Util.isNonEmptyArray(fieldNames) && Util.isNonEmptyArray(fieldValues)){
            // no transformation of input required
        }
        else{
            console.warn("Util.setFieldsIfUnset >> improper input",...arguments);
        }
        fieldNames.forEach((fieldName,index)=>{
            let defaultVal = fieldValues[index];
            if(!object.hasOwnProperty(fieldName)){ 
                object[fieldName] = defaultVal;
            }
        })
    }
}})();
/* global Util */

Util.Observer = function(){
    this.handlers = [];
    return this;
};
Object.assign(Util.Observer.prototype,{
    on:function(handler){
        if(typeof handler != "function"){
            return console.error("tried to make an observer with argument",handler,"instead of a function");
        }
        this.handlers.push(handler);
    },
    off:function(removeMe){
        this.handlers = this.handlers.filter(handler=>handler!==removeMe);
    },
    clear:function(){
        this.handlers = [];
    },
    notify:function(){
        this.handlers.forEach(handler=>{
            handler(...arguments);
        })
    }
})


Util.Observable = function(initialValue){
    this.val = initialValue;
    this.obs = new Util.Observer();
    return this;
};
/* Set stored value, call handlers only if the value has changed */
Util.Observable.prototype.set = function(){
    /* Store the arguments of the most recent invocation of notify */
    let oldVal = this.val;
    if(arguments.length == 1){
        this.val = arguments[0]; // store just the value if we just get 1 arg
    }
    else{
        this.val = Array.from(arguments); // store an array if we get more than 1 arg
    }
    if(Util.isArray(this.val) && Util.isArray(oldVal)){
        if(!Util.equalArrays(this.val,oldVal)){
            this.obs.notify(...arguments);
        }
    }
    else{
        if(this.val != oldVal){
            this.obs.notify(...arguments);
        }
    }
}
Util.Observable.prototype.get = function(){
    return this.val;
}
Util.Observable.prototype.toggle = function(){
    this.set(!this.get());
}
Util.Observable.prototype.off = function(funcToRemove){
    this.obs.off(funcToRemove);
}
Util.Observable.prototype.on = function(f){
    this.obs.on(f);
}
/* Like 'set' but DOESNT store the value and DOESNT check if value has changed to actually call handlers */
Util.Observable.prototype.notify = function(){
    this.obs.notify(...arguments);
}
Util.Observable.prototype.clear = function(){
    this.obs.clear();
    this.val = undefined;
}



Util.Observers = function(names){
    this.names = [];
    names = Util.ensureArray(names);
    names.forEach(this.addObserver.bind(this));
    return this;
}
Util.Observers.prototype.addObserver = function(name){
    if(["addObserver","clear","clearObserver","names"].includes(name)){
        console.error("trying to add an observer with a name that conflicts with other operations...",name)
    }
    this.names.push(name);
    this[name] = new Util.Observable();
}
Util.Observers.prototype.clearObserver = function(name){
    if(this[name] && this[name].clear){
        this[name].clear();
    }
}
/* Clear out all memory */
Util.Observers.prototype.clear = function(){
    this.reset();
    this.names = [];
}
/* Remove all of the handlers but keep the observables themselves */
Util.Observers.prototype.reset = function(){
    this.names.forEach(this.clearObserver.bind(this));
    this.names.forEach(name=>this[name].set(undefined));
}

/* Input: an array of names of observers
Output: an object with a property for each name that is itself an object with the following properties
    notify
    on
    off
    clear
The output also has a clear fn which clears all the named observers.

This should simplify adding several observers to an object without having to manage the arrays of listeners
*/

// Util.Observer.prototype.on = function(handler){
//     if(typeof handler != "function"){
//         return console.error("tried to make an observer with argument",handler,"instead of a function");
//     }
//     this.handlers.push(handler);
// }
// Util.Observer.prototype.off = function(removeMe){
//     this.handlers = this.handlers.filter(handler=>handler!==removeMe);
// }
// Util.Observer.prototype.clear = function(){
//     this.handlers = [];
// }
// Util.Observer.prototype.notify = function(){
//     this.handlers.forEach(handler=>{
//         handler(...arguments);
//     })
// }




/* global Util */
Util.logs = (()=>{
    let logs = [];
    let capturing = false;
    let obs = new Util.Observer();
    function add(method,argstring){
        // let argstring = mergeArguments(args);
        let newLogLine = method+": "+argstring;
        logs.push(newLogLine);
        obs.notify(newLogLine);
    }
    function capture(){
        if(capturing)return;
        capturing = true;
        ['log','warn','error','info'].forEach(method=>{
            let oldMethod = console[method];
            console[method] = function(){
                oldMethod.apply(console, arguments); // still log to our local console
                // send(method[0]+mergeArguments.apply(null,arguments)); // but also send logs to jsconsole.net
                let argstring = Array.from(arguments).map(arg=>{
                    try{
                        if(typeof arg == "object") arg = JSON.stringify(arg);
                    }
                    catch(e){
                        arg = "[object Object(couldn't be stringified)]"
                    }
                    return arg || "_";
                }).join(", ").slice(0,80);
                add(method,argstring);
                
            }
            
        })
        // window.onerror = function (msg, url, lineNo, columnNo, error) {
        //     // ... handle error ...
        //     // logs.push({method:"error",message:msg});
        //     add("error",msg + " | " + error);
        //     return false;
        // }
    }
     /* returns a string that can be sent to the server */
    // function mergeArguments(){
    //     let merged = Array.from(arguments).map(arg=>{
    //         try{
    //             if(typeof arg == "object") arg = JSON.stringify(arg);
    //         }
    //         catch{
    //             arg = "[object Object(couldn't be stringified)]"
    //         }
    //         return arg || "_";
    //     }).join(", ").slice(0,80);
    //     return merged;
    // }

    function get(){
        return logs;
    }
    return {
        capture,
        add,
        get,
        on:obs.on.bind(obs)
    }
})()
    //The handler is executed at most once per element for all event types.
    $.fn.once = function (events, callback) {
        return this.each(function () {
            $(this).on(events, myCallback);
            function myCallback(e) {
                $(this).off(events, myCallback);
                callback.call(this, e);
            }
        });
    };
/**
 * Toggle Switch - On/Off toggle style object for AngularJS and Bootstrap 3
 * AngularJS Directive
 * 
 * Configuration options can be set as attributes in the <toggle-switch> tag:
 * labels: Comma delimited list of two items (defaults to ON,OFF)
 * stateValues: Comma delimited list of two items (defaults to ON,OFF)
 * 
 * 5/13/2016 KSG
 * 
 * Changes:
 * 8/28/2016 KSG 
 * Added ctrlFn (controller callback function)
 * so that a callback function can be passed in and called when the state is changed.
 * 
 * 3/19/2017 KSG
 * Added ng-disabled attribute for enabled/disabing the control
 * ng-disabled is not required, if not present control will not be disabled
 * To use: <toggle-switch ng-model="label.NO_LOCAL_ASSIGNMENT_BY_USER" labels="On,Off" stateValues="ON,OFF" ng-disabled="true"></toggle-switch>
 */
angular.module('ui.toggleSwitch', [])

    .constant('MODULE_VERSION', '0.0.2')

    // Define directive
    .directive('toggleSwitch', function() {
        return {
        	require:"^ngModel",
            restrict: 'E',
            scope: {
                ngModel: '=',
                ngDisabled: '=',
                ctrlFn: '&callbackFn'
            },
            template:  `
            <div class="btn-group pull-left" ng-model="ngModel" ng-disabled="{{ngDisabled}}">
                <button type="button" class="btn btn-sm btn-default btn-on" ng-disabled="{{ngDisabled}}">
                    {{ labels.on }}
                </button>
                <button ng-show="labels.off" type="button" class="btn btn-sm btn-default btn-off" ng-disabled="{{ngDisabled}}">
                    {{ labels.off }}
                </button>
            </div>
            `,
            link: function(scope, elem, attrs, ctrl) {
                // Get the initial state
                var state = scope.ngModel;

                /* Switch counts as in the ON state if its model is equal to scope.stateValues.on
                OR is true (not 'truthy', exactly true) */
                function isEnabled(){
                    return state == scope.stateValues.on || state === true;
                }
                
                /*
                 * Get Labels
                 * Can be set as an attribute in the <toggle-box/> tag
                 * Comma delimited list of no more than two items
                 * IE: ON,OFF or YES,NO, etc.
                 */
                scope.getLabels = function() {
                    var labels = {};
                    if(attrs.labels != undefined && attrs.labels.length > 0 && attrs.labels.indexOf(',') > 0) {
                        var array = attrs.labels.split(',');
                        labels = { on: array[0], off: array[1] };
                    } else {
                        labels = { on: 'ON', off: 'OFF' }
                    }
                    return labels;
                }
                scope.labels = scope.getLabels();

                /*
                 * Get CSS Classes
                 * Can be set as an attribute of the <toggle-switch/> element
                 * Comma delimited list of no more than two items
                 * IE: 'btn-success,btn-warning' or 'btn-success'
                 */

                 scope.getCSSClasses = function(){
                    const defaultClasses = {on:'btn-success',off:'btn-warning'};
                    let input = attrs.classes;
                    let result;
                    if(input!=undefined && input.length >0){
                        if(input.indexOf(',')>0){
                            let array = input.split(",");
                            result = {on:array[0],off:array[1]}
                        }
                        else{
                            result = {on:input,off:input};
                        }
                    }
                    else{
                        result = defaultClasses;
                    }
                    return result;
                 }
                 scope.cssClasses = scope.getCSSClasses();

                /*
                 * Get State Values
                 * Can be set as an attribute in the <toggle-box/> tag
                 * Comma delimited list of no more than two items
                 * IE: ON,OFF or YES,NO, etc.
                 */
                scope.getStateValues = function() {
                    var stateValues = {};
                    var attsStateValues = attrs.stateValues;
                    if(attrs.stateValues != undefined && attrs.stateValues.length > 0 && attrs.stateValues.indexOf(',') > 0) {
                        var array = attrs.stateValues.split(',');
                        /*
                         * 12/26/2016 KSG
                         * change "true"/"false" to boolean values
                         */
                        if(array[0] == "true") array[0] = true;
                        else if(array[0] == "false") array[0] = false;
                        if(array[1] == "true") array[1] = true;
                        else if(array[1] == "false") array[1] = false;
                        stateValues = { on: array[0], off: array[1] };
                    } else {
                        stateValues = { on: 'ON', off: 'OFF' }
                    }
                    return stateValues;
                };
                scope.stateValues = scope.getStateValues();

                elem.bind('click', function() {
                    //state = (scope.ngModel != undefined && (scope.ngModel).toUpperCase() === 'ON') ? 'OFF' : 'ON';
                    state = (scope.ngModel != undefined && isEnabled()) ? scope.stateValues.off : scope.stateValues.on;

                    elem.find('input').val(state);

                    scope.setState();

                    scope.ngModel = state;

                    scope.$apply();
                });

                scope.setState = function() {
                    if(isEnabled()) {
                        elem.find('.btn-on').addClass(scope.cssClasses.on).removeClass('btn-default');

                        elem.find('.btn-off').addClass('btn-default').removeClass(scope.cssClasses.off);
                    } else {
                        elem.find('.btn-on').addClass('btn-default').removeClass(scope.cssClasses.on);

                        elem.find('.btn-off').addClass(scope.cssClasses.off).removeClass('btn-default');
                    }
                    
                    
                }

                scope.$watch('ngModel', function (newVal, oldVal) {
                    // Get the initial state
                    state = scope.ngModel;
                    // Set the initial state
                    scope.setState();
                    
                    /*
                     * 08/28/2016 KSG
                     * Added callback function
                     */
                    if(newVal != undefined && oldVal != undefined) {
                    	if(newVal != oldVal) {
                    		if(scope.ctrlFn != undefined) scope.ctrlFn(scope.fullObj);
                    	}
                    }
                });

            }
        };
    }
);



















angular.module('ui.tricircle', [])

    .constant('MODULE_VERSION', '0.0.2')

    // Define directive
    .directive('tricircle', function() {
        return {
        	require:"^ngModel",
            restrict: 'E',
            scope: {
                ngModel: '=',
                color: "=",
                // onClick: '=',
                ngClick: '&', // & here means to pass as a reference rather than a string
                ngDisabled: '='
            },
            template:  `
            <div class="tricircle" ng-click="ngClick" ng-disabled="ngDisabled">
                <span class="out fa fa-circle-o"></span>
                <span class="in fa fa-circle"></span>
                <span class="standBy fa fa-spinner fa-spin"></span>
            </div>
            `,
            link: function(scope, elem, attrs, ctrl) {
                let color = attrs.color;
                elem.find('.tricircle').addClass(color);

                function setOff(){
                    elem.find('.tricircle').addClass('tricircle-off').removeClass('tricircle-changing').removeClass('tricircle-on');
                }
                function setChanging(){
                    elem.find('.tricircle').removeClass('tricircle-off').addClass('tricircle-changing').removeClass('tricircle-on');

                }
                function setOn(){
                    elem.find('.tricircle').removeClass('tricircle-off').removeClass('tricircle-changing').addClass('tricircle-on');
                }

                scope.$watch('ngModel', function (newVal, oldVal) {
                    // Get the initial state
                    switch(newVal){
                        case "off":
                            setOff();break;
                        case "on":
                            setOn();break;
                        case "changing":
                            setChanging();break;
                        default:
                            
                    }
                    // Set the initial state
                    
                });

            }
        };
    }
);
























/* This global class helps construct forms; collections of fields to be filled in by the user

A field has the following necessary properties
    1. type:            one of "text","select", "toggleSwitch" ...
    2. label:           a human-friendly string to describe the field
    3. modelName:       a not-necessarily-human-friendly string that uniquely identifies the field

And the following optional properties
    4. initialValue:    initial value for <input type='text'> elements

Usage:
    Create a new form with formdata = Form(4) to make a form with 4 fields.
    Get the array of fields with formdata.get()
    Get the third field with formdata.get(2)
    
    Once you have set all the properties that you want, use the FormModalService...
    
    let formdata = Form(3);
    let labels = ["Age","Sex","Location"];
    let modelNames = ["age","sex","loc"];
    formdata.get().forEach((field,index)=>{
        field.label = labels[index];
        field.modelName = modelNames[index];
    })

    FormModalService.open({
        title:'Tell me about yourself',
        form:formdata,
        submit:submitted=>{
            let age = submitted.age;
            let location = submitted.loc;
            alert(age+"? Thats old to be living in " + location);
        },
    });
*/

const Form = (n=>{
    const defaultType = ()=>"text";
    const defaultLabel = ()=>"Field "+(fields.length+1);
    const defaultModelName =()=>"FIELD_"+(fields.length+1);
    const defaultRequired = ()=>false;
    const defaultPlaceholder = () => "";
    const fields = [];
    let name = "Form"+Util.generateUUID().slice(0,5);
    const addField = () => fields.push(makeDefaultField());
    const makeDefaultField = () => {
        return {
            type:defaultType(),
            label:defaultLabel(),
            modelName:defaultModelName(),
            required:defaultRequired(),
            placeholder:defaultPlaceholder()
        }
    }
    const getByModelName = mn => {
        return Util.findElementWithProperty(fields,"modelName",mn);
    }
    const get = n => {
        if(n == undefined){
            return fields;
        }
        /* Create a missing field if we're asking for it */
        if(fields[n] == undefined){
            fields[n] = makeDefaultField();
        }
        return fields[n];
    }
    const init = () => {
        while( n > 0 ){
            addField();
            --n;
        }
    }
    init();
    return ({
        addField:addField,
        name,
        getByModelName,
        get:get
    })
});
const Loader = (($scope,name) => {
    const setStatus = s => $scope[name+"LoaderStatus"] = s;
    const setMessage = m => $scope[name+"LoaderMessage"] = m;
    const pend = () => setStatus("pending");
    const success = msg => {
        if(!msg)msg = "";
        setStatus("success");
        setMessage(msg);
    }
    const fail = msg => {
        console.log("loader set to ",msg);
        if(!msg)msg = "";
        setStatus("failure");
        setMessage(msg);
    }
    const hide = () => setStatus("hidden");
    const getStatus = () => $scope[name+"LoaderStatus"];
    const hideSuccess = () => {
        if(getStatus() == "success")hide();
    }
    const track = promise => {
        pend();
        promise.then(success);
        promise.catch(fail);
    }
    return {
        track,
        pend:pend,
        success:success,
        fail:fail,
        hide:hide,
        hideSuccess:hideSuccess
    }
})
/* global agGrid $ Util Sorting*/
/* Helps with making Ag-Grid grids */
const Grid = ($scope=>{
    let systemNameVisible = false;

    let gridElement;
    let intervalHandle;

    const gridOptions = {
        columnDefs:[],
        rowData:[]
    }
    /* Default Column Definition */
    gridOptions.defaultColDef = {
        cellClass: "ag-default-cell",
        headerClass: "ag-default-header",
        comparator: Sorting.genericComparison // make the default comparator case-insensitive
    };
    
    /* Below are many grid properties for which we set a default value.
    Most are native to the implementation of ag-grid, but some are 'custom' properties
    that are specific to this project. Meaning that there is some other code, probably in this file
    that will implement some change in the behavior of the grid */

    /* Style */
    gridOptions.headerHeight = 45;
    gridOptions.rowHeight = 20;
    /* Selection */
    gridOptions.rowSelection = 'single';
    gridOptions.rowDeselection = true;
    gridOptions.deselectWithoutCtrl = false; // custom property
    gridOptions.addSelectionWithoutCtrl = false; // custom property
    gridOptions.enableOrderedSelection = false; // custom property for keeping track of which order a user selected different items
    gridOptions.enableMaintainSelection = false; // custom property for reselecting rows to persist through setData
    /* Sorting */
    /* Initial sorting is done elsewhere. I don't like how AG-Grid handles changing an initial sort
    So instead, we just actually sort the array of data in accordance with the initial sort that we want. */    
    gridOptions.sortingOrder = ['asc', 'desc', null]; // When you click a column, it changes the sort order. This is the order in which it changes.
    gridOptions.enableSorting = true;
    /* Resize */
    gridOptions.enableAutoSizeAllColumns = false; // custom property for auto resizing columns so that each column is wide enough to fit its (currently loaded) contents
    gridOptions.enableColResize = true;
    gridOptions.enableAutoVerticalResize = false; // custom property for auto resizing height of grid
    gridOptions.enableAutoSizeColumnsToFit = false; // custom property for auto resizing columns to fit available space of the screen
    gridOptions.minHeight = 300;
    /* Auto Scrolling */
    gridOptions.autoScrollIntoFocus = false; // custom property
    gridOptions.suppressScrollOnNewData = true; // applies when using grid.setRows rather than addRows or removeRow. Will prevent default behavior of scrolling to top
    gridOptions.enableMaintainCurrentScroll = false; // custom property for keeping the grid scrolled down when new data is added if the user is scrolled all the way down.
    gridOptions.scrollBottomThreshold = 200; // pixels from bottom of grid that counts as being scrolled all the way down.
    /* Filtering */
    gridOptions.enableFilter = true;
    gridOptions.floatingFilter = true;
    gridOptions.cacheQuickFilter = true;
    gridOptions.enableFilterOnFullWidth = true; // custom property for searching on fullWidth characters (like Ｗ vs W)
    gridOptions.enablePersistFiltersThroughSetRows = true; // custom property for not resetting filters after calling gridOptions.api.setRowData()
    gridOptions.enableShowPlaceholderTextOnFloatingFilters = true; // custom property
    /* Updating Rows */
    gridOptions.deltaRowDataModel = false; // when true, treats calls to gridOptions.api.setRowData() as deltas and automatically determines which rows need to be modified
    /* Moving columns around */
    // By default, the user can click and drag column headers to reorder them.
    gridOptions.suppressDragLeaveHidesColumns = true; // prevent user from removing a column entirely
    gridOptions.hideEmptyColumns = false; // custom property to hide columns with no real data in them
    // Individual columns can be prevented from being dragged by setting the colDef property suppressMovable
    /* Default Column Defs */
    gridOptions.columnDefs = [            
        {headerName: "Selector Name",   width:140, field: "name", tooltipField: "name"},
        {headerName: "Description",     width:200, field: "desc", tooltipField: "desc"},
        {headerName: "Type",            width:180, field: "type", tooltipField: "type"},
    ];

    

    const ColumnHiding = (() => {
        /* Previously took no arguments and looked at gridOptions.rowData to determine
        the unique values of each column. For some reason that wasn't working so now I'm
        passing in the new rows directly. Perhaps when using Grid.setRows, there is some
        lagtime between when setRowData is called and gridOptions.rowData actually changes */
        const hideEmpties = newRows => {
            // console.log("hiding all empties");
            // get a list of all the column Ids
            let allColumns = gridOptions.columnDefs.map(def=>def.field);
            // show them all
            let showAllState = allColumns.map(id=>{return {"colId":id}});
            gridOptions.columnApi.setColumnState(showAllState);
            // for each one, check the unique values
            allColumns.forEach(id=>{
                let uniqueValues = Util.uniquePropertyValues(newRows,id);
                // console.log("unique values for col",id,uniqueValues);
                if(uniqueValues.length < 2 && (uniqueValues[0] === undefined || uniqueValues[0] === "")){
                    hideByField(id);
                }
            })
        }
        const hideByField = field => {
            console.log("hiding field",field);
            let curState = gridOptions.columnApi.getColumnState();
            let indexToRemove = curState.findIndex(obj=>obj.colId === field);
            curState.splice(indexToRemove,1);
            gridOptions.columnApi.setColumnState(curState);
        }
        return{
            hideEmpties:hideEmpties
        }
    })()

    const showSystemName = () => {
        systemNameVisible = true;
    }

    const addRow = (row,index) => addRows([row],index);
    const addRows = (rows,index)=>{
        if(gridOptions.api){
            if(index == undefined){
                gridOptions.api.updateRowData({add:rows});// add to the end
            }
            else{
                gridOptions.api.updateRowData({add:rows,addIndex:index});
            }
        }
        else{
            gridOptions.rowData = rows;
        }
        // console.log("after adding rows",rows,gridOptions.rowData);
    }
    const updateRow =  row =>  gridOptions.api.updateRowData({update:[row]});
    const updateRows = rows => gridOptions.api.updateRowData({update:rows});
    const removeRow =  row =>  {
        gridOptions.api.updateRowData({remove:[row]});
        updateNumRowsSelected();
    }
    const removeRows = rows => {
        gridOptions.api.updateRowData({remove:rows});
        updateNumRowsSelected();
    }

    const getAllRows = () => {
        let allRows = []
        gridOptions.api.forEachNode( function(node) {
            allRows.push(node.data);
        });
        return allRows;
    }

    /* Wraps the api.setRowData fn */
    const setRows = rows => {
        if(gridOptions.enableMaintainSelection) SelectionIndex.save();
        gridOptions.api.setRowData(rows); // actually set the grid rows
        if(gridOptions.hideEmptyColumns){
            ColumnHiding.hideEmpties(rows);
        }
        if(gridOptions.enableMaintainSelection) SelectionIndex.restore();
        if(gridOptions.enableShowPlaceholderTextOnFloatingFilters)showPlaceholderTextOnFloatingFilters(); //otherwise they disappear on refresh
        updateNumRowsSelected();
    }

    /* This obj helps implement the enableMaintainSelection property.
    In situations where we can rely on the index of a selected row to uniquely identify that row
    this can be used to reselect that same row after the grid rows are set (which removes selections).
    Just call .save() before the call to setRowData and .restore() after the call to setRowData */
    const SelectionIndex = (()=>{
        // let selectedRowIndex;
        let indices = [];
        const save = () => {
            indices = getSelectedIndices();
        }
        const restore = () => {
            if(Util.isNonEmptyArray(indices)){
                selectByIndices(indices);
            }
        }
        return {
            save:save,
            restore:restore
        }
    })()

    /* Neither method (ensureIndexVisible, ensureNodeVisible) seems to work... */
    const scrollToSelected = () => {
        /* using ensureIndexVisible */
        // let index = getFirstSelectedIndex();
        // console.log("scrolling to index",index);
        // gridOptions.api.ensureIndexVisible(index,"middle");

        /* using ensureNodeVisible */
        let selectedNode = gridOptions.api.getSelectedNodes()[0];
        let comparator = node => {
            return node == selectedNode;
        }
        console.log("scrolling to node",selectedNode);
        gridOptions.api.ensureNodeVisible(comparator,"middle");
        
    }

    let scrolling = false;
    const scrollIntoFocus = () => {
        if(scrolling) return;
        let $ge = $(gridElement);
        let top = $ge.offset().top;
        // console.log("scrolling into focus",top,$ge,scrolling);
        $("html,body").animate({
            scrollTop: top
        }, 1000);
        scrolling = true;
        setTimeout(()=>scrolling=false,2000);
    }
    const onScrollDown = f => {
        let latestVerticalScrollPosition;
        if(gridOptions.api){
            gridOptions.onBodyScroll = event => {
                if(event.top > latestVerticalScrollPosition){ // We've scrolled down
                    f(event);
                }
                latestVerticalScrollPosition = event.top;
            }
        }
    }
    /* Handle what happens when we click on a selector in the grid */
    const onRowDataSelected = f => {
        if(!gridOptions.api)console.error("grid not established yet");
        gridOptions.onRowSelected = row => {
            if(row.node.isSelected()){
                orderedSelection.push(row.node);
                $scope.$apply(f(gridOptions.api.getSelectedRows()[0]));
            }
        }
    }
    const onRowDataDeselected = f => {
        if(!gridOptions.api)console.error("grid not established yet");
        gridOptions.onRowSelected = row => {
            if(!row.node.isSelected()){
                orderedSelection.splice(orderedSelection.indexOf(row.node),1);
                $scope.$apply(f(row));
            }
        }
    }
    const trackSelectionOnScope = propName => {
        onSelectionChange(rows => {
            console.log("selection changed",rows)
            if(rows.length > 0){
                $scope[propName] = rows[0];
            }
            else{
                $scope[propName] = undefined;
            }
        })
    }
    let orderedSelection = [];
    const addToOrderedSelection = e => orderedSelection.push(e.node);
    const removeFromOrderedSelection = e => {
        let index = orderedSelection.indexOf(e.node);
        if(index == -1) return;
        orderedSelection.splice(index,1);
    }
    const keepTrackOfSelectionOrder = () => {
        gridOptions.api.addEventListener('rowSelected', row => {
            let refreshables = [row,...orderedSelection];
            if(row.node.isSelected()){
                // console.log("adding",row,"to ordered selection");
                addToOrderedSelection(row);
            }
            else{
                removeFromOrderedSelection(row);
            }
            // highlightFirstSelectedRow();
            gridOptions.api.redrawRows({rowNodes:refreshables});
            // console.log("keeping track of selection order",orderedSelection);
        });
    }
    const highlightFirstSelectedRow = () => {
        console.log("highlight first selected row called");
        gridOptions.getRowClass = function(params) {
            console.log("get row class called");
            if(orderedSelection.indexOf(params.node) == 0){
                return 'firstSelectedRow';
            }
        }
        // gridOptions.api.redrawRows(); // needed in order to trigger the logic of gridOptions.getRowClass
    }
    const setRowClassRules = (className,f) => {
        if(!gridOptions.rowClassRules) gridOptions.rowClassRules = {};
        gridOptions.rowClassRules[className] = f;
    }
    let lastHighlightedIndex;
    const highlightRowByIndex = index => {
        console.log("highlighting row by index",index);
        setRowClassRules("highlighted",params=>params.node.childIndex == index);
        redrawRowsByIndices([index,lastHighlightedIndex]); // redrawing the lastHighlighted row unhighlights it
        lastHighlightedIndex = index;
    }
    let previouslyHighlighted = [];
    const highlightRowsByIndices = indices => {
        console.log("highlighting",indices);
        setRowClassRules("highlighted",params=>indices.includes(params.node.childIndex));
        if(previouslyHighlighted.length > 0){
            redrawRowsByIndices([...indices,...previouslyHighlighted]);
        }
        previouslyHighlighted = indices;
    }
    const redrawRowsByIndices = indices => {
        indices = Util.removeDuplicates(indices);
        // console.log("redrawing",indices);
        let nodes = indices.map(getNodeByIndex);
        console.log("redrawing",indices,nodes);
        gridOptions.api.redrawRows({rowNodes:nodes});
    }
    


    /* Warning! Calling this will overwrite previous onSelectionChange handlers. */
    const onSelectionChange = f => {
        if(!gridOptions.api)console.error("grid not established yet");
        gridOptions.onRowSelected = () => {
            let rows = getSelectedRows();
            numRowsSelected = rows.length; // No matter the handler, we also want to keep track of the number of selected rows
            $scope.$apply(f(rows));
        }
    }

    /* It would be nice to just observe any selection events and update the #, but removing a row doesn't count
    as a selection event. I'd like to just also listen for all removal events, and that may be possible. But in
    the meantime, this fn helps manually update the recorded number of rows selected. Still is probably preferable
    to iterating over all rows continually to determine the # selected */
    const updateNumRowsSelected = () => {
        numRowsSelected = getSelectedRows().length;
    }
    /* We keep track of the number of selected rows this way because selecting a grid row immediately affects the grid
    but it does not trigger an angular digest naturally, so we trigger a digest with the onSelectionChange fn */
    let numRowsSelected = 0;
    const keepTrackOfNumberSelected = () => {
        onSelectionChange(rows=>{
            numRowsSelected = rows.length;
        })
    }
    const getSelectedRows = () => {
        if(gridOptions.api){
            return gridOptions.api.getSelectedRows() || [];
        }
        else{
            return [];
        }
    }
    const getFirstSelectedIndex = () => {
        if(gridOptions.api){
            let indices = getSelectedIndices();
            if(Util.isNonEmptyArray(indices))return indices[0];
        }
        return undefined;
    }
    const getSelectedIndices = () => {
        if(gridOptions.api){
            let indices = gridOptions.api.getSelectedNodes().map(node=>node.childIndex)
            return indices;
        }
        return undefined;
    }
    const getNodeWithProperty = (propName,propVal) => {
        let found = false;
        let foundNode;
        gridOptions.api.forEachNode((node) => {
            if(!found && node.data[propName] == propVal) {
                found = true;
                foundNode = node;
            }
        });
        return foundNode;
    }
    /* doesn't seem to work for now */
    const getNodeByIndex = index => {
        return gridOptions.api.getDisplayedRowAtIndex(index);
    }
    function selectByIndices(indices){
        indices = Util.ensureArray(indices);
        selectByFunctionOnNode(node=>{
            if(indices.includes(node.childIndex)){
                node.setSelected(true); // for 'setSelected', first arg is boolean for selecting/deselecting. 2nd arg is true if we want to deselect everything else
                return true;
            }
        })
    }
    const selectByIndex = index => {
        let found = false;
        let lastNode;
        gridOptions.api.forEachNode((node) => {
            if(node.childIndex === index) {
                node.setSelected(true);
                found = true;
                return;
            }
            lastNode = node;
        });
        if(!lastNode){ /* there are no nodes at all, so don't try to select anything */
            return;
        }
        /* if index not found, select last row */
        if(!found){
            lastNode.setSelected(true);
        }
    }
    const selectByFunctionOnNode = fn => {
        gridOptions.api.forEachNode(node=>{
            if(fn(node)){
                node.setSelected(true);
            }
        })
    }
    const selectByFunctionOnData = fn => {
        return selectByFunctionOnNode(node=>fn(node.data));
    }
    const selectByIDs = ids => {
        gridOptions.api.forEachNode(node=>{
            if(ids.includes(node.data.ID)){
                node.setSelected(true);
            }
        })
    }
    const selectNextRow = () => {
        selectByIndex(getFirstSelectedIndex()+1);
    }
    

    /* Implements the behavior desired by the deselectWithoutCtrl property */
    let previouslySelected;
    gridOptions.onRowClicked = event => {
        // const selected = event.node.isSelected()
        const clicked = event.node.data;
        if(clicked == previouslySelected && gridOptions.deselectWithoutCtrl){
            gridOptions.api.deselectAll();
            previouslySelected = undefined;
        }
        else{
            previouslySelected = clicked;            
        }
    }
    /* Resize columns to fit data inside them */
    const autoSizeAllColumns = () =>{
        if(!isInitialized())return;
        var allColumnIds = [];
        gridOptions.columnApi.getAllColumns().forEach(function(column) {
            allColumnIds.push(column.colId);
        });
        gridOptions.columnApi.autoSizeColumns(allColumnIds);
    }
    const autoResize = () => {
        if(gridOptions.enableAutoSizeAllColumns)autoSizeAllColumns();
        if(gridOptions.enableAutoSizeColumnsToFit)sizeColumnsToFit();
    }
    const onWindowResized = () => {
        console.log("window resize detected");
        if(gridOptions.enableAutoSizeAllColumns)autoSizeAllColumns();
    }

    /* If the user manually resizes a column, maybe they don't want the auto resizing behavior right now */
    const onColumnManuallyResized = () => {
        console.log("column manually resized detected");
        gridOptions.enableAutoSizeAllColumns = false;
        gridOptions.enableAutoSizeColumnsToFit = false;
    }
    /* checks if a column is resized rapidly to determine that a user is doing it.
    we check between 10 and 80 ms because < 10 might be two calls from setTimeout that got
    bunched up together. It's empirically derived. */
    const trackManualColumnResizing = () => {
        let timeOfLastResize = new Date().getTime();
        setTimeout(()=>{
            gridOptions.onColumnResized = () => {
                let now = new Date().getTime();
                let diff = now-timeOfLastResize;
                if(diff > 10 && diff < 80){
                    onColumnManuallyResized();
                }
                timeOfLastResize = now;
            }},100);
    }

    /* shrinks the grid to a height of 0, checks how much room the rest of the page is taking up,
    then determines what the height of the grid should be.  I can tell there are problems with this
    implementation including a flash whenever the grid is resized, and a page with two grids
    will not be sized correctly as the grids try to resize one at a time and each grid convinces
    the other grid that the height of the page is naturally higher than it is */
    const shrinkGrowFitHeight = () => {
        let roomToLeaveAtBottom = 30; // px
        let $ge = $(gridElement);
        let gridTop = $ge.offset().top;
        let heightThatFits = $(window).height()-gridTop - roomToLeaveAtBottom;
        let newHeight = Math.max(heightThatFits,gridOptions.minHeight);
        $ge.css("height",newHeight);
    }
    const sizeElementToFitScreen = Util.debounce(shrinkGrowFitHeight,90)
    let autoVerticalResize = () => {
        if(gridOptions.enableAutoVerticalResize){
            sizeElementToFitScreen();
        }
    }

    const sizeColumnsToFit = () => {
        // console.log("calling size columns to fit");
        if(gridOptions.api)gridOptions.api.sizeColumnsToFit();
    }
    

    /* works like attachToElement but you supply a query selector like #id or .class instead of the HTML element itself
    This also allows us to wait for an element that doesn't exist yet
    (necessary for modals where the js runs before the view has finished loading) */
    const attachToElementBySelector = selector => {
        return Util.waitForElement(selector).then($grid=>{ // $grid is a jquery-wrapped version of the HTML element of our grid div
            console.log("attaching grid to element after waiting");
            attachToElement($grid[0]); // unwrap $grid by using $grid[0]
        })
    }
    /* This actually creates the grid.
       gridOptions.api only exists after we create the grid! */
    const attachToElement = element => {
        beforeAttached(element);
        new agGrid.Grid(element, gridOptions);
        afterAttached();
    }
    const beforeAttached = (element) => {
        gridElement = element;
        if(systemNameVisible){
            gridOptions.columnDefs.unshift({
                headerName: "System Name",
                field: "LABEL_SYSTEM_NAME",
                tooltipField: "System Name",
                width:60
            })
        }
        if(gridOptions.enableFilterOnFullWidth){
            enableSearchingForFullWidthChars();
        }
    }
    const afterAttached = () => {
        if(gridOptions.autoScrollIntoFocus){
            onScrollDown(()=>{
                if(gridOptions.autoScrollIntoFocus)scrollIntoFocus();
            });
        }
        trackManualColumnResizing();
        // resize();
        if(gridOptions.enableAutoSizeAllColumns)autoSizeAllColumns();
        intervalHandle = setInterval(autoResize,300);
        $(window).on("resize",autoVerticalResize);
        window.onresize = onWindowResized();
        autoVerticalResize();
        // watch the offset top divided by 5 to round out and ignore small changes
        $scope.$watch(()=>Math.floor($(gridElement).offset().top/5),()=>{
            autoVerticalResize();
        });
        if(gridOptions.enableShowPlaceholderTextOnFloatingFilters){
            onGridReady(showPlaceholderTextOnFloatingFilters);
        }
        keepTrackOfNumberSelected();
        if(gridOptions.enablePersistFiltersThroughSetRows)persistFiltersThroughSetRows();
        if(gridOptions.addSelectionWithoutCtrl)setAddSelectionWithoutCtrl();
        if(gridOptions.enableOrderedSelection)keepTrackOfSelectionOrder();
        if(gridOptions.hideEmptyColumns)ColumnHiding.hideEmpties(gridOptions.rowData);

        gridOptions.onRowDataChanged = implementMaintainCurrentScroll; // for triggering on setData
        gridOptions.onRowDataUpdated = implementMaintainCurrentScroll; // for triggering on updateData
    }
    const disableScrolling = () => {
        // console.log("attempting to disable scrolling");
        $(gridElement).find(".ag-body-viewport").addClass("stopScrolling");
    }
    const enableScrolling = () => {
        $(gridElement).find(".ag-body-viewport").removeClass("stopScrolling");
    }

    const implementMaintainCurrentScroll = () => {
        // console.log("scroll from bottom",getScrollDistanceFromBottom(),getScrollFromBottom());
        if(gridOptions.enableMaintainCurrentScroll && getScrollDistanceFromBottom() < gridOptions.scrollBottomThreshold){
            console.log("implementing maintain current scroll");
            setScrollFromBottom(0);
        }
    }

    /* Implements the addSelectionWithoutCtrl custom property. Select multiple rows without holding ctrl.
    Also deselects rows without holding ctrl */
    const setAddSelectionWithoutCtrl = () => {
        function RowClickEventHandler(event){
            if(event.node.isSelected()){
            //   console.log("deselected");
              event.node.setSelected(false, false);
              orderedSelection.splice(orderedSelection.indexOf(event.node),1);
            } else {
              event.node.setSelected(true);
              orderedSelection.push(event.node);
            //   console.log("selected, add");
            }
        
        }
        gridOptions.onRowClicked = RowClickEventHandler;
        gridOptions.suppressRowClickSelection = true;
        gridOptions.suppressCellSelection = true;
        gridOptions.rowSelection = "multiple";
    }
    const getOrderedSelection = () => orderedSelection;

    const onGridReady = f => gridOptions.onGridReady = f;

    const showPlaceholderTextOnFloatingFilters = () => {
        $(".ag-floating-filter-input").attr("placeholder","filter");
    }
    /* test the data of each row with the predicate, a fn that returns true or false, and if true, apply the class name to that row */
    const addRowClassRule = (predicate,className) => {
        if(!gridOptions.rowClassRules)gridOptions.rowClassRules = {};
        gridOptions.rowClassRules[className] = params => predicate(params.data);
    }
    const treatPropertyAsClass = propName => {
        gridOptions.getRowClass = params => {
            return params.data[propName];
        }
    }

    /* Full-width characters are a type of unicode character that look basically like normal alphabetic characters
    but they take up more bits. When searching in a grid, we generally use the quick filter, but by default, it doesn't match
    full-width characters which Turner uses in some of their labels.  This function allows us to search for a 'W'
    and match literal 'W' characters as well as the fullwidth 'Ｗ'. */
    const quickFilterOnFullWidth = () => {
        gridOptions.columnDefs.forEach(colDef=>{
            colDef.getQuickFilterText = params => {
                let str = params.value || "";
                let unicodeStripped = Util.simplifyUnicode(str); // convert any fullwidth chars to ascii versions
                return unicodeStripped;
            }
        })
    }
    /* Ag-Grid has the concept of a quick filter that is applied across the grid to all columns, whereas
    normal filters act on a specific column. Don't think these are faster and slower versions of the same process */
    const normalFilterOnFullWidth = () => {
        /* formatter to convert fullWidth characters to normal ones, and to lower case */
        const formatter = text => {
            let withoutFullWidths = Util.simplifyUnicode(text);
            let lowered = withoutFullWidths.toLowerCase();
            return lowered;
        }
        /* iterate over all columns and apply the formatter */
        gridOptions.columnDefs.forEach(colDef=>{
            if(!colDef.filterParams) colDef.filterParams = {};
            colDef.filterParams.textFormatter = formatter;
        })
    }
    
    const enableSearchingForFullWidthChars = () => {
        /* For some reason, the normalFilterOnFullWidth function will not work properly
        if we don't also call quickFilterOnFullWidth() */
        quickFilterOnFullWidth();
        normalFilterOnFullWidth();
    }

    /* Show how many matching rows there are */
    const getCount = () => gridOptions.api.getModel().getRowCount();
    /* Enable search 
       Returns the number of matching elements */
    const search = searchTerm => {
        if(gridOptions.api){
            gridOptions.api.setQuickFilter(searchTerm);
            return getCount();
        }
    }
    const deselectAll = () => {
        if(gridOptions.api){
            gridOptions.api.deselectAll();
        }
    }
    const selectAll = () => {
        if(gridOptions.api){
            gridOptions.api.selectAll();
        }
    }
    const selectAllFiltered = () => gridOptions.api.selectAllFiltered();

    const getScrollableHeight = () => $(gridElement).find(".ag-body-container").height(); // .ag-body-container is really tall (as tall as your #rows * row height)
    const setScrollTop = top => {
        gridOptions.api.gridPanel.eBodyViewport.scrollTo(0,top);

    }
    const getVisibleHeight = () => $(gridElement).find(".ag-body").height(); // .ag-body is the viewport where visible rows are shown
    const getScrollDistanceFromBottom = () => getScrollFromBottom() - getVisibleHeight(); // actual scroll distance away from the bottom (minimum is 0)
    const getScrollFromBottom = () => { // distance from top of visible portion of grid to bottom of total grid. (minimum is ~400, the height of the visible grid)
        let height = getScrollableHeight();
        let topPixel = gridOptions.api.getVerticalPixelRange().top;
        return height - topPixel;
    }
    const setScrollFromBottom = pixelsBelow => {
        let height = getScrollableHeight();
        let top = height - pixelsBelow;
        setScrollTop(top)
    }

    const getRowData = () => {
        var rowData = [];
        gridOptions.api.forEachNode(function(node) {
            rowData.push(node.data);
        });
        return rowData;
    }

    const reverse = () => {
        setRows(getRowData().reverse());
        setScrollTop(getScrollFromBottom());
    }
    const suppressAllFilterButtons = () => {
        gridOptions.columnDefs.forEach(def => {
            if(!def.floatingFilterComponentParams) def.floatingFilterComponentParams = {};
            def.floatingFilterComponentParams.suppressFilterButton = true;
        })
    }
    const suppressAllFilterMenus = () => {
        gridOptions.columnDefs.forEach(def => {
            def.suppressMenu = true;
        })
    }
    const persistFiltersThroughSetRows = () => {
        gridOptions.columnDefs.forEach(def => {
            if(!def.filterParams)def.filterParams = {};
            def.filterParams.newRowsAction = 'keep';
        })
    }
    const setIdentifyingProperty = prop => {
        gridOptions.getRowNodeId = data => data[prop];
    }

    /* Allow us to simplify the process of setting a custom floating filter for a single column */
    const setFloatingFilter = (colDef,component) => {
        /* ensure that the grid options are set up to allow the floating filter */
        gridOptions.floatingFilter = true;
        if(!gridOptions.components) gridOptions.components = {};
        gridOptions.components.customFilter = component;
        /* assign properties to the specific column definition */
        const filterOptions = {
            filter: 'agTextColumnFilter',
            suppressMenu: true,
            floatingFilterComponent:'customFilter',
            floatingFilterComponentParams:{
                suppressFilterButton:true
            }
        }
        Object.assign(colDef,filterOptions);
    }

    const isInitialized = ()=>gridOptions.api!=undefined

    $scope.$on("$destroy",()=>{
        clearInterval(intervalHandle);
    })

    // const getVisibleNode = () => {
    //     gridOptions
    // }


    return ({
        /* Selection Handlers */
        onRowDataSelected:onRowDataSelected,
        onSelectionChange:onSelectionChange,
        onRowDataDeselected:onRowDataDeselected,
        /* Selection */
        selectNextRow:selectNextRow,
        selectByIndex:selectByIndex,
        selectByIDs:selectByIDs,
        selectByFunction:selectByFunctionOnData,
        deselectAll:deselectAll,
        selectAll:selectAll,
        selectAllFiltered:selectAllFiltered,
        trackSelectionOnScope:trackSelectionOnScope,
        getFirstSelectedIndex:getFirstSelectedIndex,
        getSelectedRows: getSelectedRows,
        getOrderedSelection:getOrderedSelection,
        hasOneSelected:  () => numRowsSelected == 1,
        hasManySelected: () => numRowsSelected > 1,
        hasNoneSelected: () => numRowsSelected < 1,
        /* Filtering */
        setFloatingFilter:setFloatingFilter,
        suppressAllFilterButtons:suppressAllFilterButtons,
        suppressAllFilterMenus:suppressAllFilterMenus,
        /* Scrolling */
        getScrollFromBottom:getScrollFromBottom,
        setScrollFromBottom:setScrollFromBottom,
        getScrollDistanceFromBottom:getScrollDistanceFromBottom,
        enableScrolling:enableScrolling,
        disableScrolling:disableScrolling,
        scrollToSelected:scrollToSelected,
        /* Data manipulation */
        clearRows:()=>setRows([]),
        addRow:addRow,
        addRows:addRows,
        setRows:setRows,
        updateRow:updateRow,
        updateRows:updateRows,
        removeRow:removeRow,
        removeRows:removeRows,
        reverse:reverse,
        setIdentifyingProperty:setIdentifyingProperty,
        getNodeWithProperty:getNodeWithProperty,
        getNodeByIndex:getNodeByIndex,
        /* Styling */
        addRowClassRule:addRowClassRule,
        treatPropertyAsClass:treatPropertyAsClass,
        setRowClassRules:setRowClassRules,
        highlightRowByIndex:highlightRowByIndex,
        highlightRowsByIndices:highlightRowsByIndices,
        /* Resizing */
        autoSizeAllColumns:autoSizeAllColumns,
        sizeColumnsToFit:sizeColumnsToFit,
        sizeElementToFitScreen:sizeElementToFitScreen,
        /* Misc */
        getOptions:()=>gridOptions,
        showSystemName:showSystemName,
        search:search,
        attachToElement:attachToElement,
        attachToElementBySelector:attachToElementBySelector,
        isInitialized:isInitialized
    })
})

Grid.checkboxRenderer = params => {
    if(params.value){
        return '<input type="checkbox" checked>'
    }
    return '<input type="checkbox">'
}
/* global app Util $ angular*/
var app = angular.module("app",['ui.router', 'ui.bootstrap','ngFileUpload','ui.toggleSwitch','ui.tricircle','ngDraggable','hmTouchEvents']);

app.config(['$stateProvider', '$urlRouterProvider','$locationProvider', function($stateProvider, $urlRouteProvider,$locationProvider) {
	$urlRouteProvider.otherwise('/');

	$stateProvider.state('logon',{
		url: '/',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html?v='+window.vcomBuildVersion
			},
			'middle' : {
				controller : 'LogonController',
				templateUrl : '../SystemAdmin/views/LogonMain.html?v='+window.vcomBuildVersion
			}
		}
	});
	$stateProvider.state('waitingRoom',{
		UIname: "Waiting Room",
		url:'/',
		views:{
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html?v='+window.vcomBuildVersion
			},
			'middle' : {
				controller : 'WaitingRoomController',
				templateUrl : 'views/waitingRoom.html?v='+window.vcomBuildVersion
			}
		}
	})
    $stateProvider.state('controlPanel', {
		UIname: "Control Panel",
		url : '/',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html?v='+window.vcomBuildVersion
			},
			'middle' : {
				controller : 'ControlPanelController',
				templateUrl : 'views/controlPanel.html?v='+window.vcomBuildVersion
			}
		}
	});
	$locationProvider.html5Mode({ enabled: true, requireBase: true });
}]);

/* Note that we are on the Control Panel */
app.run(function(WhichPageService ){
	WhichPageService.set("Control Panel"); // note that we're on the control panel ...
});

/* If we were previously logged in and still have the credentials available to us
then we should log that account out to prevent the account from being orphaned */
app.run(function(AuthenticationService,AuthenticatorService){
	let info = AuthenticationService.getUserInfo();
	if(info){ // stored!
		AuthenticatorService.logout();
	}
});

/* React when the origin changes */
app.run(function(EventService,OriginService,NotificationService,AndroidService,BrandingService){
	const defaultConfig = {
		showSuccess:true
	}
	EventService.on("originChanged",(angularEvent,config)=>{
		config = Object.assign({},defaultConfig,config);
		console.log("origin changed config",config);
		OriginService.testOrigin().then(()=>{
			if(config.showSuccess)NotificationService.add({message:"Connected to server at "+OriginService.getOrigin(),type:"success"})
		})
		.catch(()=>{
			NotificationService.add({message:"Could not connect to server at "+OriginService.getOrigin(),type:"danger"})
		})
		/* If we want to update branding based off of the env.js located 
		on the newly connected server, we would do so as follows */
		// EnvService.reset().finally(()=>{
		// 	BrandingService.applyFavicon();
		// 	BrandingService.applyTitle();
		// 	BrandingService.refreshLogo();
		// })
		// BrandingService.resetBrandingjs();
	});
	/* This event should fire just once at the beginning */
	EventService.on("initializeBranding",()=>{
		BrandingService.applyFavicon();
		BrandingService.applyTitle();
		BrandingService.refreshLogo();
	})
	/* AndroidService's ability to loadPreferences is asynchronous.
	If OriginService intializes before we can load Android preferences, then it looks
	through BrowserStorageService which calls Android.getPreference but the preferences
	have not loaded yet so we get undefined. */
	AndroidService.waitUntilReady().catch(e=>{console.log("we are not on android",e)}).finally(OriginService.init);
});

/* Allow login with query string parameters (?name=name&pass=pass)
 * And redirect users to login page if they aren't logged in
 *
 * No redirect is taken if the user is already logged in. This means ignoring query string parameters
 * If the user is NOT logged in, then one of 3 things will happen.
 * 1) They are logged in through supplied query string parameters and continue to their home state (telephoneInterface if TIF enabled)
 * 2) They are logged in through QSP and continue to the non-login state they were trying to get to
 * 3) They fail to login through QSP and are redirected to the login page
 *
 * Assume this is the base of the URL: intracomsystems.net/SystemAdmin/index.html#
 * These are some examples of where the user is redirected.
 *
 * 1) ?name=correct&pass=correct 				:>  /TelephoneInterface if on :2080, /systemStatus if on :80
 * 2) /clientConfigurationList?name=correct...	:>  /clientConfigurationList, logged in
 * 3) /anyLocation?name=incorrectOrMissing... 	:>  / (which is the login page)
 */

app.run(function(QueryStringService,EventService,ConnectionService){
	let name = QueryStringService.getProperty("name");
	let pass = QueryStringService.findOneOf(["pass","password"]) || "";
	console.log("for query string storage",name,pass);

	EventService.on("readyToAttemptQueryStringLogin",()=>{
		attemptQueryStringLogin(name,pass).catch(e=>{
			console.log("Not logging in through query string",e);
		})
	})

	EventService.on("OriginServiceInitialized",()=>{
		EventService.emit("readyToAttemptQueryStringLogin");
	})

	function attemptQueryStringLogin(name,pass){
		/* We can allow the user to log in with no password, but they need to have a name */
		if(name){
			console.log("Logging in from Query String with name \""+name+"\" and password \""+pass+"\"");
			return ConnectionService.loginManual(name,pass);
		}
		else{
			/* we can't log in without a username */
			return Promise.reject("No name found in query string");
		}
	}

})
app.run(function(EventService,BackgroundProcessService){
	EventService.on("disconnected",BackgroundProcessService.stopAll)
})
app.run(function( $rootScope,  ConnectionService,  StateService){

	/* Here we could intercept state changes (including one at the very beginning from no state to the first state).
	   Let them go through unless it is a user who is logged in trying to go to the log*/
	$rootScope.$on('$stateChangeStart', function(event,toState,toParams,fromState,fromParams) {
		var destination = toState.name;
		// if(ConnectionService.isLoggedIn() && destination == "logon"){
		// 	// event.preventDefault(); // if we wanted to prevent the intended state change
		// 	// StateService.goToControlPanel(); // if we wanted to go somewhere else instead
		// 	ConnectionService.logoutManual();
		// }
		if(!ConnectionService.isLoggedIn()){
			if(destination !== "logon"){
				event.preventDefault();
				StateService.goToLogon();
			}
		}
	});
})

/* HTTP interceptor to add our desired timeout to all HTTP calls 
	This doesn't just intercept API requests, it also intercepts
	resource requests like HTML and JS files. */
app.factory('timeoutHttpIntercept', function () {
	const defaultTimeout = Util.getAPIRequestTimeout();
	const extendedTimeout = Util.getAPIRequestExtendedTimeout();

	const determineAppropriateTimeout = config => {
		if(config.timeout){ // An HTTP request that already has a timeout specified
			return config.timeout; // Don't override a timeout value that has been set elsewhere.
		}
		if(config.url.endsWith("/config/labels")){ // an API request to get *all* labels
			return extendedTimeout; // Calls to get all labels can be slower (especially for our RTS trunking server with 14k selectors), so we give it more time.
		}
		else{
			return defaultTimeout;
		}
	}
	return {
		'request': config => {
			config.timeout = determineAppropriateTimeout(config);
			return config;
		}
	}
})
.config(function($httpProvider) { $httpProvider.interceptors.push('timeoutHttpIntercept');  });

/* Should we alert the user before leaving the page (or on page refresh)? */
app.run(function(){
	const ALERT_USER_BEFORE_NAVIGATING_AWAY = false;
	const LIKELY_IGNORED_MESSAGE = "Are you sure you want to leave?";
	Util.beforeUnload(function() {
		/* It is tempting to clean things up and log out here, 
		but those calls usually do not complete successfully so better to not depend on them */
		if(ALERT_USER_BEFORE_NAVIGATING_AWAY){
			return LIKELY_IGNORED_MESSAGE;
		}
	});
});

/* close all modals whenever we change state */
app.run(function($rootScope, $uibModalStack){
	$rootScope.$on('$stateChangeSuccess',function(event,toState,toParams,fromState,fromParams) {
		if(fromState.name != toState.name){
			$uibModalStack.dismissAll();
		}
	})
})

/* Enable setting of debug mode by looking in the query string */
app.run(function(QueryStringService,DebugService){
	if(QueryStringService.getProperty("debug")){
		DebugService.enable();
	}
})

/* Enable setting of debug mode by looking in the query string */
app.run(function(QueryStringService,EnvService,BrandingService){
	// let branding = QueryStringService.getProperty("branding");
	let props = ["logo","favicon","productName","companyName"];
	let values = props.map(QueryStringService.getProperty);
	values.forEach((v,index)=>{
		if(v != undefined){
			let propName = props[index];
			EnvService.set(propName,v);
		}
	})
	// ideally the title would update automatically whenever the company name / product name change
	// but it's a rare event in the first place so manually doing it here is okay.
	BrandingService.applyTitle();
	BrandingService.applyFavicon();
})

app.factory("ThemeService",function(BrowserStorageService){
	const DEFAULT_THEME = "dark theme";
	const DEFAULT_GL_THEME = "golden dark";
	const validThemes = ["dark theme","light theme"];

    /* This workaround helps force Chrome to load alternate stylesheets */
    const setActiveStyleSheetWorkaround = targetTitles => {
        /* Load the default theme first */
		setActiveStyleSheet(DEFAULT_THEME);
        /* Now loading our intended theme will work... */
        setActiveStyleSheet(targetTitles);
    }

	/* Provide an array of stylesheets to enable.
	All other stylesheets (that have titles) will be disabled */
    const setActiveStyleSheet = targetTitles => {
        $("link").each(function(){ // use function and not ()=> so we can use 'this' keyword
            const $element = $(this);
            const rel = $element.attr("rel");
            const title = $element.attr("title");
            if(rel.includes("style") && title){
                if(targetTitles.includes(title)){
                    $element.attr("disabled",false);
                }
                else{
                    $element.attr("disabled",true);
                }
            }
        })
    }
    const getTheme = () => BrowserStorageService.get("theme") || DEFAULT_THEME;
    const init = () => {
        const name = getTheme();
        setTheme(name);
	}
	const setTheme = themeName => {
		if(!validThemes.includes(themeName)) themeName = DEFAULT_THEME; // use default if the chosen theme is unsupported
		setActiveStyleSheetWorkaround([themeName]);
		BrowserStorageService.set("theme",themeName); // record our preference for this theme
	}
    return({
        setTheme:setTheme,
        init:init
    })
});

app.run(function(ThemeService,MicrophoneService,WebSocketService,NotificationService){
    ThemeService.init();
    try{
		// MicrophoneService.init();
        // MicrophoneService.doWithMicData(data=>{
		// 	console.log("sending mic data");
		// 	let audioSocket = WebSocketService.get("mainAudio");
		// 	audioSocket.send(data);
		// });
        // console.log("mic initialized");
    }
    catch(error){
        console.log("ERROR MICROPHONE",error);
        NotificationService.add({message:"Microphone error initializing",type:"danger"});
    }
})

/* Listen for the user hitting the android back button */
app.run(function(AndroidService,ConnectionService,ModalConfirmer){
	
	window.androidBackButtonCallback = () => {
		AndroidService.hideBackButton();
		if(ConnectionService.isLoggedIn()){
			ModalConfirmer.prompt({
				title:"Confirm logout",
				okayLabel:"Log out",
				message:"Are you sure you would like to log out?"
			}).then(ConnectionService.logoutManual);
		}
		else{
			AndroidService.openIPChooser();	
		}
	}
});

/* Listen for the user hitting the assigned push-to-talk button */
app.run(function(PTTService,NotificationService,AndroidService){
	/* Android version */
	if(AndroidService.isEnabled()){
		const androidListener = (keycode,eventString) => {

			if(PTTService.isPaused())return;

			let isDown = Util.getPropertySafe(eventString.match(/action=(\S+),/),1) == "ACTION_DOWN";
			let scanCode = Util.getPropertySafe(eventString.match(/scanCode=(\S+),/),1);
			if(scanCode == PTTService.get().scan || 
				keycode == PTTService.get().value){
				if(isDown){
					console.log("PTT MATCH DOWN!");
					PTTService.pttOn();
				}
				else{
					console.log("PTT MATCH UP!");
					PTTService.pttOff();
				}
			}
			if(PTTService.getVerbose()){
				if(NotificationService.get().length >= 1){
					NotificationService.clear();
				}
				NotificationService.add({message:"key:"+keycode+"|scan:"+scanCode+"|"+eventString,type:"success",duration:7000})
			}
		}
		AndroidService.addKeyListener(androidListener);
	}
	/* PC version */
	// else{
		$(window).on("keydown",e=>{
			if(PTTService.isPaused())return;

			if(e.key && e.key === PTTService.get().value){
				console.log("PTT MATCH ON!",e.key,PTTService.get());
				PTTService.pttOn()
			}
		})
		$(window).on("keyup",e=>{
			if(e.key && e.key === PTTService.get().value){
				console.log("PTT MATCH OFF!");
				PTTService.pttOff()
			}
		})
	// }
})

/* We can't use window.onerror since Angular already intercepts those errors, but Angular
exposes them to us here with this $exceptionHandler */
app.factory('$exceptionHandler', function() {
	return function errorCatcherHandler(exception, cause) {
		console.error(exception,cause);
		Util.logs.add("error",exception);
		if (window.OnClientError) window.OnClientError(exception);
	};
})

/*global app $ Util */
app.controller("AssignPTTController",function($scope,$uibModalInstance,PTTService,AndroidService,
    SelectorsService,NotificationService){

    const init = () => {
        /* listen while this modal is open */
        $(window).on("keydown",hearKeydown)
        AndroidService.preventFirstKey(true);
        PTTService.pause(); // Don't do normal PTT behavior while configuring
        $scope.$on("$destroy",()=>{
            $(window).off("keydown",hearKeydown);
            AndroidService.preventFirstKey(false);
            PTTService.resume(); // Resume normal PTT behavior when done configuring
        })
        /* initialize field */
        $scope.lastPressed = PTTService.get();
        AndroidService.addKeyListener(androidListener);
        $scope.chosenSelector = PTTService.getChosenSelector();

        $scope.selectorFilter = id => {
            let selector = SelectorsService.firstSelectorWithID(id);
            console.log("selectorfilter",id,selector);
            return selector && selector.TYPE !== "SELECTOR_LISTEN" && selector.TYPE !== "LISTEN";
        }
    }

    /* This listener hears key presses on a normal computer
    It also seems to hear key presses of the 'copy' button on Boxchip PTT phone */
    const hearKeydown = e=>{
        let props = [
            "altKey",
            "charCode",
            "code",
            "composed",
            "ctrlKey",
            "detail",
            "key",
            "keyCode",
            "location",
            "metaKey",
            "repeat",
            "returnValue",
            "shiftKey",
            "sourceCapabilities",
            "type",
            "which"
        ]
        let sanitizedEvent = {};
        props.forEach(prop=>sanitizedEvent[prop]=e.originalEvent[prop]);
        sanitizedEvent.logType="AssignPTTWindowListener";

        /* It seems that if the key is Unidentified, then there is no way to determine a unique
        code or name for the key. So let's not try to handle the keypress here since we can't
        possibly do the right thing. */
        if(sanitizedEvent.which == 0 || sanitizedEvent.keyCode == 0 || sanitizedEvent.key == "Unidentified"){
            return;
        }
        
        let key = e.key;
        if(key == " ") key = "Space";
        $scope.lastPressed.label = key;
        $scope.lastPressed.value = key;
        if(PTTService.getVerbose()){
            try{
                console.log("EVENT",sanitizedEvent);
                window._LTracker.push(sanitizedEvent);
            }catch(err){
                //
                console.error("couldnt log event",err);
            }
            let eventString = JSON.stringify(sanitizedEvent).slice(0,800)
            NotificationService.add({message:eventString,type:"success",duration:7000,topic:"keydown"})
        }
    }

    /*
        This listener hears key presses and updates the selected PTT button

        keycode: an int representing the key that was pressed
        eventString: a string retrieved from calling .toString on the KeyEvent. Looks like...
        KeyEvent { action=ACTION_DOWN, keyCode=KEYCODE_VOLUME_UP, scanCode=115, metaState=0, flags=0x8, repeatCount=0, eventTime=80093980, downTime=80093980, deviceId=6, displayId=0, source=0x101 }
    */
    const androidListener = (keycode,eventString) => {
        if(PTTService.isPaused()){
            try{
                console.log("android listener",keycode,eventString);
                let backupLabel = "Button " + keycode; // Backup label if we can't scrape it from the eventString
                let keycodeLabel = Util.getPropertySafe(eventString.match(/keyCode=(\S+),/),1)
                let label = backupLabel;
                if(Util.startsWith(keycodeLabel,"KEYCODE_")){
                    label = keycodeLabel.slice(8); // remove the KEYCODE_ at the beginning
                }
        
                let scanCode = Util.getPropertySafe(eventString.match(/scanCode=(\S+),/),1);
                
                $scope.lastPressed.value = keycode;
                $scope.lastPressed.label = label;
                $scope.lastPressed.scan = scanCode;
        
                if(PTTService.getVerbose()){
                    NotificationService.add({message:"key:"+keycode+"|scan:"+scanCode+"|"+eventString,type:"success",duration:7000})
                }
            }catch(e){
                if(PTTService.getVerbose()){
                    AndroidService.showToast("Android listener failed with error ")
                    setTimeout(()=>{
                        AndroidService.showToast("key: "+keycode + " | eventString: " +eventString);
                    },2000)
                }
            }
        }
    }

    $scope.clearButton = () => $scope.lastPressed = {label:"",value:"",scan:""};
    $scope.clearSelector = () => $scope.chosenSelector = undefined;

    $scope.cancel = () => {
        $uibModalInstance.dismiss();
    }
    $scope.submit = () => {
        PTTService.set($scope.lastPressed);
        PTTService.setSelector($scope.chosenSelector);
        $uibModalInstance.close();
    }

    $scope.verbose = PTTService.getVerbose()?"ON":"OFF";
    $scope.onAndroid = AndroidService.isEnabled;
    $scope.$watch("verbose",()=>{
        if($scope.verbose == "ON"){
            PTTService.setVerbose(true);
        }
        else{
            PTTService.setVerbose(false);
        }
    })
    init();
})
const AudioDecoder = (function(){  
    const INT16MAX = 0x7FFF;
    const convert16IntToFloat = (int) => int/INT16MAX;
    const convertFloatTo16Int = (float) => float*INT16MAX;
    const resample32to44_1kHz = func => (input,output) =>{
        const inputLen = input.length;
        const outputLen = output.length;
        // I have to map an input of 640 samples
        // to an output of 882 samples
        const factor = 441/320;
        const diff = outputLen - inputLen*(factor);
        if(Math.abs(diff) > 1){
            throw "mismatched array sizes converting from 32kHz to 48kHz";
        }
        // 0  1  2  3  4  5  6
        //[ ][ ][ ][ ][ ][ ][ ]
        //[ ][ ][ ][][ ][ ][ ][]
        // 0  1.3 2.7 4.1 5.5 6.8
        var j = 0;
        var k = 0;
        for(var i = 0; i < inputLen; ++i){
            j = Math.floor(i*factor);
            k = Math.floor(i*factor+0.5); //if i*factor > 0.5, also set the next value
            output[j] = func(input[i]);
            output[k] = func(input[i]);
        }
    }
    const resample32to48kHz = func => (input,output) => {
        // we are upsampling so we will have to make up data
        // we need to output 3 samples for every 2 input samples
        // so we'll just copy the 2nd sample and end up with this
        // input: [A][B] -> output: [A][B][B]

        // We'll have to calculate indices to do this mapping
        // let's look at example with the first several indices

        // input indices
        //   0    1     2    3     4    5
        // [ A ][ B ] [ C ][ D ] [ E ][ F ]
        // [A][B][B]  [C][D][D]  [E][F][F]
        //  0  1  2    3  4  5    6  7  8
        // output indices

        // so these input indices
        // 0 1 1 2 3 3 4 5 5
        // 0 1 2 3 4 5 6 7 8 
        // map to these output indices

        const inputLen = input.length;
        const outputLen = output.length;

        if(outputLen != inputLen*1.5){
            throw "mismatched array sizes converting from 32kHz to 48kHz";
        }
        const len = inputLen;

        // these samples are perfectly captured by the 32kHZ sampling
        // output[0,3,6] = input[0,2,4]
        for(let i = 0; i < len; i += 2){
            output[i*1.5] = func(input[i]);
        }

        // these samples don't exist where we want them to
        // output[1,4,7] = input[1,3,5]
        for(let i = 1; i < len; i += 2){
           output[1.5*i - 0.5] = func(input[i]);
        }
        // output[2,5,8] = input[1,3,5]
        for(let i = 1; i < len; i += 2){
            output[1.5*i + 0.5] = func(input[i]);
        }
    }
    const resample48to32kHz = () => (input,output) =>{
        // input indices
        //  0  1  2    3  4  5    6  7  8
        // [A][B][C]  [D][E][F]  [G][H][I]
        // [ A ][ C ] [ D ][ F ] [ G ][ I ]
        //   0    1     2    3     4    5
        // output indices


        // so these input indices
        //   0    2     3    5     6    8
        //   0    1     2    3     4    5
        // map to these output indices
        
        var inputLen = input.length;
        var outputLen = output.length;
        var diff = Math.abs(inputLen-outputLen*1.5);
        if(diff > 1.5){
            console.log(inputLen,outputLen);
            throw "mismatched array sizes converting from 48kHz to 32kHz";
        }
        var len = outputLen;

        // output[0,2,4] = input[0,3,6]
        for(let i = 0; i < len; i += 2){
            output[i] = INT16MAX * input[i*1.5];
        }

        // output[1,3,5] = input[2,5,8]
        for(let i = 1; i < len; i += 2){
            output[i] = INT16MAX * input[i*1.5+0.5];
        }

    }
    const resample44_1kto32kHz = func => (input,output) =>{
        const inputLen = input.length;
        const outputLen = output.length;
        // I have to map an input of 882 samples
        // to an output of 640 samples
        const factor = 320/441;
        const diff = outputLen - inputLen*(factor);
        if(Math.abs(diff) > 1){
            throw "mismatched array sizes converting from 32kHz to 48kHz";
        }
        var j = 0;
        for(var i = 0; i < inputLen; ++i){
            j = Math.ceil(i*factor);
            output[j] = func(input[i]);
        }
    }

    const resample16kto32kHz = func => (input,output) =>{
        const inputLen = input.length;
        const outputLen = output.length;
        const factor = 2;
        const diff = outputLen - inputLen*factor
        if(Math.abs(diff) > 1){
            throw "mismatched array sizes converting from 16kHz to 32kHz";
        }
        let value;
        // input index maps to pairs of output indices
        //0,1,2 -> (0,1),(2,3),(4,5)
        for(var i = 0; i < inputLen; ++i){
            value = func(input[i]);
            output[2*i] = value;
            output[2*i+1] = value;
        }
    }

    const resample32to16kHz = func => (input,output) =>{
        const inputLen = input.length;
        const outputLen = output.length;
        const factor = 0.5;
        const diff = outputLen - inputLen*factor
        if(Math.abs(diff) > 1){
            throw "mismatched array sizes converting from 32kHz to 16kHz";
        }
        // input index maps to output index
        //0,2,4 -> 0,1,2
        for(var i = 0; i < outputLen; ++i){
            output[i] = func(input[2*i]);
        }
    }


    const resamplers = {};
    resamplers[32000] = {};
    resamplers[48000] = {};
    resamplers[44100] = {};
    resamplers[16000] = {};
    resamplers[32000][16000] = resample32to16kHz;
    resamplers[32000][48000] = resample32to48kHz;
    resamplers[32000][44100] = resample32to44_1kHz;
    resamplers[48000][32000] = resample48to32kHz;
    resamplers[44100][32000] = resample44_1kto32kHz;
    resamplers[16000][32000] = resample32to16kHz;


    const hasResampler = function(inputRate,outputRate){
        if(resamplers[inputRate] && resamplers[inputRate][outputRate]){
            return true;
        }
        return false;
    }

    const getResampler = function(inputRate,outputRate,func){
        return resamplers[inputRate][outputRate](func);
    }

    const test = function(){
        const input = new Array(640);
        const converted = new Array(882);
        const convertedBack = new Array(640);
        for(let i = 0; i < 640; ++i){
            input[i] = i;
        }
        const resample1 = getResampler(32000,44100,convert16IntToFloat)
        const resample2 = getResampler(44100,32000,convertFloatTo16Int);
        resample1(input,converted);
        resample2(converted,convertedBack);

        for(let i = 0; i < 640;++i){
            if(input[i] != convertedBack[i]){
                console.log(input[i],converted[i],convertedBack[i]);
            }
        }
    }
    // test();

    return({
        hasResampler:hasResampler,
        getResampler:getResampler,
        convert16IntToFloat:convert16IntToFloat,
        convertFloatTo16Int:convertFloatTo16Int
    })
    

})()


/* global app $ Util */
app.controller('ControlPanelController',
function($scope, AuthenticatorService, ProgressBarService, GoldenLayoutService, PaneService, NotificationService,
    WebRTCVideoStreamingService, UIService, AudioPlayerService, ClientStatisticsService, DispatchService,
    StylesheetService, SelectorsService,ConnectionService, MyLabelService, PreferenceService, StateService, LevelsService,
    VideoWallService, VideoWallChooserService, PublishStreamService,TimeService, EnabledService) {
    
    const updateVideoStreamersRate = 3500; // ms
    const longPressDuration = 250; // ms
    const videoPreviewMoveRate = 70; // ms
    const LEVELS_DEBOUNCE_TIME = 500; // ms. Events are fired every tick of the slider changing. Wait for no this period of no changes before we actually send an update to the server

    let stats = {};
    $scope.selectors = [];
    $scope.selectorsWithVideos = [];
    let selectorsWithVideos = Util.Set();
    $scope.selectorsToPublish = [];
    $scope.videoWall = [];
 
    $scope.selectorsToNotPublish = [];
    let selectorsToPublish = Util.Set();
    let selectorsToNotPublish = Util.Set();

    VideoWallChooserService.obs.add.on(id=>{
        setSelectorViewModelProperty(id,"videoWallSelected",true);
    })
    VideoWallChooserService.obs.remove.on(id=>{
        setSelectorViewModelProperty(id,"videoWallSelected",false);
    })
    
    function getSelectorViewModel(id){
        return Util.findElementWithProperty($scope.selectors,"ID",id);
    }
    function setSelectorViewModelProperty(id,propName,propValue){
        let selectorViewModel = getSelectorViewModel(id);
        if(selectorViewModel){
            selectorViewModel[propName] = propValue;
        }
    }

    function copySelector(s){
        return Util.deepCopy(s);
    }
    function addVideoToVideoWall(id){
        console.log("add video to video wall",id);
        selectorsWithVideos.add(id); // for old drag and drop
        // for newer publish
        // playVideoWallVideoByID(id);
        // $scope.videoWall.push(SelectorsService.selectorWithID(id));
    }
    function removeVideoFromVideoWall(id){
        selectorsWithVideos.remove(id); // for old drag and drop
        // for newer publish
        // let index = $scope.videoWall.findIndex(e=>e&&e.ID == id);
        // if(index !== -1){
        //     $scope.videoWall.splice(index,1);
        // }
    }
    function monitorActiveStreams(){
        VideoWallService.ids.obs.add.off(addVideoToVideoWall)
        VideoWallService.ids.obs.add.on(addVideoToVideoWall)
        VideoWallService.ids.obs.remove.off(removeVideoFromVideoWall)
        VideoWallService.ids.obs.remove.on(removeVideoFromVideoWall)
    }

    /* policies: 
        ignore LATCH_DISABLE on labels, just go with what is on the SELECTOR
        LATCH_DISABLE affects talk and listen
    */
    /* $scope.selectors references an object stored and managed in the SelectorsService */
    const init = () => {
        SelectorsService.reset(); // services don't get reset if we log out and back in, so this is how we reset SelectorsService
        DispatchService.reset();
        loadSelectors().then(()=>{
            if(DispatchService.isEnabled())initDispatch();
            monitorActiveStreams();
        })
        let statsRepeater = Util.repeater(updateStatistics,Util.getClientStatisticsRefreshInterval());
        statsRepeater.destroyWithScope($scope);
        AudioPlayerService.init();
        initializeGoldenLayout();
        /* Only request statistics while Analytics pane is open */
        GoldenLayoutService.onContentItemActive("mainStack","analyticsPane",statsRepeater.start,statsRepeater.stop)
        GoldenLayoutService.onContentItemActive("mainStack","streamSelectionPane",()=>{
            VideoWallService.open.set(true); // even if it was already known to be open (after logout and login)
        },()=>{
            VideoWallService.open.set(false);
        })
        /* Keep track of which selectors have videos for the stream selection pane */
        // $scope.$watch("selectors",updateStreamableSelectors);
        implementColors(); // Apply CSS rules based on our label's UI settings
        trackVideoStreamingActivity();
        handleScopeClosing(); // Clean up GoldenLayout when scope is destroyed
        enableUserControls();
        $scope.getStats = getStats;

        selectorsWithVideos.onAdd(id=>{
            let idString = id+"-video";
            let query = "#"+idString;
            let newdiv = $("<div>") ;
            newdiv.addClass("videoPreview");
            newdiv.attr("id",idString);
            newdiv.append($("<video style='width:100%; max-height:100%'>"));
            newdiv.append($('<i class="fa fa-refresh fa-spin wowza-spinner hidden"></i>'))
            Util.waitForElement("#streamSelectionPane").then(()=>{
                $("#streamSelectionPane > div:nth-child(1)").after(newdiv);
                // let uri = SelectorsService.selectorWithID(id).label.RTSP_URI;
            });
            console.log("on add selectors with videos",id);
            let ss = WebRTCVideoStreamingService.getStreamSession(id);
            Util.waitForElement(query).then(()=>{
                ss.attachToContainer($(query));
                ss.start();
                // let config = {
                //     $container:$("#"+id+"-video"),
                //     id:id+"-preview",
                //     /* we use id-preview rather than just <id> because that collides with the normal way we play videos
                //     and there is code that prevents us from trying to play the same id twice */
                //     mute:true
                // }
                // if(uri == undefined && SelectorsService.isStreaming(id)){ // no URI but streaming means it's a webrtc feed
                //     config.streamName = WebRTCVideoStreamingService.getStreamName(id);
                // }
                // else{ // video with a URI
                //     config.uri = uri;
                // }
                // VideoPlayerService.playConfig(config);
                
            })
            selectorsToNotPublish.add(id);
        })
        selectorsWithVideos.onRemove(id=>{
            let idString = id+"-video";
            let query = "#"+idString;
            $(query).remove();
        })
        selectorsToNotPublish.onChange(refreshSelectorsToNotPublish);
        // selectorsToNotPublish.onRemove(refreshSelectorsToNotPublish);
        selectorsToPublish.onChange(refreshSelectorsToPublish);
        selectorsToPublish.onAdd(id=>{
            console.log("adding class publishgin","#"+id+"-video");
            $("#"+id+"-video").addClass("publishing");
        })
        selectorsToPublish.onRemove(id=>{
            $("#"+id+"-video").removeClass("publishing");
        })
        // selectorsToPublish.onRemove(refreshSelectorsToPublish);
        $scope.onPublishDrop = function (data,event,index) {
            if(index == undefined){
                selectorsToPublish.add(data.ID); // add to end
            }
            else{
                selectorsToPublish.insertOrMove(data.ID,index); // insert where dropped
            }
            selectorsToNotPublish.remove(data.ID);
        }
        $scope.onBankDrop = function(data,event,index){
            selectorsToNotPublish.add(data.ID); // always add to end
            selectorsToPublish.remove(data.ID);
        }
        $scope.publish = fakePublishStreams;
        let previewMover = Util.repeater(movePreviews,videoPreviewMoveRate);
        previewMover.start();
        previewMover.destroyWithScope($scope);
        setupLevelsControl();
    }
    const refreshSelectorsToNotPublish = () => $scope.selectorsToNotPublish = selectorsToNotPublish.get().map(SelectorsService.firstSelectorWithID);
    const refreshSelectorsToPublish = () => $scope.selectorsToPublish = selectorsToPublish.get().map(SelectorsService.firstSelectorWithID);
    const movePreview = id => {
        let query = "#"+id+"-video";
        Util.waitForElement(query).then(()=>{
            let $placeholder = $("#"+id+"-preview .selector-bg");
            if($placeholder.length >= 1){
                let pos = $placeholder.offset();
                let width = $placeholder.width();
                let height = $placeholder.height();
                $(query).css("top",pos.top).css("left",pos.left).css("width",width).css("height",height).show();
            }
            else{
                $placeholder = $("#"+id+'-videoBank .selector-bg');
                if($placeholder.length >= 1){
                    let pos = $placeholder.offset();
                    let width = $placeholder.width();
                    let height = $placeholder.height();
                    $(query).css("top",pos.top).css("left",pos.left).css("width",width).css("height",height).show();
                }
            }
            
        })
    }
    const movePreviews = () => {
        selectorsWithVideos.get().forEach(id=>{
           movePreview(id);
        })
    }
    const fakePublishStreams = () => {
        NotificationService.add({message:"Publishing streams: [" + $scope.selectorsToPublish.map(stream=>stream.LABEL_NAME).join(",") + "]",type:"success"})
        
        let p = Util.wait(1200);
        ProgressBarService.track(p);
        p.then(()=>{
            NotificationService.add({message:"Could not publish streams (not yet implemented)"})
        })
    
    }
    const loadSelectors = () => {
        let promise = SelectorsService.refresh();
        ProgressBarService.track(promise);
        promise.then(selectors=>{
            $scope.selectors = selectors;
            console.log("SELECTORS",selectors);
        })
        promise.catch(()=>{
            AuthenticatorService.logout();
        })
        return promise;
    }
    const getGoldenLayoutDispatchContent = () => {
        return [{
                type:'column',
                isClosable:false,
                content:[{
                    id:"mainStack",
                    type: 'stack',
                    isClosable:false,
                    content:[
                        {
                            type: 'component',
                            popoutEnabled:false,
                            reorderEnabled:false,
                            isClosable:false,
                            id:"dispatchContacts",
                            title:"<img src='../img/contacts.png' class='dispatch-title'>",
                            componentName: 'dispatchContacts',
                            componentState: { templateId: 'dispatchContacts'}
                        },
                        {
                            type: 'component',
                            popoutEnabled:false,
                            reorderEnabled:false,
                            isClosable:false,
                            id:"dispatchGroups",
                            title:"<img src='../img/groups.png' class='dispatch-title'>",
                            componentName: 'dispatchGroups',
                            componentState: { templateId: 'dispatchGroups'}
                        },
                        {
                            type: 'component',
                            popoutEnabled:false,
                            reorderEnabled:false,
                            isClosable:false,
                            id:"dispatchRecents",
                            title:"<img src='../img/recents.png' class='dispatch-title'>",
                            componentName: 'dispatchRecents',
                            componentState: { templateId: 'dispatchRecents'}
                        }
                    ]
                },
                {
                    id: 'ptt',
                    title:"PTT",
                    type: 'component',
                    height:30, // % of screen (?)
                    isClosable: false,
                    reorderEnabled:false,
                    popoutEnabled:false,
                    showHeader: false,
                    componentName: 'dispatchPTT',
                    componentState: { templateId: 'dispatchPTT' }
                } 
            ]
        }]
    }
    const getStreamSelectionPaneConfig = () => {
        return {
            type: 'component',
            popoutEnabled:false,
            reorderEnabled:false,
            isClosable:false,
            id:"streamSelectionPane",
            title: "Publish Streams",
            componentName: 'streamSelectionPane',
            componentState: { templateId: 'streamSelectionPane' }
        }
    }
    const getGoldenLayoutNormalContent = () => {
        let content = [
            {
                type: 'component',
                popoutEnabled:false,
                reorderEnabled:false,
                isClosable:false,
                id:"selectorsGLPane",
                title: "Selectors",
                refreshSelectors:true,
                componentName: 'selectorsTemplate',
                componentState: { templateId: 'selectorsTemplate' }
            },
            {
                type: 'component',
                popoutEnabled:false,
                reorderEnabled:false,
                isClosable:false,
                id:"analyticsPane",
                title: "Analytics",
                componentName: 'analyticsPane',
                componentState: { templateId: 'analyticsPane' }
            }
        ];
        if(EnabledService.videoStreaming()){
            content.push(getStreamSelectionPaneConfig())
        }

        return [{
            type: 'column',
            isClosable:false, /* GL will automatically delete this row and turn it into a stack if it has just one element later on. This prevents that */
            content: [{
                type:'row',
                isClosable:false,
                content:[{
                    id:"mainStack",
                    type: 'stack',
                    isClosable:false,
                    content:content
                }]
            }],
        }]
    }
    const initializeGoldenLayout = () => {
        let GLContent;
        if(DispatchService.isEnabled()){
            GLContent = getGoldenLayoutDispatchContent();
        }
        else{
            GLContent = getGoldenLayoutNormalContent();
        }
        const GLSettings = {
            // showPopoutIcon:false,
            showMaximiseIcon:false
            // hasHeaders:false
        }
        GoldenLayoutService.config({content:GLContent,settings:GLSettings},$("#controlPanelPane"));
        GoldenLayoutService.register($scope,"dispatchGroups","views/dispatchGroup.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"dispatchContacts","views/dispatchContacts.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"dispatchRecents","views/dispatchRecents.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"dispatchPTT","views/dispatchPTT.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"streamSelectionPane","views/streamSelectionPane.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"streamBox","views/streamBox.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"analyticsPane","views/analyticsPane.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"selectorsTemplate","views/selectorsPane.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"videoTemplate","views/videoPane.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"videoContainer","views/videoContainer.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"dialPad","views/dialPad.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"gumTemplate","views/gum.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.register($scope,"wowzaStreamTemplate","views/wowzaStream.html?v="+window.vcomBuildVersion);
        GoldenLayoutService.init();

        /* For the normal(non-dispatch) view, only show Stream Selection pane if video streaming is enabled
        We can't just modify the GLContent variable above because a user may have their layout saved
        in local storage without video streaming enabled, then reopen the page with video streaming enabled
        and GLContent is ignored in favor of the saved layout. */
        if(!DispatchService.isEnabled() && EnabledService.videoStreaming()){
            // ensure stream selection pane exists
            if(!GoldenLayoutService.get("streamSelectionPane")){
                GoldenLayoutService.get("mainStack").addChild(getStreamSelectionPaneConfig())
            }
        }
        else{
            GoldenLayoutService.remove("streamSelectionPane");
        }
    }
    const trackVideoStreamingActivity = () => {
        let whosStreamingMonitor = Util.repeater(SelectorsService.updateVideoStreamers,updateVideoStreamersRate);
        whosStreamingMonitor.start();
        whosStreamingMonitor.destroyWithScope($scope);
    }
    /* When we log out, clean up existing components */
    const handleScopeClosing = () => {
        $scope.$on("$destroy",()=>{
            GoldenLayoutService.callAllOnCloseFunctions()
        })
    }

    
    const updateStatistics = () => {
        ClientStatisticsService.getClientStatistics().then(result=>{
            result.data.forEach(stat=>{
                stats[stat.ID] = stat;
            })
        })
    }
    const getStats = id => {
        return stats[id];
    }
/*
{
  "UI_TOP_BORDER_BACKGROUND_COLOR":"0xff2b1500",
  "UI_BOTTOM_BORDER_BACKGROUND_COLOR":"0xff000000",
  "UI_SELECTOR_WINDOW_BACKGROUND_COLOR":"0xff2b1500",
  "UI_SELECTOR_NORMAL_TEXT_FOREGROUND_COLOR":"0xff00ffff",
  "UI_SELECTOR_NORMAL_TEXT_BACKGROUND_COLOR":"0xff2b1500",
  "UI_SELECTOR_ILLUMINATED_TEXT_FOREGROUND_COLOR":"0xff000000",
  "UI_SELECTOR_ILLUMINATED_TEXT_BACKGROUND_COLOR":"0xffffffff",
  "UI_SELECTOR_DISABLED_TEXT_FOREGROUND_COLOR":"0xffaaaaaa",
  "UI_SELECTOR_DISABLED_TEXT_BACKGROUND_COLOR":"0x00000000",
  "UI_SELECTOR_VERTICAL_SPACING":4,
  "UI_SELECTOR_HORTIZONTAL_SPACING":5}
*/
    const implementColors = () => {
        UIService.loadSettings().then(settings=>{
            console.log("UI SETTINGS",settings);
            StylesheetService.addRule(".lm_header","background-color",settings.UI_TOP_BORDER_BACKGROUND_COLOR);
            // bottom border has no analogous entity in web VCP
            StylesheetService.addRule("#controlPanelPane","background-color",settings.UI_SELECTOR_WINDOW_BACKGROUND_COLOR);
            // normal selectors
            StylesheetService.addRule(".selector:not(.voiceActive) .selector-name","color",settings.UI_SELECTOR_NORMAL_TEXT_FOREGROUND_COLOR);
            StylesheetService.addRule(".selector:not(.voiceActive) .selector-bg","background-color",settings.UI_SELECTOR_NORMAL_TEXT_BACKGROUND_COLOR);
            StylesheetService.addRule(".dispatch-item:not(.voiceActive)","color",settings.UI_SELECTOR_NORMAL_TEXT_FOREGROUND_COLOR);
            StylesheetService.addRule(".dispatch-item:not(.voiceActive)","background-color",settings.UI_SELECTOR_NORMAL_TEXT_BACKGROUND_COLOR);
            // voice active selectors
            StylesheetService.addRule(".selector.voiceActive .selector-name","color",settings.UI_SELECTOR_ILLUMINATED_TEXT_FOREGROUND_COLOR);
            StylesheetService.addRule(".selector.voiceActive .selector-body","background-color",settings.UI_SELECTOR_ILLUMINATED_TEXT_BACKGROUND_COLOR);
            StylesheetService.addRule(".dispatch-item.voiceActive","color",settings.UI_SELECTOR_ILLUMINATED_TEXT_FOREGROUND_COLOR);
            StylesheetService.addRule(".dispatch-item.voiceActive","background-color",settings.UI_SELECTOR_ILLUMINATED_TEXT_BACKGROUND_COLOR);
            // disabled selectors
            StylesheetService.addRule(".selector.offline .selector-name","color",settings.UI_SELECTOR_DISABLED_TEXT_FOREGROUND_COLOR);
            StylesheetService.addRule(".selector.offline .selector-body","background-color",settings.UI_SELECTOR_DISABLED_TEXT_BACKGROUND_COLOR);
            StylesheetService.addRule(".dispatch-item.offline","color",settings.UI_SELECTOR_DISABLED_TEXT_FOREGROUND_COLOR);
            StylesheetService.addRule(".dispatch-item.offline","background-color",settings.UI_SELECTOR_DISABLED_TEXT_BACKGROUND_COLOR);
            // Spacing (disabled since these settings were not designed with the web VCP in mind)
            // StylesheetService.addRule("#selectors","row-gap",settings.UI_SELECTOR_VERTICAL_SPACING+"px");
            // StylesheetService.addRule("#selectors","column-gap",settings.UI_SELECTOR_HORTIZONTAL_SPACING+"px");

            // modification of existing styles to fit in with these changes
            StylesheetService.addRule(".lm_content","border","none");

        })
    }
    $scope.onSelectorBankScroll = () => {
        movePreviews();
    }

    $scope.videoWallPublish = function(){
        VideoWallService.publish();
    }
    $scope.selectVideoWall = function(id){
        VideoWallChooserService.toggle(id);
    }
    function playVideoWallVideoByID(id){
        if(VideoWallService.open.get()){
            let ss = WebRTCVideoStreamingService.getStreamSession(id);
            let query = "#videoWall-"+id;
            Util.waitForElement(query).then(()=>{
                // since the videoWall containers are destroyed and recreated if the streamer goes offline
                // this winds up attaching a new container every time that happens and we never get rid of them.
                ss.attachToContainer($(query)); 
                ss.start();
            });
        }
    }

    /* Publishing */
    $scope.getNamesToBePublished = function(){
        return "["+VideoWallChooserService.get().map(SelectorsService.firstSelectorWithID).filter(s=>s!=undefined).map(s=>s.name).join(",")+"]";
    }
    $scope.videoWallAtLeastOneSelected = function(){
        return VideoWallChooserService.get().length > 0;
    }
    $scope.tricircleState = "off";
    function statusHandler(id,newStatus){
        switch(newStatus){
            case "opening":
                $scope.tricircleState = "changing";
                break;
            case "open":
                $scope.tricircleState = "on";
                break;
            case "closing":
                $scope.tricircleState = "changing";
                break;
            case "closed":
                $scope.tricircleState = "off";
                break;
        }
    }
    PublishStreamService.obs.on(statusHandler);
    $scope.$on("$destroy",()=>PublishStreamService.obs.off(statusHandler));


    $scope.drag = event => {
        event.dataTransfer.setData("text", event.target.id);
    }
    const syncElements = (movingQuery,targetQuery) => {
        let m = $(movingQuery);
        let t = $(targetQuery);
        if(m.length >= 1){
            let pos = t.offset();
            let width = t.width();
            let height = t.height();
            m.css("top",pos.top).css("left",pos.left).css("width",width).css("height",height).show();
        }
    }
    const showDropzones = () => {
        syncElements("#publishDropzone","#toBePublished .dropzone-magnet");
        syncElements("#bankDropzone","#notToBePublished .dropzone-magnet");
    }
    const hideDropzones = () => {
        $("#publishDropzone").hide();
        $("#bankDropzone").hide();
    }
    const dragEnd = (id) => {
        $("#"+id+"-video").removeClass("dragging");
        hideDropzones();
    }
    $scope.onDragStart = id => {
        $("#"+id+"-video").addClass("dragging");
        $(document).one("mouseup touchend",()=>dragEnd(id));
        showDropzones();
    }
    
    /* Levels Controls */
    function setupLevelsControl(){
        $scope.onLevelChanged = Util.debounce(selector=>{
            LevelsService.setGainFromSlider(selector.ID,selector.levels);
        },LEVELS_DEBOUNCE_TIME);
        $scope.levelsMax = LevelsService.sliderMax;
        $scope.levelsMin = LevelsService.sliderMin;
        $scope.levelsStep = LevelsService.sliderStep;
        LevelsService.updateVisibility(); // check if the user wants to see level controls and show them if so
    }

    /* User Controls:
        Opening and closing video streams
        Short/Long clicking on selectors
    */
    const enableUserControls = () => {
        /* Opening and closing video stream */
        let openVideoStream = selector => {
            console.log("OPENING VIDEO STREAM",selector);
            let streamLabel = selector.name;
            let streamName = WebRTCVideoStreamingService.getStreamName(selector.ID);

            console.log("streamName",streamName)
            let config = {
                id:selector.ID,
                title:streamLabel,
                streamName:streamName,
                contentType:"wowzaStream",
                popoutEnabled:false,
                pbs:false,
                type:'component',
                componentName:'wowzaStreamTemplate',
                componentState:{templateId:'wowzaStreamTemplate',id:selector.ID},
                /* If the user closes the window manually, make note. */
                onClose:()=>{
                    selector.videoActive = false;
                }
            };
            console.log("config",config);
            PaneService.open(config);
            selector.videoActive = true;
        }
        let closeVideoStream = selector => {
            GoldenLayoutService.remove(selector.ID);
            selector.videoActive = false;
        }
        $scope.closeStreamWithID = id => {
            GoldenLayoutService.remove(id);
            SelectorsService.setSelectorProperty("videoActive",false);
        }
        $scope.toggleStreamWindow = id => {
            let s = SelectorsService.firstSelectorWithID(id);
            if(s.videoActive){
                closeVideoStream(s);
            }
            else{
                openVideoStream(s);
            }
            return;
        }

        /* Clicking on selectors */
        const whenPressed = (id,side) => {
            let selector = SelectorsService.selectorWithRandID(id);
            AudioPlayerService.unlock();
            let f = selector.leftClick;
            if(side=="right")f = selector.rightClick;
            f("press");
        }
        const whenReleased = (id,side) => {
            let selector = SelectorsService.selectorWithRandID(id);
            let f = selector.leftClick;
            if(side=="right")f = selector.rightClick;
            f("longRelease");
        }
        /* Handles mouse and touch events
        for 'long' presses as determined by hm-recognizer-options */
        $scope.onPressDown = (event,randID,side) => {
            // console.log("ON PRESS",event);
            event.preventDefault(); // we don't want to be highlighting or dragging stuff!        
            whenPressed(randID,side);
            let pressTime = new Date().getTime();
            // the release event is bound here, then it is unbound once ANY of mouseup, mouseleave, or touchend happen.
            $("body").once("touchend mouseup mouseleave", () => {
                let releaseTime = new Date().getTime();
                let duration = releaseTime - pressTime;
                let pressIsTooLongToLatch = duration > longPressDuration
                let latchIsDisabled = !SelectorsService.canLatch(randID)
                if(pressIsTooLongToLatch || latchIsDisabled){
                    whenReleased(randID,side) // toggle again when released
                }
                // console.log("released " + side + " side of selector " + randID);
            }); 
        }
        /* Handles mouse and touch events
        for 'short' presses as determined by hm-recognizer-options */
        $scope.onTap = (event,randID,side) => {
            event.preventDefault(); // we don't want to be highlighting or dragging stuff!
            let isActivatingTalk = false;
            let s = SelectorsService.selectorWithRandID(randID);
            let type = side=="left"?s.leftType:s.rightType;
            if(type=="talk")isActivatingTalk = true;

            // Prevent Latch if it we are trying to activate a talk and the selector is latch disabled.
            if(isActivatingTalk && !SelectorsService.canLatch(randID)){
                // visually show that we can't latch by allowing the press and quickly releasing it
                whenPressed(randID,side);
                setTimeout(()=>whenReleased(randID,side),300);
                // Util.addClassForDuration($el,"highlightPulse",700);
                // NotificationService.add({message:"Latch Disabled",topic:"LatchDisable",duration:1000})
            }
            else{
                whenPressed(randID,side);
            }
        }
    }



    /* DISPATCH */

    function initDispatch(){
        $scope.dispatchContacts = [];
        $scope.dispatchGroups = [];
        $scope.dispatchRecents = [];
        $scope.$watchCollection("selectors",updateDispatchItems); // I believe $watchers like this are destroyed when the scope is destroyed
        SelectorsService.activeOnlines.obs.change.on(updateDispatchItems);

        SelectorsService.callLog.obs.set.on(updateRecents); // update recents when we receive a new call
        updateRecents(); // initialize recents with stored old calls

        function updateDispatchItems(){
            // update contacts
            $scope.dispatchContacts = SelectorsService.getRealSelectors().filter(visibleContactFilter);
            // update groups
            $scope.dispatchGroups = SelectorsService.getRealSelectors().filter(visibleGroupFilter);
        }
        function updateRecents(){
            // update recents
            let map = SelectorsService.callLog.get();
            $scope.dispatchRecents = Object.keys(map).map(SelectorsService.firstSelectorWithID).filter(s=>s!=undefined);
        }
        function visibleContactFilter(selector){
            if(selector.ID == MyLabelService.getID()){ // don't show my own selector unless showOwnSelector is on
                if(!PreferenceService.showOwnSelector()){
                    return false;
                }
            }
            if(selector.TYPE == "SELECTOR_LISTEN"){ // don't show listen-only selectors
                return false;
            }
            if(PreferenceService.hideOfflineSelectors()){ // don't show offline selectors if hideOfflineSelectors is on
                return selector.label.IS_DISPATCH_CONTACT && !selector.offline;
            }
            else{
                return selector.label.IS_DISPATCH_CONTACT;
            }
        }
        function visibleGroupFilter(selector){ return selector.label.IS_DISPATCH_GROUP}
        function visibleRecentFilter(selector){
            return selector.obs.recentlyActive.get();
        }
        $scope.clickDispatchItem = function(labelID){
            DispatchService.toggle(labelID);
        }
        $scope.onPTTUp = function(){
            DispatchService.pttUp();
        }
        $scope.onPTTDown = function(){
            DispatchService.pttDown();
            // call onPTTUp when the touch or click ends even if no longer over the PTT button
            $("body").once("touchend mouseup mouseleave", () => { 
                $scope.onPTTUp() 
            });
        }
        $scope.timeSince = TimeService.timeSince;
        $scope.callLog = SelectorsService.callLog;
    }










    

    /* If the user navigates here directly in the URL, then this controller loads
    even if we immediately redirect them to the logon page. This check prevents
    us from going on and running a bunch of irrelevant code as if we were logged in */
    if(ConnectionService.isLoggedIn()){
        init();
    }
    else{
        /* When a user was logged in and refreshes the page, we log them out on page load.
        This winds up with them getting to the Control Panel state, but the above check
        prevents any code from running. So we have to navigate back to the logon page */
        StateService.goToLogon();
    }
});
/* global app Util $*/
app.controller('DialPadController',function($scope,NotificationService,$q,DialService,EnabledService){
    $scope.lineSelect = {};
    $scope.buttons = [1,2,3,4,5,6,7,8,9,"*",0,"#"].map(i=>{return{
        label:i,
        value:i
    }});
    $scope.buttons[9].class = "dialPad-asterisk";

    $scope.type = v => {
        $scope.dialValue += v;
        if(EnabledService.wideScreen()){
            focusDisplay(); // convenient if you want to type some
        }
    }
    $scope.backspace = () => {
        $scope.dialValue = $scope.dialValue.slice(0,-1);
        if(EnabledService.wideScreen()){
            focusDisplay(); // convenient if you want to ctrl + backspace
        }
    }
    $scope.dialValue = "";

    /* Shrink the size of the text of the displayed number as the length grows
    This way, small numbers look good and large numbers are still visible */
    // let dialLengths = [17,14,10,0]; // lengths of number written in dialpad-display
    // let dialSizes =   [0.7,0.8,1,1.4]; // em sizes of text in the dialpad-display
    let dialLengths = [15,0];
    let dialSizes = [1,1.9];
    $scope.$watch("dialValue",(newValue,oldValue)=>{
        let newLength = newValue.length;
        let oldLength = oldValue.length;
        let newIndex = dialLengths.findIndex(length => newLength >= length);
        let oldIndex = dialLengths.findIndex(length => oldLength >= length);
        if( newIndex !== oldIndex ){ // only change when the size is changed
            let newSize = dialSizes[newIndex];
            $(".dialPad-display").css("font-size",newSize+'em');
        }
    })

    const init = () => {
        let repeater = Util.repeater(refreshStatus,Util.getTelephoneStatusRefreshInterval());
        // refreshStatus();
        repeater.start();
        repeater.destroyWithScope($scope);
    }
    const getPhoneID = ()=>{
        return Util.getPropertySafe($scope,"lineSelect","selected","value");
    }
    const getNumber = () => $scope.dialValue;
    const canPlaceCall = () => {
        // const phone = getPhone();
        // const number = getNumber();
        // return (
        //     phone  // phone must exist
        //     && phone.LINE_STATE == 'ON-HOOK' // phone must be on hook
        //     && number // number must exist
        //     && typeof(number) == 'string' // number must be a string
        // )
        return $scope.selectedLineID !== undefined && getNumber().length > 0;
    }
    const placeCall = () =>{
        const id = getPhoneID();
        const number = getNumber();

        if(canPlaceCall()){
            console.log("dialing",number,"from phone",id)
            // TelephoneInterfaceService.call(phone.LINE_ID,number);
            return DialService.dial(id,number);
        }
        else{
            console.error("ERROR: not attempting to dial",number,"from phone",id,"due to canPlaceCall returning",canPlaceCall());
            return $q.reject("Could not dial number "+number);
        }
    }
    const canHangUp = () => {
        return false;//$scope.selectedLineID !== undefined;
        // const phone = getPhone();
        // return phone && phone.LINE_STATE != "ON-HOOK";
    }
    const hangUp = () => {
        NotificationService.add({message:"Hang up not yet supported",type:"danger"});
        // const phone = getPhone();
        // if(canHangUp()){
        //     TelephoneInterfaceService.disconnect(phone.LINE_ID);
        //     // alert("hang up?"+phone.LINE_ID);
        // }
    }
    const focusDisplay = () => {
        $(".dialPad-display").focus();
    }
    const refreshStatus = ()=>{
        let newList = DialService.getDialableList();
        let oldList = Util.ensureArray($scope.lineSelect.options);
        /* Mobile <select> being refreshed jarringly closes and reopens the dialog if it is already open.
        So here we only refresh it if the options have changed */
        if(!Util.equalArrays(newList.map(item=>item.value),oldList.map(item=>item.value))){
            $scope.lineSelect.options = newList;
        }
        if($scope.lineSelect.selected === undefined || $scope.lineSelect.selected === null){
            // no lines selected
            $scope.selectedLineID = undefined;
            $scope.lineSelect.selected = Util.getPropertySafe($scope,"lineSelect","options","0"); // select the first option
        }
        else{ // a line is selected
            $scope.selectedLineID = $scope.lineSelect.selected.value;
            $scope.lineSelect.selected = $scope.lineSelect.options.find(item=>item.value === $scope.selectedLineID);
        }
    }
    $scope.call = placeCall;
    $scope.hangUp = hangUp;
    $scope.canHangUp = canHangUp;
    $scope.canPlaceCall = canPlaceCall;
    init();
})

/* global app Form Util*/
app.controller('GumController',function($scope,GoldenLayoutService,GumService,ScreenshareService,
    FormModalService,WhosStreamingService, Kurento1to1, NotificationService){
    const VIDEO_BITRATE_OPTIONS = ["auto",5,30,100,360,720,1080,1440,2540];
    const DEFAULT_VIDEO_BITRATE = 0;
    let numViewers = null;
    let state = new Util.Observable();
    const init = () => {
        state.set("stopped");
        state.on(newState=>{
            if(newState == "recording"){
                $scope.tricircleState = "on";
            }
            if(newState == "stopped"){
                $scope.tricircleState = "off";
            }
            if(newState == "starting"){
                $scope.tricircleState = "changing";
            }
        })
        setTitleBase(getTopicName(true)); // capitalized
        setTitleTail("Initializing");
        $scope.clickRecordButton = clickRecordButton;
        $scope.hangup = hangup;
        $scope.showOptions = showOptions;
        $scope.onClickSwitchCamera = switchCamera;
        $scope.videoCaptured = false; // Will switch to true once we successfully open the camera
        $scope.tricircleState = "off";
        // observeRegistrationStatus();
        openMedia();
        Kurento1to1.connectToServer();
        updateNumViewers();
    }

    const updateNumViewers = () => {
        Kurento1to1.onNumViewers(number=>{
            numViewers = number;
            updateTitle();
        })
    }
    let base = "";
    let tail = "";
    const updateTitle = () => {
        if(tail){
            if(numViewers === null){
                setTitle(base+" - " + tail);
            }
            else if(numViewers === 1){
                setTitle(base+" - " + tail + " (1 viewer)");
            }
            else{
                setTitle(base+" - " + tail + " ("+numViewers+" viewers)");
            }
            // else{
            //     setTitle(base+" - " + tail);
            // }
        }
        else{
            setTitle(base);
        }
    }
    const setTitleBase = newBase => {base=newBase; updateTitle();};
    const setTitleTail = newTail => {tail=newTail; updateTitle();};

    const switchCamera = () => {
        // Alternatively: GumService.toggleFacing();
        GumService.nextCamera().then(()=>{
            restartStream();
        })
    }

    const showOptions = () => {
        let formdata = Form();
        let field;
        /* Audio on/off */
        field=formdata.get(0);
        field.modelName = "audioEnabled";
        field.label="Enable Audio";
        field.type="toggleSwitch";
        field.initialValue = GumService.isAudioEnabled()?"ON":"OFF";
        /* Bitrate */
        field=formdata.get(1);
        field.modelName = "bitrate";
        field.label="Bitrate";
        field.type="select";
        field.selectOptions = VIDEO_BITRATE_OPTIONS.map(i=>{
            if(i=="auto"){
                return {
                    label:"Auto",
                    value:0
                }
            }
            return {
                label:i + " kbps",
                value:i
            }
        })
        field.initialValue = DEFAULT_VIDEO_BITRATE+"";
        field.localStorage="gum-video-bitrate";
        /* Camera Device */
        let cameraField = formdata.get(2); // given its own variable name to be accessible in callback from GumService.getVideoDevices
        cameraField.modelName="videoDeviceID";
        cameraField.label="Camera";
        cameraField.type="select";
        cameraField.selectOptions = [{
            label:"Loading devices...",
            value:undefined
        }]
        GumService.getVideoDevices().then(results=>{
            cameraField.selectOptions = results.map((device,index)=>{
                return {
                    label:device.label || "Camera #"+index,
                    value:device.deviceId
                }
            });
            cameraField.selectOptions.push({label:"",value:""})
        }).catch(()=>{
            cameraField.selectOptions = [{
                label:"Failed to detect devices.",
                value:undefined
            }]
        })
        cameraField.localStorage="gum-video-deviceID";
        /* Share Screen */
        field = formdata.get(3);
        field.modelName="shareScreen";
        field.label="Share Screen";
        field.type="toggleSwitch";
        field.initialValue= ScreenshareService.isEnabled();

        FormModalService.open({
            title:"Configure your stream",
            form:formdata,
            submit:submitted=>{
                let old = {};
                let now = {};
                let changes = {};

                /* record previous and new states */
                old["audio"] = GumService.isAudioEnabled();
                now["audio"] = submitted.audioEnabled == "ON";
                old["maxbw"] = GumService.getBandwidthConstraints().max;
                now["maxbw"] = submitted.bitrate;
                old["minbw"] = GumService.getBandwidthConstraints().min;
                now["minbw"] = submitted.bitrate;
                old["device"] = GumService.getVideoDeviceID();
                now["device"] = submitted.videoDeviceID;
                old["share"] = ScreenshareService.isEnabled();
                now["share"] = submitted.shareScreen;
                /* apply options */
                GumService.setBandwidthConstraints(now.minbw,now.maxbw);
                if(now.audio){GumService.enableAudio();}else{GumService.disableAudio();}
                GumService.setVideoDeviceID(submitted.videoDeviceID);
                if(submitted.shareScreen == "ON"){
                    ScreenshareService.enable();
                }
                else{
                    ScreenshareService.disable();   
                }

                /* note which things changed */
                Object.keys(old).forEach(prop=>{
                    changes[prop] = old[prop] != now[prop];
                })
                /* restart broadcast/preview if need to */
                if(changes.maxbw || changes.minbw){
                    Kurento1to1.restartBroadcast().then(withBroadcastSession); // bandwidth params need to be present before SDP exchange
                }
                if(changes.audio || changes.device || changes.share){
                    restartStream();
                }
            }
        })
    }

    const restartStream = () => {
        GumService.invalidateCurrentStreams(); // necessary for openMedia to actually trigger getUserMediaHard
        openMedia().then(Kurento1to1.useUserMediaForBroadcast); // calling restartStream and openMedia at the same time was causing 2 separate calls to getUserMediaHard
    }

    const clickRecordButton = () => {
        console.log("click record button");
        if(!$scope.videoCaptured){
            return;
        }
        if(["stopped"].includes(state.get())){
            streamVideo().catch(onStreamFailToStart)
        }
        else if(["recording","starting"].includes(state.get())){ // we are recording or starting to record, so hang up
            hangup();
        }
    }

    const streamVideo = () => {
        setTitleTail("Preparing to stream");
        state.set("starting");
        return Kurento1to1.connectToServer().then(Kurento1to1.broadcast).then(withBroadcastSession);
    }
    const withBroadcastSession = session => {
        session.obs.connected.on(onStreamSuccess)
        session.obs.disconnected.on(onStreamDisconnected);
        session.obs.failed.on(onStreamFailToStart);
        session.obs.closed.on(onStreamClose)
    }
    const onStreamFailToStart = (e) => {
        setTitleTail("Unable to start stream. Couldn't connect to streaming server.");
        console.error("Couldn't start stream",e); // this error event is useless
        state.set("stopped");
        WhosStreamingService.reportMyStreamOff();
    }
    const onStreamDisconnected = () => {
        setTitleTail("Stream disconnected. Attempting to restart.");
        state.set("starting");
    }

    const onStreamSuccess = () => {
        setTitleTail("Streaming");
        state.set("recording");
        WhosStreamingService.reportMyStreamOn();
    }
    const onStreamClose = () => {
        numViewers = null;
        setTitleTail("Hung up. Ready to stream");
        state.set("stopped");
        WhosStreamingService.reportMyStreamOff();
    }
    const hangup = () => {
        Kurento1to1.stopBroadcast(); // we can still be watching streams, but we should close ones where we are broadcasting
    }
    const handleStreamsGotten = streams => {
        if(state.get() == "recording"){
            setTitleTail("Previewing stream");
        }
        $scope.videoCaptured = true;
        let localVideoPreview = document.getElementById("localVideoPreview");         
        if(localVideoPreview){
            localVideoPreview.srcObject = streams.video;
        }
    }
    const handleMediaFailed = e => {
        $scope.videoCaptured = false;
        NotificationService.add({message:"Could not access " + getMediumName() + ". " + e,type:"danger"});
        setTitleBase(getTopicName(true) + " Error");
        setTitleTail("Could not access " + getMediumName());
        throw "Could not access "+getMediumName();
    }
    let openMedia = () => {
        return GumService.getVideoPreviewElement().then(GumService.getStreams).then(handleStreamsGotten).catch(handleMediaFailed);
    }
    const setTitle = x => GoldenLayoutService.getGum().setTitle(x);
    function getMediumName(capitalized){
        let medium = "camera";
        let Medium = "Camera";
        if(ScreenshareService.isEnabled()){
            medium = "screen";
            Medium = "Screen";
        }
        if(capitalized) return Medium;
        return medium;
    }
    function getTopicName(capitalized){
        let topic = "webcam";
        let Topic = "Webcam";
        if(ScreenshareService.isEnabled()){
            topic = "screen share";
            Topic = "Screen Share";
        }
        if(capitalized) return Topic;
        return topic;
    }
    init();
})

/* global app Util*/
app.controller('HeaderController',
function( $scope, EnvService, ConnectionStatusService, EnabledService, TroubleshootService, BrandingService, PlatformService,
    $interval, AuthenticationService, LogoService, ControlPanelTestingService,ConnectionService, MasterVolumeService,
    NotificationService, DebugService, ProgressBarService, StateService, MenuService, MobileMenuService) {

    /* Expose to Scope */
    $scope.userName =               userInfo("DISPLAY_NAME");
    $scope.logout =                 ConnectionService.logoutManual;
    $scope.testFunctions =          Util.objectToArray(ControlPanelTestingService);
    $scope.getLogoSrc =             LogoService.getSrc;
    $scope.getMobileMenuAction =    ()=>MobileMenuService.isOpen()?"Close":"Open";
    $scope.BrandingService =        BrandingService;

    /* Expand and collapse the header controls (for mobile) */
    $scope.expand = () => MobileMenuService.openMainMenu();
    $scope.collapse = () => {
        MobileMenuService.close();
        return true;
    }
    /* Desktop menu functions */
    $scope.themes =                  MenuService.getThemesMenu();
    $scope.videoDropdown =           MenuService.getAddViewMenu();
    $scope.advancedDropdown =        MenuService.getAdvancedMenu();
    $scope.troubleshootingDropdown = MenuService.getTroubleshootMenu();




    /* Notification Handling */
    let updateNotifications = () => {
        $scope.notifications = NotificationService.get();
    }
    $scope.$watchCollection(NotificationService.get,updateNotifications);
    let handle = $interval(updateNotifications,1000); // when logged out, watch collection seems to stop working
    $scope.$on('$destroy',()=>$interval.cancel(handle)); // so we can just check every second anyway.
    
    /* Progress bar */
    $scope.$watch(ProgressBarService.get,()=>{
        $scope.showProgressBar = ProgressBarService.isVisible();
        $scope.progressBarStatus = ProgressBarService.get();
    })
    $scope.clearProgressBar = function(){ProgressBarService.clear()}

    /* Spinner */
    $scope.$watch(ProgressBarService.getSpinner,()=>{
        $scope.showSpinner = ProgressBarService.getSpinner() != "hidden";
    })
    /* Connection Status */
    let updateConnectionStatus = () => {
        $scope.successes = ConnectionStatusService.getTotalSuccesses();
        $scope.failures = ConnectionStatusService.getTotalFailures();
        $scope.failureLevel = Math.min(ConnectionStatusService.getFailuresSinceSuccess(),5);
        $scope.showConnectionStatus = true;
    }
    $scope.$watch(ConnectionStatusService.getTotalSuccesses,updateConnectionStatus);
    $scope.$watch(ConnectionStatusService.getTotalFailures,updateConnectionStatus);
    /* Debug Status */
    $scope.isDebug = DebugService.isEnabled;
    
    /* Helper Functions */
    function userInfo(){ return AuthenticationService.getUserInfo(...arguments)}
    const systemSupport = prop => userInfo('systemSupport',prop);
    const isMasterSystemAdministrator = () => {
        return userInfo('auths','accessLevel') == 0;
    }
    let isLoggedIn =        () => ConnectionService.isLoggedIn();
    let isTIF =             () => AuthenticationService.isTIF();
    let hasTrunking =       () => AuthenticationService.hasTrunking();
    let isOnControlPanel =  () => StateService.getCurrentState() == "controlPanel"
    let isNotTIF =          () => !isTIF();
    let isSimpleTIF =       () => isTIF() && simpleMenu;
    let isNotSimpleTIF =    () => !isSimpleTIF();
    let showHeader =        () => isOnControlPanel() || DebugService.isEnabled()
    let wideHeader =        () => showHeader() && !isThin();
    
    $scope.showLogoutMenu =             () => wideHeader();
    $scope.showThemeMenu =              () => wideHeader();
    $scope.showAddViewMenu =            () => wideHeader();
    $scope.showAdvancedDropdown =       () => wideHeader() && EnabledService.advancedDropdown();
    $scope.showTroubleshootDropdown =   () => wideHeader() && !TroubleshootService.allIsWell();
    $scope.showMasterVolume =           () => isOnControlPanel() && PlatformService.isPi();

    /* Here we determine which menu options are visible */
    /* Misc */
    $scope.showDefaultHeader =  () => showHeader() && isNotTIF();
    $scope.showTIFHeader =      () => showHeader() && isTIF();
    $scope.showDropdown =       () => showHeader();
    $scope.showDev =            () => EnvService.isDevelopment() || DebugService.isEnabled();
    /* TIF stuff */
    let simpleMenu = true;
    $scope.isTIF =                  () => isTIF();
    $scope.isSimpleTIF =            () => isSimpleTIF()
    $scope.showAdvancedSettings =   () => simpleMenu = false;
    $scope.hideAdvancedSettings =   () => simpleMenu = true;

    /* System Maintenance */
    $scope.showSystemMaintenance =  () => isNotSimpleTIF() // parent of the items below
    $scope.showFailover =           () => EnabledService.failover();
    $scope.showRestartSystem =      () => EnabledService.restart();
    $scope.showLicense =            () => true;
    $scope.showSSL =                () => isMasterSystemAdministrator();

    /* System Configuration */
    $scope.showSystemConfiguration =            () => isNotSimpleTIF() // parent of the items below
    $scope.showSystemSettings =                 () => true;
    $scope.showClientConfigurationList =        () => true;
    $scope.showGroupConfigurationList =         () => true;
    $scope.showRemoteConfiguration =            () => hasTrunking();
    $scope.showUserInterfaceSettings =          () => systemSupport('supportsUserInterfaceSettings');
    $scope.showVirtualRealityConfiguration =    () => true;

    /* System Information */
    $scope.showSystemInformation =  () => isNotSimpleTIF() // parent of the items below
    $scope.showSystemStatus =       () => true; // for Mobile and TIF
    $scope.showClientStatistics =   () => true;
    $scope.showSipRegistrations =   () => true;
    $scope.showGeolocation =        () => AuthenticationService.hasGeo();
    $scope.showActivityLog =        () => true;
    $scope.showDebugLog =           () => userInfo('debug') == true;

    /* Master Volume */

    $scope.masterVolumeModel = MasterVolumeService.getPercent();
    $scope.onMasterVolumeSliderChanged =  () => {
        MasterVolumeService.setPercent($scope.masterVolumeModel);
    }
    
    /* Mobile */
    let isThin = () => !EnabledService.wideScreen();
    $scope.thinScreen = () => isThin();
    $scope.showBottomMenu = () => isThin() && showHeader();

});

/* global app */
app.factory("MicrophoneService",function(AudioSignalingService,NotificationService){
    let storedStream;
    let storedPromise;
    const enable = () => {
        /* We already have the stream, resolve with it */
        if(storedStream){
            return Promise.resolve(storedStream);
        }
        /* Already in the middle of trying to enable the mic? just return the existing promise */
        if(storedPromise){
            return storedPromise
        }
        /* Try to enable the mic */
        let promise;
        try{
            promise = navigator.mediaDevices.getUserMedia({audio:true,video:false});
        }catch(e){
            promise = Promise.reject("Browser has disallowed access of navigator.mediaDevices. Are you on HTTPS?");
        }
        storedPromise = promise;
        promise.then(onStreamGot).catch(onGumFail);
        promise.finally(()=>storedPromise = undefined);
        return promise;
    }
    const onStreamGot = stream => {
        console.log("got microphone stream",stream);
        storedStream = stream;
        AudioSignalingService.setStream(stream);
        storedPromise = undefined;
        return stream;
    }
    const onGumFail = e => {
        NotificationService.add({message:"Could not access microphone. " + e,type:"danger"});
    }
    const disable = () => {
        /* If we are currently enabling it, disable it at the end */
        if(storedPromise){
            storedPromise.finally(disable);
        }
        /* If the stream exists, clear the tracks */
        if(storedStream){
            storedStream.getTracks().forEach(track=>track.stop());
            storedStream = undefined;
        }
    }
    const getStream = () => storedStream;
    return {
        enable,
        disable,
        getStream
    }
})


/* global app */
app.controller("WaitingRoomController",function($scope,StateService,$q,AudioWebSocketService,
    ProgressBarService,MyLabelService,SystemSettingsService
    , NotificationService, BackgroundProcessService, ConnectionService
    ,FailoverService
    ){

    const init = () => {
        console.log("waiting room initialization");
        try{
            verifyConnection()
            .then(proceedToControlPanel)
            .catch(goBackToLogon)
        }catch(e){
            goBackToLogon();
        }
        
    }
    const testWebsocket = () => {
        return AudioWebSocketService.open().then((socket)=>{
            console.log("opened socket",socket);
            return new Promise((res,rej)=>{
                setTimeout(()=>{
                    if(socket.isOpen()){
                        console.log("websocket verified open");
                        res();
                    }
                    else{
                        console.log("websocket couldn't stay open")
                        rej();
                    }
                },100)
            })
        })
        .catch(()=>{
            console.log("websocket couldn't open")
            return $q.reject();
        })
    }
    
    const verifyConnection = () => {
        console.log("verify connection");
        if(!ConnectionService.isLoggedIn()){
            return Promise.reject("not logged in");
        }
        let promises = [
            testWebsocket(),
            loadMyLabel(),
            SystemSettingsService.pull(),
            FailoverService.updateSecondaryIsActive(),
            NotificationService.clear(),
            BackgroundProcessService.startAll()
        ]
        let promise = $q.all(promises);
        ProgressBarService.track(promise,{showFailure:false,showSuccess:false});
        return promise;
    }
    const loadMyLabel = () => MyLabelService.refreshVCP();

    const proceedToControlPanel = () => StateService.goToControlPanel();
    const goBackToLogon = StateService.goToLogon;
    
    /* Trigger this every time we enter the waiting room */
    $scope.$on('$viewContentLoaded', function() {
        init();
    });
})
/* global app Loader */
app.controller("WebsocketTroubleshootController",function($scope,TroubleshootService,AudioPlayerService,AudioSignalingService,AudioWebSocketService){
    /* Web Audio */
    $scope.initializeWebAudio = () => {
        AudioPlayerService.init()
    }
    $scope.getWebAudioStatus = () => TroubleshootService.getStatus("audioPlayer");
    
    /* Audio Websocket for signaling */
    let wsloader = Loader($scope,"ws");
    $scope.getWebSocketStatus = () => TroubleshootService.getStatus("websocket");
    $scope.reconnectWebSocket = () => wsloader.track(AudioWebSocketService.open());
    $scope.disconnectWebSocket = () => AudioWebSocketService.close();
    $scope.getLog = () => {
        let x = TroubleshootService.getLogs("websocket");
        // console.log("logs:",x);
        return x;
    }

    /* WebRTC Audio */
    $scope.getWebRTCStatus = ()=>TroubleshootService.getStatus("webrtcAudio");
    $scope.reconnectWebRTC = AudioSignalingService.refresh;
    $scope.disconnectWebRTC = AudioSignalingService.disconnect;

    /* Echo */
   
    // let echoObservable = AudioSignalingService.getEchoObservable();
    // $scope.echoMode = echoObservable.get()?"ON":"OFF";
    // $scope.$watch("echoMode",newVal=>{
    //     if(newVal == "ON"){
    //         echoObservable.set(true);
    //     }
    //     else{
    //         echoObservable.set(false);
    //     }
    // })
})
/* global app $ */
app.controller('WowzaStreamController',function($scope,SelectorsService,PaneService,EventService,PublishStreamService){
    $scope.setID = newID => {
        SelectorsService.waitUntilReady().then(()=>{
            $scope.selector = SelectorsService.firstSelectorWithID(newID);
            $scope.id = newID;
        })
    }
    
    const init = () => {
        SelectorsService.onToggleListen((id,newState)=>{
            if(newState){
                $("#"+id+".wowzaStream").addClass("listenActive");
            }
            else{
                $("#"+id+".wowzaStream").removeClass("listenActive");
            }

        })
        SelectorsService.onToggleTalk((id,newState)=>{
            if(newState){
                $("#"+id+".wowzaStream").addClass("talkActive");
            }
            else{
                $("#"+id+".wowzaStream").removeClass("talkActive");
            }

        })
        /* Publishing */
        $scope.tricircleState = "off";
        $scope.clickPublishButton = function(){
            // console.log("toggle publish",$scope);
            PublishStreamService.toggleID($scope.id);
        }

        function statusHandler(id,newStatus){
            // let id = PublishStreamService.obs.id.get();
            if(id != $scope.id) return; // some other controller will handle this
            switch(newStatus){
                case "opening":
                    $scope.tricircleState = "changing";
                    break;
                case "open":
                    $scope.tricircleState = "on";
                    break;
                case "closing":
                    $scope.tricircleState = "changing";
                    break;
                case "closed":
                    $scope.tricircleState = "off";
                    break;
            }
        }
        PublishStreamService.obs.on(statusHandler);
        $scope.$on("$destroy",()=>PublishStreamService.obs.off(statusHandler));
    }
    /* Note: these functions refer to clicking the left or right SIDE of a selector.
    not the left or right button on the mouse. We don't care about the right mouse button.*/
    $scope.onLeftClick = (e) => {
        if(e.which != 1) return; // ignore middle & right clicks
        $scope.selector.leftClick();
    }
    $scope.onRightClick = (e) => {
        if(e.which != 1) return; // ignore middle & right clicks
        $scope.selector.rightClick();
    }

    $scope.onMaximizeButtonClicked = ()=>{
        PaneService.toggleMaximize($scope.id);
    }
    
    init();
})

/* global app Android */
app.factory("AndroidService",function($q){
    let and;
    let ready = false;
    let initializingPromise;
    let preferences = {};
    /* These values will be loaded as the app initializes */
    let knownStringPreferences = ["loginName","loginPass","configuration-hostname","configuration-port","configuration-HTTPS","login-guest-mode"]
    let knownObjPreferences = ["pttKey","pttSelector"];

    const init = () => {
        window.androidCallbackFunctions = [];
        /* this callback is triggered whenever we call Android.getPreference or Android.getObject */
        window.androidGotPreference = function(prefName,value,isObject){
            if(isObject){
                let obj = {};
                try{
                    obj = JSON.parse(value);
                }catch(e){}
                preferences[prefName] = obj;
            }
            else{
                if(value == null || value == "null"){
                    value = "";
                }
                preferences[prefName] = value;
            }
        }
        try{
            and = Android;
            // Util.logs.capture(); // Only capture logs if we are on Android
        }
        catch(error){
            // do nothing
            ready = true;
            return Promise.reject("We don't seem to be on Android");
        }

        /* initialize settings on load */
        initializingPromise = loadAll().then(()=>ready=true);
        return initializingPromise;
    }
    
    const addKeyListener = listener => {
        if(!and) return;
        window.androidCallbackFunctions.push(listener);
    }

    /* Takes a bool and if it's true, then the first key press won't do what it normally does
    but the second key press in a row will resume normal function */
    const preventFirstKey = (bool) => {
        if(!and) return;
        and.preventFirstKey(bool);
    }
    /* prevents this key from doing what it would normally do */
    const overrideKeycode = keycode => {
        if(!and) return;
        and.overrideKeycode(keycode);
    }
    const showToast = msg => {
        if(!and)return;
        and.showToast(msg);
    }
    const isEnabled = () => !!and;

    /* store a preference */
    const setPreference = (prefName,value)=>{
        if(!and) return;
        if(typeof value == "object"){
            return setObj(prefName,value);
        }
        and.setPreference(prefName,value);
        preferences[prefName] = value;
    }
    const setObj = (objName,obj) => {
        if(!and) return;
        let str = "";
        try{
            str = JSON.stringify(obj);
        }catch(e){};
        and.setObj(objName,str);
        preferences[objName] = obj;
    }
    /* returns a promise that resolves with the stored preference */
    const loadPreference = (prefName) => {
        if(!and) return;
        return new Promise((resolve,reject)=>{
            and.getPreference(prefName); // note this is the Android.getPreference function defined in the Android app's webappinterface
            setTimeout(()=>{
                resolve(preferences[prefName]);
            },100)
        })
    }
    const loadObj = prefName => {
        if(!and) return;
        return new Promise((resolve,reject)=>{
            and.getObj(prefName);
            setTimeout(()=>{
                resolve(preferences[prefName]);
            },100)
        })
    }
    const getPreference = prefName => {
        if(!and){
            return;
        }
        return preferences[prefName];
    }
    const loadAll = () => {
        return $q.all([
            ...knownObjPreferences.map(loadObj),
            ...knownStringPreferences.map(loadPreference)
        ])
    }
    const openIPChooser = () => {
        if(!and){
            return;
        }
        and.openIPChooser();
    }
    const waitUntilReady = () => {
        if(!ready){
            if(initializingPromise){
                return initializingPromise;
            }
            else{
                return init();
            }
        }
        else{
            return Promise.resolve();
        }
    }
    const broadcastIntent = name => {
        if(!and)return;
        and.broadcastIntent(name);
    }
    const hideBackButton = () => {
        if(!and)return;
        and.hideBackButton();
    }
    return {
        showToast,
        openIPChooser,
        loadAll,
        addKeyListener,
        preventFirstKey,
        overrideKeycode,
        getPreference,
        setPreference,
        waitUntilReady,
        broadcastIntent,
        hideBackButton,
        isEnabled
    }
})
/* global app AudioDecoder */
app.factory("WebAudioService",function(EventService, NotificationService){
    let initialized = false;
    let unlocked = false;
    let audioCtx;

    const init = () => {
        if(initialized)return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // audioCtx = new window.AudioContext();
        if(!audioCtx){
            EventService.emit("audioPlayerError","Browser does not support HTML5 Web Audio API");
            throw "AudioPlayer Error: your browser doesn't support web audio";
        }
        EventService.emit("audioPlayerInitialized");
        initialized = true;
    }

    /* iOS devices require an additional step to enable HTML5 WebAudio
    we use the 'context.resume()' function below to do the unlocking.
    This function should be called as the result of a user interaction like clicking */
    function webAudioTouchUnlock (context)
    {
        return new Promise(function (resolve, reject)
        {
            if (context.state === 'suspended' && 'ontouchstart' in window)
            {
                var unlock = function()
                {
                    context.resume().then(function()
                    {
                        document.body.removeEventListener('touchstart', unlock);
                        document.body.removeEventListener('touchend', unlock);
    
                        resolve(true);
                    }, 
                    function (reason)
                    {
                        reject(reason);
                    });
                };
    
                document.body.addEventListener('touchstart', unlock, false);
                document.body.addEventListener('touchend', unlock, false);
            }
            else
            {
                resolve(false);
            }
        });
    }

    const getContext = () => audioCtx;
    const unlock = () => {
        if(unlocked)return;
        if(!initialized)init();

        webAudioTouchUnlock(audioCtx).then((result)=>{
            // NotificationService.add({message:"Unlocked web audio" + result,type:"success"});
            unlocked = true;
        })
        .catch((reason)=>{
            NotificationService.add({message:"Failed to unlock webaudio. " + reason });
        })
    }
    unlock(); // Not sure if this is necessary, but it is another opportunity that unlock might work...
    // I may come back and make this more like a prompt that comes up so we can get a user click
    return {
        init,
        getContext,
        unlock
    }
})

app.factory("AudioPlayerService",function(EventService,WebAudioService,ModalConfirmer){
    // Parameters
    // fiddle with these
    const numberOfBuffers = 100;
    const fullVolume = 4.0;
    // these probably stay the same
    const channels = 1;
    const timeSlice = 20;//ms
    const inputSampleRate = 32000;//samples per second

    

    var gainNode;
    var circ;
    var resample;
    var audioElement; //HTMLAudioElement that we redirect through to switch speakers
    var initialized = false;
    let storedStream; // stored Media stream to be played on a global <audio> element

    const DEFAULT_BUFFER_TIME = 20;//ms
    var audioBufferTime = DEFAULT_BUFFER_TIME;//ms  This is how much audio we buffer before playing
    const setBufferTime = ms => {console.log("buffer time set to ",ms); audioBufferTime = ms;}

    const init = () => {
        WebAudioService.init();
        if(initialized)return;
        let audioCtx = WebAudioService.getContext();
        const computerSpeakers = audioCtx.destination;
        const outputSampleRate = audioCtx.sampleRate; //samples per second
        // Choose type conversion and resampler
        const typeConverter = AudioDecoder.convert16IntToFloat;
        if(AudioDecoder.hasResampler(inputSampleRate,outputSampleRate)){
            resample = AudioDecoder.getResampler(inputSampleRate,outputSampleRate,typeConverter)
        }
        else{
            EventService.emit("audioPlayerError","Can't resample "+ inputSampleRate + "kHz to " + outputSampleRate + "kHz");
            throw "AudioPlayer Error: can't resample " + inputSampleRate + "kHz to " + outputSampleRate + "kHz";
        }


        const frameCount = outputSampleRate * timeSlice / 1000;

        // Circular Buffer (of buffers) that hold audio samples while they wait to be played
        circ = (function(){
            var buffers = new Array(numberOfBuffers);
            for(var i = 0; i < numberOfBuffers; ++i){
                buffers[i] = audioCtx.createBuffer(channels, frameCount, outputSampleRate);
            }
            var current = 0;
            var next = function(){
                var next = current+1;
                if(next >= numberOfBuffers){
                    next = 0;
                }
                current = next;
                return buffers[next];
            }
            return({
                next:next
            })
        })();

        


        // SOURCE NODES
        gainNode = audioCtx.createGain();
                

        // SET NODE PROPERTIES
        gainNode.gain.value = fullVolume;
        

        // CONNECT NODES

        /* We try to redirect through an audio element to allow us to set the speaker */
        try{
            redirectThroughAudioElement();
        }catch(e){
            /* This happens on mobile, since we can't call 'play' on an audio element
            on mobile without a user event.  Neither can we call setSinkId, so that's fine too. */
            console.log("couldn't redirect through an audio element.");
            gainNode.connect(computerSpeakers);
        }
        EventService.emit("audioPlayerInitialized");
        initialized = true;
    }

    /* Redirecting through an Audio element allows us to switch speakers? */
    const redirectThroughAudioElement = () => {
        let audioCtx = WebAudioService.getContext();
        var m = audioCtx.createMediaStreamDestination();
        gainNode.connect(m);
        audioElement = new Audio();
        audioElement.srcObject = m.stream;
        // audioElement.src = URL.createObjectURL(m.stream); // this way deprecated in 2013, enforced in July 2018
        audioElement.setSinkId("default");
        return audioElement.play();
    }


    const mute = () => {
        gainNode.gain.value = 0.0;
    }
    const unmute = () => {
        gainNode.gain.value = fullVolume;
    }


    var messagesReceived = 0;
    var timeToPlay;
    var remainingBufferTime = audioBufferTime;

    var reset = function(){
        console.log("REBUFFERING.");
        messagesReceived = 0;
    }
    // audio data is read in, upsampled to the sample frequency required by our output device
    // as well as converted from INT16 to floats
    // the data in a single message is processed and queued to play in the future
    // we maintain a buffer of these processed messages and play one right after
    // the previous one finishes playing, every 'timeSlice' ms
    const readInData = raw => {
        let audioCtx = WebAudioService.getContext();
        if(!initialized){
            throw "tried to read in audio data without initializing audio";
        }

        if(messagesReceived == 0){
            timeToPlay = audioCtx.currentTime+audioBufferTime/1000; //seconds
        }
        else{
            timeToPlay += timeSlice/1000;
        }
        ++messagesReceived;

        remainingBufferTime = (timeToPlay - audioCtx.currentTime)*1000; //ms
        

        // If we run out of our buffer, then restart and build up a full buffer again
        if(remainingBufferTime < 0){
            reset();
        }      
        
        var buffer = circ.next();
        var src = audioCtx.createBufferSource(); // these can't be reused and must be recreated
        
        let input = new Int16Array(raw);
        var output = buffer.getChannelData(0); // Assuming only one channel

        // convert to proper type
        // as well as resample
        resample(input,output);

        src.buffer = buffer;
        src.connect(gainNode);
        src.start(timeToPlay);
    }
    const isStreamPlaying = () => {
        let audioElement = $("audio")[0];
        return audioElement.duration && !audioElement.paused;
    }
    
    const getAudioElement = () => $("audio")[0];
    const playStream = stream => {
        storedStream = stream;
        let audioElement = getAudioElement();
        audioElement.srcObject = stream;
        return audioElement.play();
    }

    const getSilence = () => {
        let ctx = WebAudioService.getContext(), oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        Object.assign(dst.stream.getAudioTracks()[0], {enabled: false}); // comment out this line for a sine wave tone instead of silence
        return dst.stream;
    }


    const setSpeaker = sinkId => {
        audioElement.setSinkId(sinkId).then(()=>{
            console.log('Audio output device attached: ' + sinkId);
        })
        .catch( error => {
            console.log("error setting sink id");
            console.log(error);
        });
    }

    const unlock = () => {
        /* for playing audio through global <audio> element
        on iOS Safari, audio will only play from a user initiated event, synchronously!
        Fortunately this unlock function is already called every time we click a selector.
        At which point we try to initiate the <audio> playing if it hasn't yet started */
        if(!isStreamPlaying()){
            playStream(storedStream);
        }
        WebAudioService.unlock();
    }
    return({
        playStream,
        unmute:unmute,
        mute:mute,
        read:readInData,
        reset:reset,
        init:init,
        getSilence,
        unlock,
        getAudioElement,
        setSpeaker:setSpeaker,
        setBufferTime:setBufferTime
    })
    

})


/* global app Util $ */
app.factory("ControlPanelService",function($rootScope,GeoService,EnvService,EventService,
    VideoPlayerService,GumService,VideoManagerService,WebRTCVideoStreamingService){
    /* keep track of the geo panes that are open so we know how many are open
    and then we can stop tracking client positions when we close them all
    and start when we open at least one */
    let openGeos = Util.Set(); 
 
    const hydrateComponent = comp => {
            let type = comp.config.contentType;
            if(type=="geo"){
                // hydrateGeo(comp);
                setTimeout(()=>hydrateGeo(comp),300);
            }
            else if(type=="chat"){
                hydrateChat(comp);
            }
            else if(type=="dialPad"){
                hydrateDialPad(comp);
            }
            else if(type=="video" || type=="anonVideo"){
                hydrateVideo(comp);
            }
            else if(type == "browse"){
                hydrateBrowser(comp);
            }
            else if(type == "gum"){
                hydrateGum(comp);
            }
            else if(type == "wowzaStream"){
                WebRTCVideoStreamingService.hydrate(comp);
            }
    }
    let hydrateGum = comp => {
        /* Actual procedure handled by GumController.js and views/gum.html */
        comp.config.onClose = () => {
            GumService.stop();
        }
    }
    let hydrateGeo = comp => {
        let id = comp.config.id;
        console.log("hydrating geo",id);

        comp.container.on("resize",()=>{
            GeoService.getMap(id).invalidateSize();
        })
        Util.waitForElement("#"+id).then(()=>{
            /* create a new scope to attach geo stuff to */
            let geoScope = $rootScope.$new(true);
            $("#"+id).empty().append($(`
                <div id="`+id+`" class="geoMap"></div>
            `))
            GeoService.setup(id,geoScope)
            openGeos.add(id);
            if(openGeos.length()==1){
                EventService.emit("firstGeoOpened");
            }
            /* When we close the window (or log out) destroy the scope */
            function handleGeoClosed(){
                console.log("handling geo closed",id);
                geoScope.$destroy();
                openGeos.remove(id);
                if(openGeos.length() < 1){
                    EventService.emit("lastGeoClosed");
                }
            }
            comp.config.onClose = handleGeoClosed;
            EventService.on("beforeLoggedOut",handleGeoClosed);
        })
    }

    const hydrateChat = comp => {
        let id = comp.config.id;
        let query = "#"+id;
        Util.waitForElement(query).then(()=>{
            VideoPlayerService.playAsIframe({
                $container:$(query),
                uri:"https://minnit.chat/"+EnvService.get("chatName")+"?embed&web"
            });
        })
    }
    const hydrateDialPad = comp => {
        // let id = comp.config.id;
        Util.waitForElement(".dialPad").then(()=>{
            $(".dialPad").parent().css("overflow-y","scroll");
        })
    }
    const hydrateVideo = comp => {
        let id = comp.config.id;
        let uri = comp.config.videoURI;
        VideoManagerService.playIdAndUri(id,uri);
        comp.config.onClose = () => {
            VideoManagerService.stop(id);
        }
    }

    const hydrateBrowser = comp => {
        let id = comp.config.id;
        let uri = comp.config.pageURI;
        let query = "#"+id;
        Util.waitForElement(query).then(()=>{
            VideoPlayerService.playAsIframe({
                $container:$(query),
                uri:uri
            });
        })
    }
    return {
        hydrateComponent:hydrateComponent
    }
})
/* global app */
app.factory("ControlPanelTestingService",function(
    AudioWebSocketService,
    SelectorsService,
    VideoPlayerService,FormModalService
){

    return {
        playID:()=>{
            let formdata = Form();
            let field = formdata.get(0);
            field.label="ID";
            field.modelName = "id";
            // field = formdata.get(1);
            // field.label=""
            FormModalService.open({
                title:"play video with id",
                form:formdata,
                submit:submitted=>{
                    VideoPlayerService.playConfig({
                        $container:$("#"+submitted.id),
                        id:submitted.id,
                        uri:"https://s3.amazonaws.com/test-lon9man-bucket/8960cac5-3e2e-11e8-a0f7-38d547b38d0c/index.m3u8"
                    })
                }
            })
        },
        tally:()=>{
            let formdata = Form();
            let field = formdata.get(0);
            field.label="On/Off:";
            field.modelName = "onoff";
            field.type="toggleSwitch";
            field = formdata.get(1);
            field.label="Selector";
            field.type="selectorchooser";
            field.modelName = "selectorID";
            FormModalService.open({
                title: "Manually set tally status",
                form:formdata,
                submit:submitted=>{
                    if(submitted.onoff == "ON"){
                        SelectorsService.onCallNotificationOn(submitted.selectorID);
                    }
                    else{
                        SelectorsService.onCallNotificationOff(submitted.selectorID);
                    }
                }
            })
        },
        // disableAudioWebsocket : () => {
        //     AudioWebSocketService.disable()
        // },
        // enable:()=>AudioWebSocketService.enable(),
        // stop:()=>AudioWebSocketService.close()

    }
})
/* global app Util $ */
app.factory("DispatchService",function(SelectorsService,PlaySoundService,QueryStringService,BrowserStorageService,GoldenLayoutService){
    // It could be good to store selected contacts in Browser Storage so they persist through logout
    // But it should be tied to the particular VCP account that is logged in.
    // const BSS_NAME = "dispatch-selected-contacts";
    // let selectedContacts = Util.Set(BrowserStorageService.get(BSS_NAME) || []);
    let enabled;
    let query = QueryStringService.get("dispatch");
    if(query != undefined){
        enabled = query;
        if(query=="false")enabled=false;
        BrowserStorageService.setLocal("dispatch-enabled",query);
        GoldenLayoutService.clearStoredLayout();
    }
    else{
        enabled = BrowserStorageService.get("dispatch-enabled");
    }
    console.log("dispatch enabled",enabled);
    let selectedContacts = Util.Set();
    reset();
    // selectedContacts.get().forEach(onAdd); // initialize UI with stored selected contacts
    // function onChange(updatedContacts){BrowserStorageService.set(BSS_NAME,updatedContacts)}
    function onAdd(x){SelectorsService.setSelectorProperty(x,"dispatchSelected",true);}
    function onRemove(x){SelectorsService.setSelectorProperty(x,"dispatchSelected",false);}
    // selectedContacts.obs.change.on(onChange) // store any changes to browser storage service
    
    function select(labelID){selectedContacts.add(labelID)}
    function toggle(labelID){selectedContacts.toggle(labelID)}
    function remove(labelID){selectedContacts.remove(labelID)}
    function pttDown(){
        $("#dispatchPTT").addClass("active")
        PlaySoundService.playWav("../audio/PTT_On.wav")
        selectedContacts.get().forEach(id=>{
            SelectorsService.talkOn(id);
        })
    }
    function pttUp(){
        $("#dispatchPTT").removeClass("active")
        PlaySoundService.playWav("../audio/PTT_Off.wav")
        selectedContacts.get().forEach(id=>{
            SelectorsService.talkOff(id);
        })
    }
    function reset(){
        selectedContacts.clear();
        selectedContacts.obs.add.on(onAdd);
        selectedContacts.obs.remove.on(onRemove);
        
    }
    return {
        isEnabled:()=>enabled,
        reset,
        pttDown,
        pttUp,
        toggle
    }
})
app.run(function(DispatchService){
    // load dispatch service immediately to check out the query string
})
/* global app Util angular $ */
app.factory("GoldenLayoutService",function($templateRequest,$compile,VideoPlayerService,$injector,BrowserStorageService){
    const VERSION = "1.0.18";
    const PREFERRED_HEADER_HEIGHT = 40; // px

    let myLayout;
    let storeLayout = true;
    const saveDebounceTime = 300; // ms, minimum amount of time between calls to save the state

    function clearStoredLayout(){
        storeLayout = false;
    }
    
    const config = (config,jqueryElement) => {
        /* Check if we have used the page before and that GoldenLayoutService hasn't changed versions
        If it has changed, then don't try to load saved state as it will likely be broken.
        For instance, a new tab is added and wouldn't be visible if we load saved state. */
        let storedVersion = BrowserStorageService.get("GLS_VERSION");
        if(storedVersion != VERSION){
            storeLayout = false;
        }
        if(storeLayout){
            config = loadSavedState() || config;
        }
        BrowserStorageService.set("GLS_VERSION",VERSION);
        Util.setSafe(config,"dimensions","headerHeight",PREFERRED_HEADER_HEIGHT);/* manually set the header height */
        myLayout = new window.GoldenLayout.default(config,jqueryElement);
        resizeOnWindowResize();
        managePopoutButtons();
        manageStacks(); // alter header
        manageLoadingComponents();
        manageClosingComponents();
        manageClosingVideoRows();
    }
    const loadSavedState = () => {
        let saved = BrowserStorageService.get("goldenLayoutState");
        console.log("loaded state",saved);
        return saved;
    }
    
    /* Since GL is being used inside #controlPanelPane, instead of its natural habitat
    of a full page, it doesn't react to window resizing automatically. So we reimplement it here */
    const resizeOnWindowResize = () => $(window).resize(sizeToFit);
    /* This function collapses the goldenlayout by hiding it so we can see how big the container should actually be
    then reestablishes the size of the goldenlayout to fit inside the container.*/
    const sizeToFit = () => {
        $(".lm_root").hide();
        $("#controlPanelPane").css("height","0px");
        $("#controlPanelPane").css("height",$("#container-middle").height());

        myLayout.updateSize($("#controlPanelPane").width(), $("#controlPanelPane").height());
        $(".lm_root").show();
        // A workaround to restore the header tabs that otherwise would be hidden due to GL thinking the headers have 0 width and can't fit the tabs
        myLayout.updateSize($("#controlPanelPane").width(), $("#controlPanelPane").height());
    }
    const register = ($scope,templateName,templateURL) => {          
          myLayout.registerComponent( templateName, function( container, state ){
            // state passed in through the componentState property of the golden layout config
            // console.log("REGISTERING container,state",container,state);
            $templateRequest(templateURL).then(function(html){
                                /* html is a string of everything in the html file linked with templateURL. */
                html = html.replace(/STATE_ID/g,state.id); // jankily insert data through the state argument
                var template = angular.element(html);
                container.getElement().html(template);
                $compile(template)($scope);
             });
        });
    }
    const init = () => {
        myLayout.init();
        let saveState = Util.debounce(()=>{
            var state = myLayout.toConfig();
            BrowserStorageService.set('goldenLayoutState', state );
            console.log('saved state',state);
        },saveDebounceTime)
        myLayout.on( 'stateChanged', function(){
            saveState();
        });
        sizeToFit();
    }

    let behindSelectorsConfig;
    const playBehindSelectors = config => {
        behindSelectorsConfig = config;
        VideoPlayerService.playBehindSelectors(config.videoURI);
    }

    const createCloseButton = getConfig => {
        let element = $(`<li class="lm_customClose" title="Close">
            <i class="fa fa-close"></i>
        </li>`)
        element.on("click",()=>{
            let config = getConfig();
            let id = config.id;
            $injector.get("VideoManagerService").stop(id);
        });
        return element;
    }
    const createLinkButton = getConfig => {
        let element = $(`<li class="lm_link" title="Get Link">
            <i class="fa fa-external-link"></i>
        </li>`)
        element.on("click",()=>{
            let id = getConfig().id;
            // $injector.get("PaneService").toggleMaximize(id);
            // EventService.emit("togglePublish",id);
        });
        return element;
    }

    /* fn to create the header button to play behind selectors.
    We need to recreate these every time someone switches from one tab to another (in the stack). */
    const createPlayBehindSelectorsButton = getConfig => {
        let element = $(`<li class="lm_openBehind" title="play behind selectors">
            <i class="fa fa-camera-retro"></i>
        </li>`)
        element.on("click",()=>{
            let config = getConfig();
            let id = config.id;
            if($(".behindContents").length>0){
                $(".behindContents").remove();
                if(behindSelectorsConfig){
                    $injector.get('VideoManagerService').playConfig(behindSelectorsConfig);
                }
                behindSelectorsConfig = undefined;
            }
            if(id!=="selectorsGLPane"){
                remove(id);
                playBehindSelectors(config);
            }
        });
        return element;
    }

    const createRefreshSelectorsButton = getConfig => {
        let element = $(`<li class="lm_refreshSelectors" title="refresh selectors">
            <i class="fa fa-refresh"></i>
        </li>`)
        element.on("click",()=>{
            $injector.get("SelectorsService").refresh();
        });
        return element;
    }

    const manageLoadingComponents = () => {
        myLayout.on("componentCreated", comp=>{
            console.log("loaded component",comp);
            $injector.get("ControlPanelService").hydrateComponent(comp);
            if(comp.config.showHeader === false){ // hide header if the config says so. (default to show header if no value present)
                comp.tab.header.position(false);
            }
        })
    }
    const manageClosingComponents = () => {
        myLayout.on("itemDestroyed", comp=>{
            if(comp.config.onClose){
                comp.config.onClose();
            }
        })
    }

    function toggleHeader(id){
        let got = get(id);
        if(!got)return;
        got.config.showHeader = !got.config.showHeader;
        got.header.position(got.config.showHeader);
    }
    function hideHeader(id){
        let got = get(id);
        if(!got)return;
        got.config.showHeader = false;
        got.header.position(got.config.showHeader);
    }
    function showHeader(id){
        let got = get(id);
        if(!got)return;
        got.config.showHeader = true;
        got.header.position(got.config.showHeader);
    }

    /* Golden layout handles most things well, but a row with one item gets automatically converted to a stack,
    and I don't want this happening to our video row, so the row has isClosable set to false to prevent this 
    downgrading to a stack, and now we manually (with this event observer) close a video row when it is empty */
    const manageClosingVideoRows = () => {
        after("itemDestroyed",()=>{
            getVideoRows().forEach(row=>{
                // remove the empty rows
                if(row.contentItems.length < 1){
                    row.remove();
                }
                else{
                    setRowHeightToNumberOfElements(row);
                }
            })
        });
    }

    const getVideoRows = () => {
        let main = myLayout.root.contentItems[0]; // a column
        return main.contentItems.slice(1);
    }

    /* Add our custom close button when it's not disabled, and hide it when it is disabled */
    const manageStacks = () => {
        myLayout.on( 'stackCreated', function( stack ){
            /* activeContentItemChanged is triggered when the first contents are put in the stack
            and every time a different component is selected into this stack */
            stack.on( 'activeContentItemChanged', function( contentItem ){
                let header = stack.header.controlsContainer.parent();
                header.css("height",""); // Remove the hardcoded header height so we can add our own without !important
               managePlayBehindButton(stack,contentItem);
               manageRefreshSelectorsButton(stack,contentItem);
               manageCloseButton(stack,contentItem);
               manageLinkButton(stack,contentItem);
            });
        });
    }
    const manageLinkButton = (stack,contentItem) => {
        if(contentItem.config.contentType !== "wowzaStream"){ // shouldnt have a link
            stack.header.controlsContainer.find(".lm_link").remove(); // remove it if it exists
        }
        // else link is allowed and there is not one present so we add it
        /* Temporarily disabled showing the link button */
        // else if(stack.header.controlsContainer.find(".lm_link").length<1){
        //     let getConfig = () => stack._activeContentItem.config;
        //     let btn = createLinkButton(getConfig);
        //     stack.header.controlsContainer.prepend(btn);
        // }
    }
    const manageCloseButton = (stack,contentItem) => {
        /* remove normal close button if it exists */
        if(stack.header.controlsContainer.find(".lm_close")){
            stack.header.controlsContainer.find(".lm_close").remove();
        }
        if(!contentItem.config.isClosable){
            stack.header.controlsContainer.find(".lm_customClose").remove(); // remove it if it exists
        }
        // else customClose is allowed and there is not one present so we add it
        else if(stack.header.controlsContainer.find(".lm_customClose").length<1){
            let getConfig = () => stack._activeContentItem.config;
            let btn = createCloseButton(getConfig);
            stack.header.controlsContainer.append(btn);
        }
    }

    /* Add the playBehind button if it's enabled, and hide it when it is disabled */
    const managePlayBehindButton = (stack,contentItem) => {
            if(!contentItem.config.pbs){ // pbs is disallowed
                stack.header.controlsContainer.find(".lm_openBehind").remove(); // remove it if it exists
            }
            // else pbs is allowed and there is not one present so we add it
            else if(stack.header.controlsContainer.find(".lm_openBehind").length<1){
                /* using getConfig and not just contentItem.config solves a bug where a stack always
                sends the same part of it to playBehind, even though another part is now on top.
                This way, however, the getConfig fn is called right when you click the button
                and at that moment checks the top item of the stack and uses the config from that item */
                let getConfig = () => stack._activeContentItem.config;
                let btn = createPlayBehindSelectorsButton(getConfig);
                stack.header.controlsContainer.prepend(btn);
            }
    }
     /* Add the refreshselectors button if it's enabled, and hide it when it is disabled */
     const manageRefreshSelectorsButton = (stack,contentItem) => {
         console.log("refresh selectors button",contentItem.config);
        if(!contentItem.config.refreshSelectors){ // refreshSelectors is disallowed
            stack.header.controlsContainer.find(".lm_refreshSelectors").remove(); // remove it if it exists
        }
        // else it is allowed and there is not one present so we add it
        else if(stack.header.controlsContainer.find(".lm_refreshSelectors").length<1){
            let getConfig = () => stack._activeContentItem.config;
            let btn = createRefreshSelectorsButton(getConfig);
            stack.header.controlsContainer.prepend(btn);
        }
    }
    /* Hide the popout button when it is disabled, add it back if it isn't */
    const managePopoutButtons = () => {
        myLayout.on( 'stackCreated', function( stack ){
            let copy = stack.header.controlsContainer.find(".lm_popout").clone(true);
            let createPopoutElement = () => {
                return copy.clone(true);
            }
            stack.on( 'activeContentItemChanged', function( contentItem ){
                if(!contentItem.config.popoutEnabled){ // popout is disallowed (which is the default)
                    stack.header.controlsContainer.find(".lm_popout").remove(); // remove it if it exists
                }
                // else popout is allowed and there is not one present so we add it
                else if(stack.header.controlsContainer.find(".lm_popout").length<1){
                    stack.header.controlsContainer.prepend(createPopoutElement());
                }
            });
        });
    }

    /* Open a row at the bottom of the layout to store videos. */
    const getVideoRow = (config) => {
        const defaultConfig = {
            maxPerRow: 5,
            rowHeight: 35
        }
        config = Object.assign({},defaultConfig,config);
        
        let main = myLayout.root.contentItems[0];
        let len = main.contentItems.length;
        // find a row with fewer than 'maxPerRow' items in it
        if(len === 1){ // no video row is open yet
            return openNewRow(config);
        }
        else if(len >= 2){ // some rows are open
            let validRows = getVideoRows().filter(row=>{
                if(row.contentItems.length < row.config.maxRows) return true;
                return false;
            })
            if(validRows.length > 0){
                return validRows[0];
            }
            else{
                return openNewRow(config);
            }
        }
    }
    const openNewRow = (config) => {
        let id = Util.generateUUID();
        let main = myLayout.root.contentItems[0]; // a column
        let newRowConfig = {
            id:"videoPane"+id,
            type: 'row',
            isClosable:false, // added to prevent a video row to collapsing to a stack when saved/loaded
            content:[],
            maxRows: config.maxPerRow,
            rowHeights:config.rowHeights
        };
        /* It seems that addChild is synchronous when it comes to changes to Golden Layout's
        internal understanding of things, just asynchronous when it comes to actually changing
        the DOM and adding that new element */
        main.addChild(newRowConfig);
        let vp = main.getItemsById("videoPane"+id)[0];
        return vp;
    }

    const setRowHeightToNumberOfElements = row => {
        let elements = row.config.content.length;
        let height = row.config.rowHeights[elements];
        row.config.height = height;
        myLayout.updateSize();
    }
    const openVideoContainer = (config,indexToInsertAt) => {
        let id = config.id;
        if(id === undefined) id = Util.generateUUID();
        const defaultConfig = {
            id: id,
            type: 'component',
            title: 'Video',
            componentName: "videoContainer",
            componentState: { templateId: "videoTemplate", id:id}
        }
        config = Object.assign({},defaultConfig,config)
        
        let vp = getVideoRow(config.container);
        vp.addChild(config,indexToInsertAt);
        setRowHeightToNumberOfElements(vp);
        return vp.getItemsById(id)[0];
    }
    const makeSideWindow = (config,indexToInsertAt) => {
        let id = config.id;
        const defaultConfig = {
            type: 'component',
            title: '',
            componentName: "videoContainer", /* videoContainer isn't a proper name for this, but videoContainer.html is actually just a div with an ID */
            componentState: { templateId: "videoTemplate", id:id}
        }
        config = Object.assign({},defaultConfig,config)

        console.log("making side window with config",config);
        
        let root = myLayout.root;
        let main = root.contentItems[0];
        let mainRow = main.contentItems[0];
        mainRow.addChild(config,indexToInsertAt);
        return main.getItemsById(id)[0];
    }
    const makeEmptySideWindow = config => {
        let root = myLayout.root;
        let main = root.contentItems[0];
        let mainRow = main.contentItems[0];
        mainRow.addChild(config);
        return main.getItemsById(config.id)[0];
    }
    const get = id => {
        let root = myLayout.root;
        let main = root.contentItems[0];
        return main.getItemsById(id)[0];
    }

    const toggleMaximize = id => {
        let got = get(id);
        if(!Array.isArray(got.config.id)){
            got.config.id=[got.config.id];
        }
        if(!got.config.id.includes('__glMaximised')){
            got.config.id.push('__glMaximised');
        }
        got.toggleMaximise(); // built in function that doesn't QUITE work. crashes because getItemsById('__glMaximised') finds no elements
        got.config.id = id; // restore original non-array ID
    }
    
    const getGum = () => {
        return myLayout.root.getItemsByFilter(item=>item.config.contentType=="gum")[0];
    }
    function closeAllGUM(){
        let items = getAllItems(item=>item.config.contentType=="gum");
        console.log("all gum items",items);
        items.forEach(item=>item.remove())
    }

    /* Helps us monitor a content item (item in a stack) and do something
    when it becomes active or stops being active */
    const onContentItemActive = (stackID,itemID,onActive,onInactive) => {
        let stack = get(stackID);
        let respond = activeContentItem => {
            if(activeContentItem.config.id == itemID){
                onActive();
            }else{
                onInactive();
            }
        }
        /* React to current active content item */
        respond(stack.getActiveContentItem())
        /* React whenever a change is made */
        stack.on('activeContentItemChanged', function( contentItem ){
            console.log("active content item changed",contentItem);
            respond(contentItem)
        });
    }

    const on = (eventName,fn) => {
        myLayout.on(eventName,fn);
    }
    /* allow us to react to an event after it has resolved, rather than while it is in the middle of resolving. */
    const after = (eventName,fn) => {
        myLayout.on(eventName,(a,b,c)=>{
            setTimeout(()=>fn(a,b,c),10);
        });
    }

    const remove = id => {
        let lay = myLayout.root.getItemsById(id)[0];
        if(lay) lay.remove();
    }

    const getAllItems = (filter) => {
        if(!filter)filter = ()=>true;
        return myLayout.root.getItemsByFilter(filter);
    }
    /* useful to clean up after we log out */
    const callAllOnCloseFunctions = () => {
        getAllItems().forEach(i=>{
            if(i.config.onClose)i.config.onClose();
        })
    }

    return {
        getLayout:()=>myLayout,
        clearStoredLayout,
        hideHeader,
        showHeader,
        getGum,
        closeAllGUM,
        toggleMaximize,
        openVideoContainer:openVideoContainer,
        makeSideWindow:makeSideWindow,
        makeEmptySideWindow,
        sizeToFit,
        get,
        remove:remove,
        on:on,
        onContentItemActive,
        after:after,
        config:config,
        register:register,
        callAllOnCloseFunctions,
        init:init
    }
})
/* global app Util $ */

/* 
This service is for VIDEO streaming.
It manages our desired constraints like bitrate and camera facing. */
app.factory("GumService",function($injector,BrowserStorageService,AudioPlayerService,
    EnabledService,PaneService, ScreenshareService, ConnectionService){
    const DEFAULT_AUDIO = false;
    const DEFAULT_CAMERA_FACING = "user"; // "environment" is other option
    const DEFAULT_HEIGHT = 360; // this property chosen specifically because iOS does NOT support it
    const DEFAULT_ASPECT = {ideal:16/9} // try to get 16:9 video
    const DEFAULT_BANDWIDTH_MAX = 0;
    const DEFAULT_BANDWIDTH_MIN = 0;

    /* Here we store the audio portion and video portion of the user's stream
    We make clones from these rather than additional calls to getUserMedia because
    iOS will kill old streams in the case of multiple gUM calls 
    
    We split the stream into these two components because Kurento's interface expects 
    two separate streams like this, and we need to be able to pass around the audio only
    stream for local preview and for broadcasting without audio. */
    let streams = {
        audio:undefined,
        video:undefined
    }

    /*
        iOS getusermedia is finnicky so we have to be very careful here.
        aspectRatio being included will prevent 'facingMode' from working
        this also doesn't cause an error, AND aspectRatio is listed as supported from getSupportedConstraints
        so instead of only applying aspect ratio if GUM can handle it...
        we utilize another constraint (height:360) that causes an error in iOS and nowhere else
        and we have a backup set of constraints that targets iOS
        while other platforms can handle the aspect ratio.
    */
    let constraints = {
        audio:DEFAULT_AUDIO,
        video:{
            facingMode:DEFAULT_CAMERA_FACING,
            height:DEFAULT_HEIGHT, 
            aspectRatio:DEFAULT_ASPECT
        }
    };
    const init = () => {
        loadBandwidthConstraints();
        loadChosenDeviceID();
    }

    const enableAudio = () => constraints.audio = true;
    const disableAudio = () => constraints.audio = false;
    const isAudioEnabled = () => constraints.audio;
    const toggleFacing = () => {
        setVideoDeviceID(undefined); // having a specified device id will override facingMode preferences
        constraints.video.facingMode = (constraints.video.facingMode == "user")?"environment":"user";
    }
    const clearFacing = () => delete constraints.video.facingMode;
    const getIdealConstraints = () => Util.deepCopy(constraints);
    const getBackupConstraints = () => { let bc = getIdealConstraints(); delete bc.video.height; delete bc.video.aspectRatio; return bc;}

    /* End the webcam preview, and the invisible video transmitting to Kurento 1to1 */
    const  stop = () => {
        console.log("STOPPING GUM");
        clearAllTracks();
        destroyVideoElement();
        /* Using Kurento, the gum stream is different than the one we created here 
            So we'll close that one too
        */
       $injector.get("Kurento1to1").stopBroadcast();
       if(ConnectionService.isLoggedIn()){
            $injector.get("WhosStreamingService").reportMyStreamOff();
       }
    }
    /* Disposes of all stored media streams */
    const clearAllTracks = () => {
        [streams.audio,streams.video].forEach(clearTracks)
        delete streams.audio;
        delete streams.video;
    }
    /* cleans up one media stream */
    function clearTracks(stream){
        if(stream){
            let tracks = stream.getTracks();
            if(tracks)tracks.forEach(t=>t.stop());
        }
    }

    function invalidateCurrentStreams(){
        clearAllTracks();
    }

    function getUserMediaFactory(){ // in case it becomes more complicated to figure out how to call getUserMedia
        try{
            if(navigator.mediaDevices.getUserMedia) return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        }catch(e){
            return undefined;
        }
    }

    /* On iOS, calls to getUserMedia after the first one will destroy the previous streams
    We use this function under the hood and build on top of it to allow us to get multiple
    streams without having them destroy each other. */
    function getUserMediaHard(){
        /* If we don't stop all of the ongoing tracks then subsequent requests to 
        getusermedia may fail (especially on mobile) */
        clearAllTracks();
        let mediaOptions = getIdealConstraints();
        let factory = getUserMediaFactory();
        console.log("GumService getting usermedia:",mediaOptions);
        try{
            if(ScreenshareService.isEnabled()){
                return ScreenshareService.getStream().then(onGumSuccess);
            }
            return factory(mediaOptions)
            .then(onGumSuccess)
            .catch(()=>{
                let mediaOptions = getBackupConstraints();
                console.log("ideal constraints failed, trying backup constraints",mediaOptions)
                return factory(mediaOptions).then(onGumSuccess);
            })
        }catch(e){
            return Promise.reject("Browser has disallowed access of navigator.mediaDevices. Are you on HTTPS? If you're on iOS, try Safari.");
        }
    }

    /* These clones are not tracked here so wherever they are received has the responsibility of
    disposing of them when they are no longer needed */
    function getStreamClones(){
        return getStreams().then(streams=>{
            return {
                audio:streams.audio.clone(),
                video:streams.video.clone()
            }
        })
    }
    function removeAudioTracks(stream){
        var audioTracks = stream.getAudioTracks();
        for (var i = 0, len = audioTracks.length; i < len; i++) {
            audioTracks[i].stop(); // without this, iOS never considered gum access stopped
            stream.removeTrack(audioTracks[i]);
        }
    }
    function removeVideoTracks(stream){
        var videoTracks = stream.getVideoTracks();
        for (var i = 0, len = videoTracks.length; i < len; i++) {
            videoTracks[i].stop(); // without this, iOS never considered gum access stopped
            stream.removeTrack(videoTracks[i]);
        }
    }
    function enableTracks(stream){
        stream.getAudioTracks().forEach(t=>t.enabled = true);
        stream.getVideoTracks().forEach(t=>t.enabled = true);
    }
    function disableTracks(stream){
        stream.getAudioTracks().forEach(t=>t.enabled = false);
        stream.getVideoTracks().forEach(t=>t.enabled = false);
    }
        /* Replaces the tracks of an existing stream with the supplied stream, which doesn't require renegotiation!
    This requires the use of a polyfill for Chrome as of May 2019. */
    const replaceStream = (pc,stream) => {
        let senders = pc.getSenders();
        senders.map(sender=>{
            try{
                let track = stream.getTracks().find(t => t.kind == sender.track.kind);
                sender.replaceTrack(track, stream)
            }catch(e){
                // console.log("GumService couldn't replace track",e);
            }
        });
    }
    const clearTracksFromPeerConnection = pc => {
        let senders = pc.getSenders();
        senders.forEach(sender=>{
            if(sender && sender.track) sender.track.stop()
        });
    }
    function getBlack(){
        let width = 640;
        let height = 480;
        let canvas = Object.assign(document.createElement("canvas"), {width, height});
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        Object.assign(stream.getVideoTracks()[0], {enabled: false});
        return stream;
    }
    function getBlackSilence(){
        let audio = AudioPlayerService.getSilence();
        let video = getBlack();
        return {
            audio:audio,
            video:video
        }
    }
    
    function getStreams(){
        if(streams.audio && streams.video){
            return Promise.resolve(streams);
        }
        else{
            return getUserMediaHard().then(getStreams)
        }
    }
    const onGumSuccess = stream => {
        streams.video = stream.clone();
        streams.audio = stream.clone();
        removeAudioTracks(streams.video);
        removeVideoTracks(streams.audio);
        clearTracks(stream); // get rid of the source stream, who needs it
        console.log("got streams");
    }
    const isRunning = () => {
        return streams.video && streams.audio;
    }
    let bandwidthConstraints = {
        max:DEFAULT_BANDWIDTH_MAX,
        min:DEFAULT_BANDWIDTH_MIN
    }
    const getBandwidthConstraints = () => bandwidthConstraints;
    const loadBandwidthConstraints = () => {
        let stored = BrowserStorageService.get("gum-video-bitrate");
        if(stored){
            setBandwidthConstraints(stored,2*stored);
        }
    }
    const setBandwidthConstraints = (min,max)=> {
        try{
            max = Number(max);
            min = Number(min);
            if(isNaN(max))max=0;
            if(isNaN(min))min=0;
        }catch(e){
            max = 0;
            min = 0;
        }
        console.log("setting constraints",max,min);
        bandwidthConstraints.max = max;
        bandwidthConstraints.min = min;
    }
    /*
    Returns a promise that resolves with an array of objects like this...
        [
            {
                deviceId: "9448741b2911a5dce04562b73833dd0a3505fc2e5ced38af4d74834beecd006d",
                groupId: "e3161d15744b3fb412daf2c6aea44fb9ed9f4315d6508b470c33b9990ada3f33",
                kind: "videoinput",
                label: "USB2.0 HD UVC WebCam (0bda:57f4)"
            },
            ...
        ]
    */
    const getVideoDevices = () => {
        try{
            return navigator.mediaDevices.enumerateDevices().then(devices=>devices.filter(device=>device.kind=="videoinput"))
        }
        catch(e){
            return Promise.reject();
        }
    }
    /* Call with no argument in order to remove the constraint, causing the default camera to be used */
    const setVideoDeviceID = id => {
        console.info("setting video device id",id);
        if(id == undefined || id == ""){
            constraints.video.deviceId = undefined;
            BrowserStorageService.remove("gum-video-deviceID");
        }
        else{
            clearFacing();
            constraints.video.deviceId = {'exact':id};
            BrowserStorageService.set("gum-video-deviceID",id);
        }
    }
    const getVideoDeviceID = () => Util.getPropertySafe(constraints,"video","deviceId","exact");
    const loadChosenDeviceID = () => {
        let stored = BrowserStorageService.get("gum-video-deviceID");
        if(stored){
            setVideoDeviceID(stored);
        }
    }
    /* Cycles from the currently selected camera to the next one.
    Returns a promise */
    const nextCamera = () => {
        return getVideoDevices().then(devices=>{
            let cur = getVideoDeviceID();
            let curIndex = 0;
            if(cur){
                curIndex = devices.findIndex(device=>device.deviceId == cur);
            }
            let nextIndex = curIndex+1;
            if(nextIndex>=devices.length)nextIndex=0;
            let nextID = Util.getPropertySafe(devices,nextIndex,"deviceId");
            setVideoDeviceID(nextID);
        })
    }

    /* Formerly in GumController, had a hard time being notified of the event of closing
    the window, so moved here. */
    const getVideoContainer = () => {
        if(EnabledService.wideScreen()){
            return  $(".gum .gum-video-container");
        }
        else{
            let behind = PaneService.openBehindSelectors();
            let newContainer = $("<div class='gum-video-container'></div>")
            behind.empty().append(newContainer);
            return newContainer
        }
    }

    const createVideoElement = () => {
        destroyVideoElement();
        let $el = getVideoContainer();
        $el.append($("<video id='localVideoPreview' autoplay muted playsinline></video>"));
        return Util.waitForElement("#localVideoPreview");
    }
    const destroyVideoElement = () => {
        $(".gum-video-container").empty();
    }

    const getVideoPreviewElement =() =>{
        let existing = $("#localVideoPreview");
        if(existing.length){
            return Promise.resolve(existing[0]);
        }
        return createVideoElement();
    }

    init();
    return {
        getStreams,
        getStreamClones,
        invalidateCurrentStreams,
        nextCamera,
        toggleFacing,
        enableAudio,
        disableAudio,
        enableTracks,
        disableTracks,
        clearTracks,
        clearTracksFromPeerConnection,
        replaceStream,
        getBlack,
        getBlackSilence,
        isAudioEnabled,
        getIdealConstraints,
        getBackupConstraints,
        getBandwidthConstraints,
        setBandwidthConstraints,
        getVideoDevices,
        getVideoDeviceID,
        setVideoDeviceID,
        createVideoElement,
        getVideoPreviewElement,
        isRunning,
        stop
    }
})
app.factory("StreamService",function(){
    /* fires once when any of the tracks on a mediastream ends */
    function onAnyTrackEnded(html5mediaStream,f){
        let handler = function(){
            f();
            html5mediaStream.getTracks().forEach(track=>{
                track.removeEventListener('ended',handler);
            })
        }
        html5mediaStream.getTracks().forEach(track=>{
            track.addEventListener('ended', handler);
        })
    }
    return {
        onAnyTrackEnded,
    }
})

app.factory("PublishStreamService",function(ProcessStreamService,SelfPublishSocketService,
    WebRTCVideoStreamingService,StreamService){
    let processor = ProcessStreamService();
    let socket = SelfPublishSocketService.get();
    let currentID;
    let obs = new Util.Observer();
    obs.on((id,status)=>{
        console.log("publish stream service",id,status);
    })
    let currentStream;

    function onOpen(o){
        if(o){
            processor.process(currentStream);
            obs.notify(currentID,"open");
        }
    }
    function onClose(o){
        if(o){
            if(processor.isRunning())processor.stop();
            obs.notify(currentID,"closed");
            currentID = undefined;
        }
    }

    socket.obs.open.on(onOpen);
    socket.obs.close.on(onClose);
    processor.onDataAvailable(data=>{
        socket.send(data);
    })
    
    function finish(){
        obs.notify(currentID,"closing");
        return processor.finish().then(()=>{
            return socket.close();
        });
    }
    function publishID(id){
        let session = WebRTCVideoStreamingService.getStreamSession(id).session;
        if(session){
            currentID = id;
            obs.notify(id,"opening");
           
            currentStream = session.stream;
            /* When  this stream ends for any reason, ifit is the one currently being published, stop publishing */
            StreamService.onAnyTrackEnded(session.stream,()=>{
                if(id == currentID){
                    finish();
                }
            })
            return SelfPublishSocketService.open();
        }
        else{
            /* If the stream doesn't exist yet, just give up */
            obs.notify(id,"closed");
            return Promise.reject("no stream to publish");
        }
    }
    /* takes a label ID and ...
        if it was already being published, stops publishing it
        if something else was already being published, stops publishing that and starts publishing this,
        and if nothing was being published, then it starts publishing this label's stream */
    function toggleID(id){
        if(id == currentID){ // already publishing this, so stop
            return finish();
        }
        else{
            if(currentID === undefined){ // no publishing is in progress, start new one
                publishID(id);
            }
            else{ // stop old publish and start new
                obs.notify(id,"opening");
                finish().then(()=>{
                    publishID(id);
                })
            }
        }
    }

    return {
        toggleID,
        obs
    }

});
app.factory("DownloadStreamService",function(ProcessStreamService,DownloadService){
    let recordedChunks = [];
    let processor = ProcessStreamService();
    processor.onDataAvailable(data=>{
        recordedChunks.push(data);
    })
    
    function start(stream){
        recordedChunks = [];
        processor.process(stream);
        return Promise.resolve();
        
    }
    function finish(){
        return processor.finish().then(()=>{
            let blob = getBlob();
            DownloadService.downloadBlob({
                filename: "video-"+Util.generateUUID(),
                blob:blob
            })
        })
    }

    function getBlob(){
        return new Blob(recordedChunks, {
            type: processor.options.mimeType
        });
    }
    return {
        start,
        finish
    }
})

app.factory("ProcessStreamService",function(DownloadService){
    const TIMESLICE = 10; // ms. undefined would mean ondataavailable() gets called after stop() is called
    const FINISH_TIME = 300; // ms. Time alotted after we call mediaRecorder.stop to allow the final media to be received.
    // const DEFAULT_MIMETYPE = 'video/mp4'; // throws an error in Chrome
    const DEFAULT_MIMETYPE =  "video/webm; codecs=vp9";
    const DEFAULT_OPTIONS = {
        mimeType: DEFAULT_MIMETYPE
    };
    class StreamProcessor{
        constructor(options){
            this.storedOnDataAvailableFunc = event=>{console.log("stored on data available func should never be called")};//DEFAULT_ON_DATA_AVAILABLE;
            this.options = Object.assign({},DEFAULT_OPTIONS,options);
            this.stream = this.options.stream;
        }
        onDataAvailable(f){
            function handler(event){
                console.log("processing stream data for publish");
                f(event.data);
            }
            if(this.mediaRecorder){
                this.mediaRecorder.ondataavailable = handler;
            }
            this.storedOnDataAvailableFunc = handler;
        }
        stop(){
            console.log("stop media recorder");
            if(this.isRunning()){
                this.mediaRecorder.stop();
            }
            else{
                console.warn("tried to stop media recorder that isn't running",JSON.stringify(this.mediaRecorder));
            }
            // otherwise it is already stopped
        }
        /* stop but also give some time for any last remaining data to come out of the pipeline */
        finish(){
            return new Promise((res,rej)=>{
                this.stop();
                Util.wait(FINISH_TIME).then(res)
            })
        }
        toBlob(){
            return new Blob(this.recordedChunks, {
                type: this.options.mimeType
            });
        }
        download(filename){
            if(!filename){
                filename = "video-"+Util.generateUUID();
            }
            DownloadService.downloadBlob({
                filename:filename,
                blob:this.toBlob()
            })
        }
        onStop(f){
            this.mediaRecorder.onstop = f;
        }

        internalStart(){
            // console.warn("new media recorder");
            this.mediaRecorder = new MediaRecorder(this.stream,this.options);
            this.mediaRecorder.ondataavailable = this.storedOnDataAvailableFunc;
            this.recordedChunks = [];
            this.mediaRecorder.start(TIMESLICE);
            return new Promise((res,rej)=>{
                this.mediaRecorder.onstart = res;
                this.mediaRecorder.onerror = rej;
            })
        }
        isRunning(){
            return this.mediaRecorder && (this.mediaRecorder.state === "recording");
        }
        start(){
            if(this.isRunning()){
                return Promise.resolve("already running");
            }
            return this.internalStart();
        }
        restart(){
            if(this.isRunning()){
                this.stop();
            }
            this.internalStart();
            
        }
        process(stream){
            this.stream = stream;
            this.start();
        }
    }
    return stream => new StreamProcessor(stream);
})


app.factory("ScreenshareService",function(BrowserStorageService){
    const browserStorageName = "gum-share-screen";
    let enabled = new Util.Observable(BrowserStorageService.get(browserStorageName));
    enabled.on(newValue=>{
        BrowserStorageService.set(browserStorageName,newValue);
    })

    function getScreenshareFactory(){
        try{
            if(navigator.getDisplayMedia) return navigator.getDisplayMedia.bind(navigator);
            if(navigator.mediaDevices.getDisplayMedia) return navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        }catch(e){
            // error trying to access getDisplayMedia
            console.error("can't share screen",e);
        }
        return undefined;
    }
    function getStream() {
        // return Util.timeoutPromise(
            return new Promise((res,rej)=>{
            let factory = getScreenshareFactory();
            if(!factory){
                rej({message:"Unable to share screen"});
            }
            res(factory({video: true}));
        })
        // ,15000);
    }

    function enable(){
        enabled.set(true);
    }
    function disable(){
        enabled.set(false);
        console.log("Screenshare service DISABLED");
    }
    function isEnabled(){
        return enabled.get();
    }

    return {
        getScreenshareFactory,
        getStream,
        isEnabled,
        enable,
        disable
    }
})
/* global app Util $ Form*/

/* Established functions that open up a new pane in the control panel */
app.factory("NewViews",function(GumService,GoldenLayoutService,PaneService,EnabledService,ScreenshareService){
    const openGumHelper = () => {
        if(GoldenLayoutService.getGum()){
            try{
                GoldenLayoutService.closeAllGUM();
            }catch(e){
                console.warn("tried to close GUM window but couldnt find it");
            }
        }
        let id = Util.generateUUID();
        PaneService.open({
            id:id,
            title:"Video Recording",
            contentType:"gum",
            popoutEnabled:false,
            type:'component',
            shortRow:EnabledService.wideScreen()?false:true,
            fullRow:EnabledService.wideScreen()?false:true,
            componentName:'gumTemplate',
            componentState:{templateId:'gumTemplate'}
        })
    }
    const openGum = () => {
        ScreenshareService.disable();
        openGumHelper();
    }

    const openScreenshare = () => {
        ScreenshareService.enable();
        openGumHelper();
    }

    const browse = uri => {
        let id = Util.generateUUID();
        if(!uri.includes("://")){ // If no scheme is specified, assume http
            uri = "http://"+uri;
        }
        PaneService.open({
            id:id,
            title:'Page at \''+uri+'\'',
            pageURI:uri,
            contentType:"browse",
            popoutEnabled:false,
            pbs:false
        });
    }

    const openChat = () => {
        let id = Util.generateUUID();
        PaneService.open({
            id:id,
            title:"Chat",
            contentType:"chat",
            popoutEnabled:false,
            pbs:false
        })
    }

    const openDialPad = () => {
        let id = Util.generateUUID();
        let config = {
            popoutEnabled:false,
            pbs:false,
            id:id,
            contentType:"dialPad",
            title: "Dial Pad",
            type: 'component',
            componentName: 'dialPad',
            componentState: { templateId: 'dialPad' }
        }
        PaneService.open(config);
    }

    const openGeo = () => {
        let id = Util.generateUUID();
        PaneService.open({
            id:id,
            contentType:"geo",
            title:"Geolocation",
            popoutEnabled:false,
            pbs:false
        });
    }
    return {
        openGeo,
        openGum,
        openScreenshare,
        openDialPad,
        openChat,
        browse
    }
})
/* Established functions that open up a modal for the user to interact with */
app.factory("Modals",function(FormModalService,VideoManagerService,PlaySoundService, WhosStreamingService, NotificationService,AndroidService,
    WebRTCVideoStreamingService,ProgressBarService,URLService,ModalConfirmer,NewViews,ConnectionService, TroubleshootService){
    const openVideoStreamModal = () => {
        let formdata = Form(2);
        let field = formdata.get(0);
        field.label="URI";
        field.modelName = "uri";
        field = formdata.get(1);
        field.label="Popout";
        field.modelName="popout";
        field.type = "toggleSwitch";
        FormModalService.open({
            title:"Manually enter the URI of a resource to display",
            form:formdata,
            submit:submitted=>{
                let uri = submitted.uri;
                let popout = submitted.popout == "ON";
                if(popout){
                    VideoManagerService.popout(uri);
                }
                else{
                    VideoManagerService.playAnonymous(uri);
                }
            }
        })
    }
    const idsToURLS = ids => {
        return ids.map(id=>WebRTCVideoStreamingService.getStreamURL(id)).join("\n");
    }
    const openStreamURLs = () => {
        let myStreams = WebRTCVideoStreamingService.get();
        let myStreamsString = idsToURLS(myStreams);
        WhosStreamingService.pull().then(ids=>{
            let allStreamsString = idsToURLS(ids);
            let formdata = Form(2);
            let field = formdata.get(0);
            field.label="Selected Streams";
            field.modelName = "selected";
            field.type = "textarea"
            field.initialValue = myStreamsString;
            field = formdata.get(1);
            field.label="All Streams";
            field.modelName="all";
            field.type = "textarea";
            field.initialValue = allStreamsString;
            FormModalService.open({
                title:"Get URLs for streams",
                form:formdata,
                submit:()=>{} // Nothing needs to happen when we submit
            })
        })
    }
    const showConsole = (params) => {
        params = params || {};
        let searchTerm = params.searchTerm;
        let consoleResult = params.consoleResult;
        let fieldNumber = 0;

        let formdata = Form();
        let field = formdata.get(fieldNumber);
        field.label="Console";
        field.type="text";
        field.modelName="console";
        field.initialValue=params.console;
        field.localStorage = "debug-console";

        if(consoleResult !== undefined){
            field = formdata.get(++fieldNumber);
            field.label = "Console result";
            field.type="text";
            field.initialValue = consoleResult;
        }

        field = formdata.get(++fieldNumber);
        field.label="Search Term";
        field.modelName="searchTerm";
        field.type="text";

        field = formdata.get(++fieldNumber);
        field.label="Logs";
        field.modelName = "logs";
        field.type="textarea";
        field.rows = 20;
        field.cols = 200;
        field.initialValue = Util.logs.get().filter(str=>{
            if(!searchTerm) return true;
            return str.indexOf(searchTerm) != -1;
        }).join("\n");

        FormModalService.open({
            title:"View logs",
            form:formdata,
            size:"large",
            height:"500px",
            submit:submitted=>{
                if(submitted.searchTerm){
                    showConsole({searchTerm:submitted.searchTerm})
                }
                else if(submitted.console){
                    let result = eval(submitted.console)
                    if(typeof(result) == "object"){
                        try{
                            result = JSON.stringify(result);
                        }
                        catch(e){
                            result = "[Object could not be stringified]";
                        }
                    }
                    // console.log("RESULT",result);
                    showConsole({consoleResult:result,console:submitted.console});
                }
                
            }
        })
        
    }

    const openAlertsModal = () => {
        let formdata = Form(2);
        let field = formdata.get(0);
        field.type="selectorchooser";
        field.modelName = "selector";
        field.label="Selector";
        field = formdata.get(1);
        field.type="audiofile";
        field.modelName = "sound";
        field.label="Audio File";
        FormModalService.open({
            title:"Send Alerts",
            rememberOnChange:true,
            closeOnSubmit:false,
            form:formdata,
            submit:submitted=>{
                console.log("submitted",submitted);
                let soundfile = submitted.sound.value;
                let selectorID = submitted.selector;
                let promise = PlaySoundService.play(soundfile,selectorID);
                ProgressBarService.track(promise,{showSuccess:true});
            }
        })
    }
    const openWebpageModal = () => {
        let formdata = Form(1);
        let field = formdata.get(0);
        field.label="URL";
        field.modelName = "uri";
        field.initialValue = URLService.buildURL({path:"/SystemAdmin/"});
        FormModalService.open({
            title:"Enter the URL of a page to add to your display.",
            form:formdata,
            submit:submitted=>{
                let uri = submitted.uri;
                NewViews.browse(uri);
            }
        })
    }
    const openTroubleshootAudio = () => {
        TroubleshootService.show("websocket");
    }
    const confirmLogout = () => {
        ModalConfirmer.prompt({
            title:"Confirm logout",
            okayLabel:"Log out",
            message:"Are you sure you would like to log out?"
        }).then(ConnectionService.logoutManual);
    }
    
    const manuallySetCSS = () => {
        let formdata = Form();
        let field = formdata.get(0);
        field.label="Query selector";
        field.modelName = "query";
        field.initialValue = "#controlPanelPane";
        field = formdata.get(1);
        field.label= "CSS Property";
        field.modelName="prop";
        field.initialValue="height";
        field = formdata.get(2);
        field.label = "Value"
        field.modelName = "value";
        field.placeholder="just report current value";
        field.initialValue="";
        FormModalService.open({
            title: "Manually adjust the height of any chosen element",
            form:formdata,
            closeOnSubmit:false,
            submit:submitted=>{
                let prev = $(submitted.query).css(submitted.prop);
                NotificationService.add({message:"Previous value of "+submitted.prop + ": "+prev});
                if(submitted.value !== "" && submitted.value !== undefined){
                    $(submitted.query).css(submitted.prop,submitted.value)
                }
            }
        })
    }

    const openSendIntentModal = () => {
        let formdata = Form();
        let field = formdata.get(0);
        field.label="Intent name";
        field.modelName = "intent";
        field.initialValue = "android.intent.action.PTT.down";
        FormModalService.open({
            title:"Send Intent",
            form:formdata,
            closeOnSubmit:false,
            submit:submitted=>{
                let name = submitted.intent;
                AndroidService.broadcastIntent(name);
            }
        })
    }

    return{
        openVideoStreamModal,
        openAlertsModal,
        openWebpageModal,
        openStreamURLs,
        openTroubleshootAudio,
        openSendIntentModal,
        manuallySetCSS,
        showConsole,
        confirmLogout
    }
})
/* Collection of the configurations of menu options, which consist of the 
    label: text displayed for the option
    icon: icon displayed for the option
    fn: a function that gets called when the option is clicked on

    They are listed here so they can be referred to with one line, and rearranged easily
 */
app.factory("MenuOptions",function(Modals,ThemeService, NewViews,EnabledService,NotificationService,$uibModal,GoldenLayoutService,BrowserStorageService,LevelsService){
    let alerts = {
        label:"Send Alerts",
        icon:"fa fa-bell",
        fn: ()=>Modals.openAlertsModal()
    }
    let defaultTheme = {
        label:"Default",
        icon:"fa fa-circle",
        fn:()=>ThemeService.setTheme("dark theme")
    };
    let iconsTheme = {
        label:"Icons",
        icon:"fa fa-circle-o",
        fn:()=>ThemeService.setTheme("light theme")
    }
    let openVideoStream = {
        label:"Open video stream",
        icon:"fa fa-film",
        fn: Modals.openVideoStreamModal
    };
    let openWebpage = {
        label:"Open webpage",
        icon:"fa fa-at",
        fn: Modals.openWebpageModal
    };
    let openGeo = {
        label:"Geolocation",
        isDisabled: () => !EnabledService.geoButton(),
        icon:"fa fa-globe",
        fn: NewViews.openGeo
    };
    let openChat = {
        label:"Chat",
        icon:"fa fa-comments",
        isDisabled: ()=> !EnabledService.chat(),
        fn: NewViews.openChat
    };
    let openDialPad = {
        label:"Dial pad",
        icon:"fa fa-phone",
        fn: NewViews.openDialPad
    }
    let logout = {
        label:"Logout",
        icon:"fa fa-sign-out",
        fn:Modals.confirmLogout,
        closeMenu:false
    };
    let openGum = {
        label:"Open Webcam",
        icon:"fa fa-camera",
        isDisabled: () => !EnabledService.videoStreaming(),
        fn: NewViews.openGum
    }
    let openScreenshare = {
        label: "Share Screen",
        icon: "fa fa-desktop",
        isDisabled: () => !EnabledService.videoStreaming(),
        fn: NewViews.openScreenshare
    }
    let openTroubleshootAudio = {
        label:"Audio Websocket",
        icon:"fa fa-volume-control-phone",
        fn: Modals.openTroubleshootAudio
    }
    let streamURLs = {
        label:"Get stream URLs",
        icon:"fa-external-link",
        fn: ()=> Modals.openStreamURLs()
    };

    let assignPTT = {
        label:"Push To Talk Setup",
        icon:"fa fa-wrench",
        fn:()=>{
            $uibModal.open({
                controller:"AssignPTTController",
                templateUrl:"views/assignPTT.html?v="+window.vcomBuildVersion
            })
        }
    }
    let resetGL = {
        label: "Reset GoldenLayout",
        icon:"fa fa-window-restore",
        fn:()=>{
            GoldenLayoutService.sizeToFit();
        }
    }
    let reportDimensions = {
        label:"Report Dimension",
        icon:"fa fa-percent",
        fn:()=>{
            let viewportHeight = window.innerHeight;
            NotificationService.add({message:"innerHeight: " + viewportHeight });
            console.log("innerheight",viewportHeight);
            ["html","body","#container-middle",".container-container","#controlPanelPane"].forEach(query=>{
                console.log(query,"dimensions:",$(query).width(),$(query).height());
                NotificationService.add({message:query+" dimensions: " + $(query).width() + " by " + $(query).height()})
            })
        }
    }
    let manuallySetCSS = {
        label: "Manually Set CSS",
        icon: "fa fa-long-arrow-up",
        fn:Modals.manuallySetCSS
    }

    let showConsole = {
        label: "Console",
        icon: "fa fa-list-alt",
        fn:Modals.showConsole
    }

    let clearLayoutState = {
        label: "Clear Saved Layout",
        icon: "fa fa-close",
        fn:()=>{
            BrowserStorageService.remove("goldenLayoutState");
        }
    }

    let sendIntent = {
        label: "Send Intent",
        icon: "fa fa-send",
        fn:Modals.openSendIntentModal
    }

    let showLevels = {
        label: "Show/Hide Level Adjustments",
        icon: "fa fa-volume-up",
        fn:LevelsService.toggleVisibility
    }

    

    return {
        iconsTheme,
        defaultTheme,
        alerts,
        openVideoStream,
        openWebpage,
        openGeo,
        openChat,
        openDialPad,
        openGum,
        openScreenshare,
        openTroubleshootAudio,
        streamURLs,
        assignPTT,
        resetGL,
        clearLayoutState,
        reportDimensions,
        manuallySetCSS,
        showConsole,
        sendIntent,
        showLevels,
        logout

    }
})
/* Organization of the Desktop version of the menu */
app.factory("MenuService",function(MenuOptions,EnvService,EnabledService){
    const getThemesMenu = () => [
        MenuOptions.defaultTheme,
        MenuOptions.iconsTheme
    ];
    const getAddViewMenu = () => {
        let options = [
            MenuOptions.openVideoStream,
            MenuOptions.openWebpage,
            MenuOptions.openGeo,
            MenuOptions.openChat,
            MenuOptions.openDialPad,
            MenuOptions.openGum,
            MenuOptions.openScreenshare
        ]
        return options;
    }
    const getAdvancedMenu = () => {
        let arr = [
            MenuOptions.alerts,
            MenuOptions.assignPTT,
            MenuOptions.showLevels
            // MenuOptions.reportDimensions,
            // MenuOptions.resetGL,
            // MenuOptions.manuallySetCSS,
            // MenuOptions.showConsole,
            // MenuOptions.clearLayoutState,
            // MenuOptions.streamURLs
        ]
        if(EnvService.isDevelopment()){
            arr.push(MenuOptions.openTroubleshootAudio);
        }
        return arr;
    }
   
    const getTroubleshootMenu = () => [
        MenuOptions.openTroubleshootAudio
    ]
    return {
        getThemesMenu,
        getAddViewMenu,
        getAdvancedMenu,
        getTroubleshootMenu
    }
})
/* Organization of the Mobile version of the menu */
app.factory("MobileMenuService",function(MobileMenuHelperService,MenuOptions,MenuService){
    const openAdvancedMenu = () => {
        MobileMenuHelperService.open({
            buttons:[
                MenuOptions.assignPTT,
                MenuOptions.showLevels,
                // MenuOptions.reportDimensions,
                // MenuOptions.resetGL,
                // MenuOptions.manuallySetCSS,
                // MenuOptions.showConsole,/
                // MenuOptions.clearLayoutState,
                MenuOptions.alerts
            ]
        })
    }
    const openThemeViewMenu = () => {
        MobileMenuHelperService.open({
            buttons:[
                MenuOptions.iconsTheme,
                MenuOptions.defaultTheme
            ]
        })
    }
    const openAddViewMenu = () => {
        let buttons = MenuService.getAddViewMenu();
         /* Hide openGum menu option because it has its own place in an earlier menu */
        buttons = buttons.filter(op=>{
            return op != MenuOptions.openGum
        })
        MobileMenuHelperService.open({
            buttons:buttons
        })
    }

    /* Opening individual Modals */
    const openMainMenu = () => {
        MobileMenuHelperService.open({
            buttons:[
                MenuOptions.logout,
                /* The following three menu options are listed in full detail here because their 'fn' functions
                refer to functions that are not availble in the MenuOptions service. So this is a little gross. */
                {
                    label:"Advanced",
                    icon:"fa fa-sliders",
                    fn:openAdvancedMenu,
                    closeMenu:false
                },
                {
                    label:"Theme",
                    icon:"fa fa-adjust",
                    fn:openThemeViewMenu,
                    closeMenu:false
                },
                {
                    label:"Add View",
                    icon:"fa fa-th-large",
                    fn:openAddViewMenu,
                    closeMenu:false
                },
                MenuOptions.openGum
            ]
        })
    }
    return {
        openMainMenu,
        close:MobileMenuHelperService.close,
        isOpen:MobileMenuHelperService.isOpen
    }
    
})
/* The original MobileMenuService, now serving as a lower-level interface that helps implement
The new MobileMenuService */
app.factory("MobileMenuHelperService",function(){
    const getParent = () => $(".mobileMenu-container");
    const getElement = () => $(".mobileMenu");
    let currentlyOpen = false;
    const defaultButtonConfig = {
        isDisabled:()=>false,
        closeMenu: true // set to true if you want the menu to close when this option is chosen
    }
    const makeButton = options => {
        // let html = "<div class='btn btn-default' ng-click='> <i class='"+options.icon+"'></i> "+options.label+" </div>"
        let el = $("<div></div>")
        .addClass("btn btn-default")
        .on("click",()=>{
            options.fn();
            return options.closeMenu; // returning false here prevents event from bubbling up to the mobileMenu-collapser
        });
        let i = $("<i>").addClass(options.icon);
        let t = $("<span> "+options.label+"</span>");
        el.append(i);
        el.append(t);
        

        console.log("ELEMENT",el);
        return el;
    }
    const open = config => {
        currentlyOpen = true;
        getParent().css("display","block");
        getElement().empty();
        config.buttons.forEach(buttonConfig=>{
            buttonConfig = Object.assign({},defaultButtonConfig,buttonConfig);
            if(!buttonConfig.isDisabled()){
                getElement().append(makeButton(buttonConfig));
            }
        })
    }
    const close = () => {
        currentlyOpen = false;
        getParent().css("display","none");
    }
    const isOpen = () => currentlyOpen;

    return {
        open,
        isOpen,
        close
    }
})
/* global app */
app.factory("PTTService",function(BrowserStorageService,AndroidService,SelectorsService,NotificationService){
    /* PTT Key */
    const assign = key => {
        BrowserStorageService.setLocal("pttKey",key);
        AndroidService.setPreference("pttKey",key);
        AndroidService.overrideKeycode(key.value);
    }
    const clear = () => {
        BrowserStorageService.remove("pttKey");
        AndroidService.setPreference("pttKey","undefined");
    }
    /* Returns a promise to go along with possible Android communication */
    const get = () => {
        if(AndroidService.isEnabled()){
            return AndroidService.getPreference("pttKey") || {label:"",value:"",scan:""};
        }
        else{
            return BrowserStorageService.get("pttKey") || {label:"",value:"",scan:""};
        }
    }
    const set = key => assign(key);

    /* PTT Selector */
    const setSelector = (x) => {
        BrowserStorageService.set("pttSelector",x);
        AndroidService.setPreference("pttSelector",x);
    }
    /* Tries to infer which selector the user wants to talk to when they activate the PTT button.
       Every possible selector chosen should be automatically restricted to selectors that can be TALKed to.
       The order of preference should be clear from the code.
       One tricky thing to note is that 'getChosenSelector' and 'getMostRecentTalk' could return a selector that is offline
       The other methods shouldn't. If the user tries to talk to a selector that is offline, they'll be shown a warning message.
        */
    const getSelector = () => {
        let id = getChosenSelector() || // chosen in the PTT dialog and stored in Browser Storage
                 SelectorsService.getFirstOnlineTalkSelectorWithHotkey() || // chosen in VSA Selector Assignments dialog
                 SelectorsService.getMostRecentTalk() ||
                 SelectorsService.getFirstOnlineTalk(); // ordering chosen in VSA SA dialog
        return id;
    }
    const getChosenSelector = () => {
        if(AndroidService.isEnabled()){
            return AndroidService.getPreference("pttSelector");
        }
        return BrowserStorageService.get("pttSelector");
    }
    const warn = msg => NotificationService.add({message:msg});

    const pttUnavailable = () => {
        let id = getSelector();
        let s = SelectorsService.firstSelectorWithID(id);
        if(s === undefined){
            warn("PTT activated, but no Talk selectors are online.")
            return true;
        }
        if(!SelectorsService.isEnabled(s.randID)){
            warn("PTT activated, but your chosen selector is offline.")
            return true;
        }
        return false;
    }

    const pttOn = () => {
        if(pttUnavailable()) return;
        SelectorsService.talkOn(getSelector());
    }
    const pttOff = () => {
        SelectorsService.talkOff(getSelector());
    }

    let verbose = false;
    let paused = false;
    const setVerbose = bool => verbose = bool;
    const getVerbose = () => verbose; 
    const isPaused = () => paused;
    const pause = () => paused = true;
    const resume = () => paused = false;
    return {
        isPaused,
        pause,
        resume,
        setVerbose,
        getVerbose,
        setSelector,
        getSelector,
        getChosenSelector,
        pttOn,
        pttOff,
        assign,
        clear,
        get,
        set
    }
})
/* global app Util */
app.factory("SelectorsService",function(LabelStorageService, WhosStreamingService, CallNotificationService, LevelsService,
    VideoManagerService,WebRTCVideoStreamingService,SelectorActivationService, MicrophoneService, BrowserStorageService,
    ProgressBarService, WhosTalkingService, $q, WhosOnlineService, MyLabelService, PreferenceService){

    const RECENTLY_ACTIVE_DURATION = 10000; // 10 seconds

    
    let selectors;
    let mostRecentTalk;         // ID of selector we have talked to most recently. Used for PTT
    let activeStreams = Util.Set();          // keeps track of IDs of selectors that are streaming live videos
    let activeTalks = Util.Set();
    let activeOnlines = Util.Set();
    let activeVideos = Util.Set();
    let activeAssigned = Util.Set();
    let recentlyActives = Util.Set();
    let callLog = Util.Map();
    let deferredReady;          // deferred that resolves once we've loaded selectors
    let allSelectorsObs;        // observers for consumers of SelectorsService to see when talk/listen are toggled for selectors
    // allSelectorObs refers to the desiredTalk and desiredListen concepts of a selector.
    trackWhosAssignedToMe();
    trackWhosStreaming();
    trackWhosTalking();
    trackWhosOnline();
    trackWhosVisible(); // no explicit Set of which are visible, we update when activeOnlines gets updated
    trackWhichVideosWeAreWatching();
    trackCallLog();

    /*
        Selectors are derived from a label's SELECTORS array where they can have the following properties
        {
            TYPE: SELECTOR_TALK | SELECTOR_LISTEN
            ID: (if it's not a spacer)
            ALIAS: (if it's not a spacer)
            LATCH_DISABLE: (optional)
            HOT_KEY: (optional)
        }

        We then decorate them and add the following properties
            label: reference to this selector's label (they share the same ID)
            name: what text to display on the selector
            leftType: ("listen"|"talk"|"video") determines the left side color
            rightType:
            leftClick: a function that will be called when clicked with "pressOrRelease" as a boolean argument
            rightClick:
            leftIconClass: css class string for the icon ("fa fa-volume-up")
            rightIconClass:
            videoActive: true if we are watching this selector's video
            listenActive: true if we are listening to this selector
            talkActive: true if we are talking to this selector
            unansweredCall: true if we have not talked back to this selector after we received a call notification
            tallyVisible: set this to true if we want the selector to blink
            callNotification: is true when we receive a call notification, then turns false when the notification ends
            recentlyActiveTimer: an object that helps us calculate if the selector counts as recently active
            offline: true if the selector is offline
            visible: true if we should show the selector
            isStreaming: true if the selector is streaming video

            obs: contains observable properties of the selector
                recentlyActive:     notifies true when the selector becomes currently active. notifies false when it has been RECENTLY_ACTIVE_DURATION since activity
                currentlyActive:    notifies true when the selector becomes currently active. notifies false when it stops being currently active.
                desiredListen:      notifies true when the user clicks on the selector and wants to listen
                desiredTalk:        notifies true when the user clicks on the selector and wants to talk
                actualListen:       notifies true when the server is actually sending audio from the selector to us
                actualTalk:         notifies true when the server is actually sending audio from us to the selector
    */


    const reset = () => {
        console.log("SELECTORS SERVICE RESET");
        if(selectors)selectors.forEach(s=>{if(s.obs)s.obs.clear();}) // remove any observers from previously existing selectors
        if(allSelectorsObs)allSelectorsObs.clear();
        allSelectorsObs = new Util.Observers(["listen","talk"]);
        onToggleTalk((id,state)=>handleTalkListenOnOff(id,"talk",state));
        onToggleListen((id,state)=>handleTalkListenOnOff(id,"listen",state))
        selectors = [] // todo: convert to a map
        mostRecentTalk = undefined;
        deferredReady = $q.defer();
        // 
        CallNotificationService.obs.clear();
        CallNotificationService.obs.add.on(onCallNotificationOn);
        CallNotificationService.obs.remove.on(onCallNotificationOff);
    }
    /* Reload all selectors and labels to make sure we're up to date */
    const refresh = () => {
        let p = MyLabelService.refreshVCP().then(()=>{
            selectors.splice(0,selectors.length); // remove all existing selectors
            let myLabel = MyLabelService.get();
            myLabel.SELECTORS.forEach(selector=>{
                let copy = Util.deepCopy(selector);
                selectors.push(copy);
                // decorate each selector
                decorateSelector(copy);
            })

            /* reset these Sets to empty so we can appropriately add properties to the new selectors */
            activeAssigned.set([]);
            activeStreams.set([]);
            activeOnlines.set([]);
            activeTalks.set([]);
            activeVideos.set([]);
            recentlyActives.set([]);

            activeAssigned.set(myLabel.SELECTORS.filter(s=>s!=undefined).map(s=>s.ID).filter(id=>id!=undefined));
            deferredReady.resolve();

            return selectors;
        })
        .catch(e=>{
            console.error("Failed to refresh selectors",e);
        })
        ProgressBarService.track(p);
        return p;
    }
/* TRACKING */
/* TRACKING WHOS ASSIGNED TO ME */
    function assignedToMe(id){
        // currently unused
    }
    function unassignToMe(id){
        // currently unused
    }
    function trackWhosAssignedToMe(){
        // right now we set activeAssigned when we call refreshVCP above, rather than observing an HTTP request
    }
/* TRACKING WHOS STREAMING */
    /* tracks according to the /status/videostreaming API which may report clients as streaming even when they are offline */
    function setStreaming(id){
        console.log("active streams adding id",id);
        setSelectorProperty(id,"isStreaming",true);
    }
    function setNotStreaming(id){
        setSelectorProperty(id,"isStreaming",false);
        WebRTCVideoStreamingService.getStreamSession(id).notifyStopped();
        // WebRTCVideoStreamingService.clearSession(id); // when a WebRTC stream stops broadcasting, destroy the MediaStreams associated with it
    }
    function setStreamingIDs(ids) {activeStreams.set(ids);}
    function trackWhosStreaming () {
        /* off and on is used here to make this function idempotent. The handler functions must be 
        declared outside of this function so that the arguments to .off and .on always point to the same
        exact function object that exists one time in memory */
        WhosStreamingService.obs.pullSuccess.off(setStreamingIDs);
        WhosStreamingService.obs.pullSuccess.on(setStreamingIDs);
        activeStreams.obs.add.off(setStreaming);
        activeStreams.obs.add.on(setStreaming);
        activeStreams.obs.remove.off(setNotStreaming);
        activeStreams.obs.remove.on(setNotStreaming);
    }

/* TRACKING WHOS TALKING */
    function setTalkingIDs(ids){activeTalks.set(ids);}
    function setTalking(id){setSelectorProperty(id,"voiceActive",true);}
    function setNotTalking(id){setSelectorProperty(id,"voiceActive",false)}
    function trackWhosTalking(){
        WhosTalkingService.obs.pullSuccess.off(setTalkingIDs);
        WhosTalkingService.obs.pullSuccess.on(setTalkingIDs);
        activeTalks.obs.add.off(setTalking);
        activeTalks.obs.add.on(setTalking);
        activeTalks.obs.remove.off(setNotTalking);
        activeTalks.obs.remove.on(setNotTalking);
    }

    
/* TRACKING WHOS ONLINE */
    function setOnlineIDs(ids){activeOnlines.set(ids)}
    function setOnline(id){
        setSelectorProperty(id,"offline",false);
        refreshSelectorName(id); // Refresh names when clients login (for guests, whose names change only as someone new logs in)
    }
    function setOffline(id){
        setSelectorProperty(id,"offline",true);
        selectorsWithID(id).forEach(s=>{
            setSelectorNoLongerTalkingOrListening(s.randID);
        })
    }
    function trackWhosOnline () {
        WhosOnlineService.obs.pullSuccess.off(setOnlineIDs);
        WhosOnlineService.obs.pullSuccess.on(setOnlineIDs);// Every time WhosOnlineService gets new info, lets apply it.
        activeOnlines.obs.add.off(setOnline);
        activeOnlines.obs.add.on(setOnline);
        activeOnlines.obs.remove.off(setOffline);
        activeOnlines.obs.remove.on(setOffline);
    }

/* TRACKING WHOS VISIBLE */
    function updateVisibility(id){
        selectorsWithID(id).forEach(s=>{
            s.visible = isVisible(s.randID);
        })
    }
    /* rather than keeping track of the set of which selectors are visible, we listen for updates to other
    sets and react based on that. */
    function trackWhosVisible(){
        activeOnlines.obs.add.off(updateVisibility);
        activeOnlines.obs.add.on(updateVisibility);
        activeOnlines.obs.remove.off(updateVisibility);
        activeOnlines.obs.remove.on(updateVisibility);
    }
/* TRACKING WHOSE VIDEOS WE ARE WATCHING */
    function addWatchingVideo(id){activeVideos.add(id);}
    function removeWatchingVideo(id){activeVideos.remove(id);}
    function trackWhichVideosWeAreWatching() {
        /* Active videos are either normal videos or webrtc streams
        normally we would just need to .set the Set to the new IDs but we get half from VideoManagerService
        and the other half from WebRTCVideoStreamingService so we will just listen for all the adds/removes from either */
        VideoManagerService.obs.add.off(addWatchingVideo);
        VideoManagerService.obs.add.on(addWatchingVideo);
        VideoManagerService.obs.remove.off(removeWatchingVideo);
        VideoManagerService.obs.remove.on(removeWatchingVideo);
        WebRTCVideoStreamingService.obs.add.off(addWatchingVideo);
        WebRTCVideoStreamingService.obs.add.on(addWatchingVideo);
        WebRTCVideoStreamingService.obs.remove.off(removeWatchingVideo);
        WebRTCVideoStreamingService.obs.remove.on(removeWatchingVideo);
        /* Now that we have the activeVideos set updating properly
        actually make the change to the selector objects so they show the orange bars or don't */
        activeVideos.obs.add.off(setVideoActive);
        activeVideos.obs.add.on(setVideoActive);
        activeVideos.obs.remove.off(setVideoInactive);
        activeVideos.obs.remove.on(setVideoInactive);
    }

    function trackCallLog(){
        // load from bss
        let stored = BrowserStorageService.get("dispatch-call-log");
        if(stored){
            Object.keys(stored).forEach(key=>{
                let v = stored[key];
                console.log("initializing call log with",key,v);
                callLog.set(key,v);
            })
        }
        
        // when changed, save to bss
        callLog.obs.set.on(()=>{
            BrowserStorageService.setLocal("dispatch-call-log",callLog.get());
        })
    }
    /* Tests that work on labels, inputting the label ID */
    const isOnline = id => activeOnlines.has(id);
    function setVideoActive (id){setSelectorProperty(id,"videoActive",true);}
    function setVideoInactive(id){setSelectorProperty(id,"videoActive",false);}

    /* Tests that work on selectors, inputting the rand ID */
    function isEnabled(randID){
        let s = selectorWithRandID(randID);
        return s && (isAlwaysEnabled(s) || isOnline(s.ID));
    }
    function isVisible(randID){
        let s = selectorWithRandID(randID);
        if(!s)return false;
        if(isMyOwnSelector(s) && !PreferenceService.showOwnSelector()){ // don't show my own selector unless it is enabled.
            return false;
        }
        if(isEnabled(randID)){
            return true;
        }
        if(!PreferenceService.hideOfflineSelectors()){
            return true;
        }
        return false; // it's not enabled and this client prefers to not show disabled selectors
    }
    const selectorWithRandID = randID => selectors.find(s=>s.randID == randID); // get a particular selector
    function setSelectorNoLongerTalkingOrListening(randID){
        let s = selectorWithRandID(randID);
        if(s){
            ["desiredListen","desiredTalk","actualListen","actualTalk"].forEach(prop=>{
                s.obs[prop].set(false);
            })
        }
    }
    const updateCurrentlyActive = randID => {
        let s = selectorWithRandID(randID);
        if(s){
            s.obs.currentlyActive.set(s.obs.desiredTalk.get() || s.callNotification);
        }
    }

    /* Tests that work on selectors, inputting the selector itself */
    const isMyOwnSelector = s => s.ID == MyLabelService.getID();
    const isSpacer = s => s.ID == undefined;
    const isGroup = s => s.label.LABEL_IS_GROUP == true;
    const isntIntracomSelector = s => s.label.LABEL_SYSTEM_TYPE !== "INTRACOM";
    const isVideoSelector = selector => selector.label.LABEL_BASE_TYPE_NAME == "VIDEO";
    const dontShowLevels = s => isVideoSelector(s) || isntIntracomSelector(s);
    /* We are able to play HTTP, RTMP, and RTSP videos */
    const isPlayableVideo = selector => {
        return isVideoSelector(selector) && (
            Util.startsWith(selector.label.RTSP_URI,"http") ||
            Util.startsWith(selector.label.RTSP_URI,"rtmp") ||
            Util.startsWith(selector.label.RTSP_URI,"rtsp"));
    }
    const firstSelectorWithID = id => selectors ? selectors.find(s=>s.ID==id):undefined; // find first selector with this ID
    const selectorsWithID = id => selectors ? selectors.filter(s=>s.ID==id):[]; // get all selectors with this ID
    const setSelectorProperty = (id,propName,propVal) => { // change all selectors with this ID
        selectorsWithID(id).forEach(s=>s[propName]=propVal);
    }

    /* Refresh a selector's name (for guests, whose names change only as someone new logs in) */
    const refreshSelectorName = id => {
        LabelStorageService.refreshFullDetailLabels([id]).then(()=>{
            console.log("refreshed selector name for id",id,"to be",LabelStorageService.getLabelName(id));
            selectorsWithID(id).forEach(s=>s.name = LabelStorageService.getLabelName(id));
        })
    }

    const handleListenPress = (s,pressOrRelease) => {
        if(!isEnabled(s.randID)) return; // prevent toggling on disabled selectors
        if(pressOrRelease == "longRelease"){
            // always turn off when the user releases a long press
            listenOff(s.ID);
        }
        else{
            toggleListen(s.ID);
        }
    }
    const handleTalkPress = (s,pressOrRelease) => {
        if(!isEnabled(s.randID)) return;// prevent toggling on disabled selectors
        if(pressOrRelease == "longRelease"){
            // always turn off when the user releases a long press
            talkOff(s.ID);
        }
        else{
            toggleTalk(s.ID);
        }
    }
    
    const onToggleListen = f => allSelectorsObs.listen.on(f);
    const onToggleTalk = f => allSelectorsObs.talk.on(f);

    const waitUntilReady = () => {
        return deferredReady.promise;
    }
    const hasTalk = randID => {
        let s = selectorWithRandID(randID);
        let t = Util.getPropertySafe(s,"TYPE");
        return t == "SELECTOR_TALK" || t == "TALK" || t == "SELECTOR";
    }
    // getMostRecentTalk, firstOnlineTalk, firstOnlineTalkSelectorWithHotkey all return the label ID of the selector
    const getMostRecentTalk = () => mostRecentTalk;
    const getFirstOnlineTalk = () => Util.getPropertySafe(selectors.filter(s=>hasTalk(s.randID) && isEnabled(s.randID)),0,"ID");
    const getFirstOnlineTalkSelectorWithHotkey = () => Util.getPropertySafe(selectors.filter(s=>s.HOT_KEY !== undefined && hasTalk(s.randID) && isEnabled(s.randID)),0,"ID");
    /* send one PUT request to the server to turn TALK or LISTEN on or off
    Then update the visuals on selectors */
    const handleTalkListenOnOff = (id,prop,state) => {
        let onOffStr = state? "On":"Off";
        SelectorActivationService[prop+onOffStr](id) // send PUT
            .then(()=>notifyTalkListenOnOff(id,"actual"+Util.capitalize(prop),state)) // update selectors observers
    }
    /* update observers on selectors.
    desiredListen and desiredTalk trigger updates to allSelectorsObs which actually initiates PUT requests */
    const notifyTalkListenOnOff = (id,prop,state) => {
        selectorsWithID(id).forEach(s=>{
            s.obs[prop].set(state);
        })
    }
    const talkOn = id => notifyTalkListenOnOff(id,"desiredTalk",true);
    const talkOff = id => notifyTalkListenOnOff(id,"desiredTalk",false);
    const listenOn = id => notifyTalkListenOnOff(id,"desiredListen",true);
    const listenOff = id => notifyTalkListenOnOff(id,"desiredListen",false);
    const toggleListen = id => {
        selectorsWithID(id).forEach(s=>{
            s.obs.desiredListen.toggle();
        })
    }
    const toggleTalk = id => {
        selectorsWithID(id).forEach(s=>{
            s.obs.desiredTalk.toggle();
        })
    }
    /* A client selector that is streaming video through WebRTC */
    const isStreaming = id => activeStreams.has(id);


/* Tallies, Call Notifications, Temporary selectors */

    /* Tallies involve some css classes
        tally: added to selectors when they should be blinking
        tallyClock: applied to the #selectors div and turns on/off a few times a second to supply us with blinking

        And some properties on selector objects
        tallyVisible: maps to the 'tally' css property. Should be true when the selector should be blinking
        callNotification: is true when we receive a call notification, then turns false when the notification ends
        unansweredCall: is true if we have not TALKed back to a received call notification
        recentlyActive: is true if we have TALKed to or received a call notification in the last RECENTLY_ACTIVE_DURATION

    */
    const addTemporarySelector = id => {
        /* A previous bug caused temporary selectors to appear as offline. the 'id' supplied by the call notification service
        was a string rather than a number. isOnline(id) uses the activeOnlines.has() method. In a set, numbers and strings are
        treated as different values, so the online set contained 10355, and we searched for '10355' and didn't find it.
        Now the callnotificationservice notifies us with a number rather than a string, but this additional line here makes sure... */
        try{
            id = Number(id);
        }catch(e){}
        console.log("adding temporary selector",id);
        let randID = Util.generateUUID();
        /* Add this placeholder while we load the actual properties */
        let newSelector = {
            ID:id,
            randID:randID,
            TYPE:"SELECTOR_TALK", // All temporary selectors are TALK only 
            temporary:true
        };
        selectors.push(newSelector);
        /* Load info about the client calling us */
        return LabelStorageService.refreshLabel(id).then(()=>{
            decorateSelector(newSelector);
            newSelector.LATCH_DISABLE = "OFF"; // All temporary selectors have latch enabled
            /* If the selector isn't used, then it should disappear. Otherwise it's not very temporary */
            newSelector.obs.recentlyActive.on(val=>{
                if(!val){
                    removeSelector(randID);
                }
            })
        })
        .catch(()=>{
            console.error("failed to load label for temporary selector",id);
            removeSelector(randID);
        })
    }
    
    
    /* Removes the (temporary) selector with the given randID */
    const removeSelector = randID => {
        let s = selectorWithRandID(randID);
        if(s){
            console.log("removing temporary selector",s.ID,s)
            setSelectorNoLongerTalkingOrListening(randID);
            /* clear listeners */
            s.obs.clear();
            /* Splice out this selector from the selectors array. 
                Note: creating a new array by using selectors = selectors.filter(...) does not work as the 
                $scope.selectors object in ControlPanelController would no longer refer to the same obj as the one here */
            let index = selectors.findIndex(selector=>selector.randID == randID);
            selectors.splice(index,1);
        }
    }
    /* If at least one selector is trying to TALK, turn the mic on */
    const updateMicrophoneStatus = () => {
        if(selectors.filter(s=>s.obs&&s.obs.desiredTalk.get()==true).length>0){
            MicrophoneService.enable();
        }
        else{
            MicrophoneService.disable();
        }
    }
    /* A selector should have listen/talk halfway if our desired state is not yet actualized
    Otherwise set it to our desired value (we are trying to talk, set talkActive = true) */
    const updateTalkListenCSS = sl =>{
        let dl = sl.obs.desiredListen.get();
        let dt = sl.obs.desiredTalk.get();
        let al = sl.obs.actualListen.get();
        let at = sl.obs.actualTalk.get();
        if(dl == al){
            sl.listenActive = dl;
            sl.listenHalfway = false;
        }
        else{
            sl.listenHalfway = true;
        }
        if(dt == at){
            sl.talkActive = dt;
            sl.talkHalfway = false;
        }
        else{
            sl.talkHalfway = true;
        }
    }
    /* The selector is currently active if talk is on or it is receiving a call notification */

    const onCallNotificationOn = id => {
        // ensure that we have a selector with this ID, even if we have to add a temporary one
        if(!firstSelectorWithID(id)){
            addTemporarySelector(id).then(()=>onCallNotificationOn(id))
            return;
        }
        // display the call notification
        setSelectorProperty(id,"callNotification",true);
        setSelectorProperty(id,"unansweredCall",true);
        selectorsWithID(id).forEach(s=>{
            updateCurrentlyActive(s.randID);
        })
        callLog.set(id,new Date().getTime()); // add to call Log
    }

    const onCallNotificationOff = id => {
        setSelectorProperty(id,"callNotification",false);
        setSelectorProperty(id,"unansweredCall",false);
        selectorsWithID(id).forEach(s=>{
            updateCurrentlyActive(s.randID);
        })
    }

    /* Certain selectors we consider visible regardless of whether they are online */
    const isAlwaysEnabled = s => {
        return (
            isPlayableVideo(s) ||
            isGroup(s) ||
            isSpacer(s) ||
            isntIntracomSelector(s) // for trunked systems, as a temporary workaround to ensure they show up.
        );
    }
    const decorateSelector = s => {
        if(!s.randID)s.randID = Util.generateUUID();
        if(s.ID == undefined){// this is a spacer, no label to get
            s.name = s.TYPE;
            s.label = {};
            return;
        }
        else{ // this is not a spacer, it's a normal selector
            let fullDetailLabel = LabelStorageService.getLabelSync(s.ID);
            s.label = fullDetailLabel;
            if(s.label == undefined){
                console.warn("why is this label undefined?",s);
                return;
            }
            s.name = s.label.LABEL_NAME;
            /* default to same properties as TYPE == 'SELECTOR' */
            s.leftType = "listen";
            s.rightType = "talk";
            s.leftClick = pressOrRelease=>handleListenPress(s,pressOrRelease);
            s.rightClick = pressOrRelease=>handleTalkPress(s,pressOrRelease);
            s.leftIconClass = "fa fa-volume-up";
            s.rightIconClass= "fa fa-microphone"
            s.levels = LevelsService.getGainForSlider(s.ID); // initialize the proper levels 

            if(s.TYPE==="SELECTOR_LISTEN"){
                s.rightType = s.leftType;
                s.rightClick = s.leftClick;
                s.rightIconClass = s.leftIconClass;
            }
            if(s.TYPE==="SELECTOR_TALK"){
                s.leftType =  s.rightType;
                s.leftClick = s.rightClick;
                s.leftIconClass = s.rightIconClass;
            }
            if(isVideoSelector(s)){
                s.leftType = "video";
                s.rightType = "video";
                s.leftClick=pressOrRelease=>{
                    if(!isEnabled(s.randID)) return; // Prevent clicking disabled selectors
                    if(pressOrRelease == "longRelease"){
                        return; // Unlike talk/listen, we don't want to ever interpret this as a long press
                    }
                    VideoManagerService.toggle(s.ID,s.label.LABEL_NAME,s.label.RTSP_URI);
                };
                s.rightClick = s.leftClick;
                s.leftIconClass="fa fa-play";
                s.rightIconClass = s.leftIconClass;
                s.videoActive = false;
            }
            s.listenActive = false;
            s.talkActive = false;
            s.unansweredCall = false;
            /* Observers and handlers*/
            s.obs = new Util.Observers(["recentlyActive","currentlyActive","desiredListen","desiredTalk","actualListen","actualTalk"]);
            /* Observers and handlers for tallies */
            s.recentlyActiveTimer = Util.Timer().delay(RECENTLY_ACTIVE_DURATION).then(()=>s.obs.recentlyActive.set(false));
            s.obs.currentlyActive.on(currentlyActive=>{
                if(currentlyActive){
                    s.obs.recentlyActive.set(true);
                    s.recentlyActiveTimer.stop();
                }
                else{
                    s.recentlyActiveTimer.reset();
                }
            })
            s.obs.recentlyActive.on(isRecentlyActive=>{
                if(isRecentlyActive){
                    recentlyActives.add(s.ID);
                }
                else{
                    recentlyActives.remove(s.ID);
                }
                s.tallyVisible = isRecentlyActive && s.unansweredCall;
            });
            /* Observers and handlers for talk/listen activation */
            ["desiredListen","desiredTalk","actualListen","actualTalk"].forEach(prop=>{
                s.obs[prop].set(false); // initialize them all to false
                s.obs[prop].on(()=>updateTalkListenCSS(s))
            })
            // s.obs.desiredListen.on((state)=>handleTalkListenOnOff(s.ID,"listen",state)); // send PUT request 
            // s.obs.desiredTalk  .on((state)=>handleTalkListenOnOff(s.ID,"talk",  state)); // send PUT request
            
            s.obs.desiredTalk.on(updateMicrophoneStatus);
            s.obs.desiredTalk  .on(newVal=>allSelectorsObs.talk  .set(s.ID,newVal)); // pass to global observer
            s.obs.desiredListen.on(newVal=>allSelectorsObs.listen.set(s.ID,newVal)); // pass to global observer
            s.obs.desiredTalk.on(()=>mostRecentTalk = s.ID);              // update most recent talk for PTT
            s.obs.desiredTalk.on(()=>updateCurrentlyActive(s.randID));           // update whether or not this selector is currently active
        }
        // let online = isAlwaysOnline(s) || WhosOnlineService.get().includes(s.ID);
        s.offline = !isEnabled(s.randID);//isOnline(s.ID) && !isAlwaysEnabled(s) // intialize most selectors to offline until WhosOnlineService tells us they're online
        s.visible = isVisible(s.randID);
        s.noLevels = dontShowLevels(s);
    }

    const getRealSelectors = () => selectors.filter(s=>!isSpacer(s));

    function canLatch(randID){
        let selector = selectorWithRandID(randID);
        let selectorLabel = selector.label;
        // if LATCH_DISABLE is set to "OFF" or undefined, then count it as not disabled
        let myLatchDisable = MyLabelService.propEquals("LATCH_DISABLE","ON")
        let selectorLatchDisable = selector.LATCH_DISABLE == "ON";
        let selectorLabelLatchDisable = selector.label.LATCH_DISABLE == "ON";
        return !selectorLabelLatchDisable && !selectorLatchDisable;
    }

    return {
        reset,
        refresh, // also injected 
        getSelectors:()=>selectors,
        getRealSelectors,
        setSelectorProperty,
        selectorWithRandID,
        onToggleListen,
        onToggleTalk,
        getActiveStreams:()=>activeStreams,
        activeOnlines,
        activeAssigned,
        recentlyActives,
        firstSelectorWithID,
        isStreaming,
        canLatch,
        callLog,
        onCallNotificationOn,
        onCallNotificationOff,
        talkOn,
        talkOff,
        listenOn,
        listenOff,
        getFirstOnlineTalk,
        getMostRecentTalk,
        getFirstOnlineTalkSelectorWithHotkey,
        isOnline,
        isEnabled,
        waitUntilReady
    }
})




/* Service to change or inspect the activation status of selectors */
app.factory("SelectorActivationService",function(APIService,MyLabelService){
    let additionalConfig = {
        // delay:1000,
        // failRate:0.3
    }
    const urlBase = "/action/selector/";
    const talkOn = function(targetIDs){
        targetIDs = Util.ensureArray(targetIDs);
        let sourceID = MyLabelService.getID();
        const url = urlBase + sourceID + "?talk_on=" + targetIDs.join("&");
        console.log("talk on",sourceID,targetIDs)
        return APIService.put(url,undefined,additionalConfig)
    }
    const talkOff = function(targetIDs){
        targetIDs = Util.ensureArray(targetIDs);
        let sourceID = MyLabelService.getID();
        const url = urlBase + sourceID + "?talk_off=" + targetIDs.join("&");
        console.log("talk off",sourceID,targetIDs)
        return APIService.put(url,undefined,additionalConfig)
    }
    const listenOn = function(targetIDs){
        targetIDs = Util.ensureArray(targetIDs);
        let sourceID = MyLabelService.getID();
        const url = urlBase + sourceID + "?listen_on=" + targetIDs.join("&");
        console.log("listen on",sourceID,targetIDs)
        return APIService.put(url,undefined,additionalConfig)
    }
    const listenOff = function(targetIDs){
        targetIDs = Util.ensureArray(targetIDs);
        let sourceID = MyLabelService.getID();
        const url = urlBase + sourceID + "?listen_off=" + targetIDs.join("&");
        console.log("listen off",sourceID,targetIDs)
        return APIService.put(url,undefined,additionalConfig)
    }

    return{
        talkOn,
        talkOff,
        listenOn,
        listenOff
    }
})
/* global app Util $ */
app.factory("VideoManagerService",function(PaneService,VideoPlayerService,URLService,FlowInstanceTracker,Kurento1to1,KurentoRTSPPlayer){
    let vids = Util.Set();
    let uriMap = {

    }
    vids.obs.remove.on(id=>uriMap[id] = undefined); // don't bother storing the URI of a vid that we've removed

    /* Play the video associated with a selector */
    const play = (id,name,uri) => {
        let newItemConfig = {
            id:id,
            title:name,
            videoURI:uri,
            contentType:"video"
        };
        PaneService.open(newItemConfig);
    }

    const popout = uri => {            
        let options = {
            width: 300,
            height: 200,
            // innerWidth: this._dimensions.width,
            // innerHeight: this._dimensions.height,
            menubar: 'no',
            toolbar: 'no',
            location: 'no',
            personalbar: 'no',
            resizable: 'yes',
            scrollbars: 'no',
            status: 'no'
        };
        let optionsString = []
        for( let key in options ) {
            optionsString.push( key + '=' + options[ key ] );
        }
        options = optionsString.join(',');
        /* This tries to downgrade the URL to use HTTP and port 80, so that we can play an HTTP stream even if our page is HTTPS*/
        let url = URLService.buildURL({
            path:"/ControlPanel/views/flowPopout.html?videoURI="+uri,
            protocol:"http",
            port:URLService.getDowngradedPort()
        })
        window.open(url,undefined,options);
    }

    const playAnonymous = uri => {
        let id = Util.generateUUID();
        let config = {
            id:id,
            videoURI:uri,
            contentType:"anonVideo",
            title:"Video at '"+uri+"'"
        }
        PaneService.open(config);
        // playIdAndUri(id,uri); // this was double-playing the same thing, as goldenlayoutservice opened by paneservice automatically hydrates the video
    }
    const closeWindow = id => {
        PaneService.close(id);
    }
    /* This is called whenever the user closes the pane with the given video.
    The argument is a selector ID like 10310 */
    const stop = id => {
        console.warn("Video manager service stop",id);
        vids.remove(id);
        /* flowplayer requires some extra logic to prevent the 
        possibility of flowplayer audio playing in the background */
        FlowInstanceTracker.remove(id);
        // Kurento1to1.stopViewingID(id);
        KurentoRTSPPlayer.stop();
        return new Promise(res=>{
            /* This timeout helps prevent an infinite loop where the GL window tries to close itself on close */
            setTimeout(()=>{
                closeWindow(id);
                res();
            },1);
        })
    }
    const toggle = (id,name,uri) => {
        if(vids.has(id)){
            stop(id);
        }
        else{
            play(id,name,uri);
        }
    }

    const playIdAndUri = (id,uri) => {
        let query = "#"+id;
        vids.add(id);
        uriMap[id] = uri;
        Util.waitForElement(query).then(()=>{
            VideoPlayerService.playConfig({
                $container:$(query),
                id:id,
                uri:uri
            })
        })
    }

    const playConfig = config => {
        console.log("playing config",config);
        PaneService.open(config);
        playIdAndUri(config.id,config.videoURI);
    }

    const getURI = id => {
        return uriMap[id];
    }

    return {
        toggle:toggle,
        stop:stop,
        get:vids.get,
        obs:vids.obs,
        playAnonymous:playAnonymous,
        playIdAndUri:playIdAndUri,
        playConfig:playConfig,
        popout:popout

    }
})
/* global app Util flowplayer $  */

/* This service acts as the source of truth for which Flowplayer instances should be playing.
Flowplayer can play in the background without a DOM element. Normally, a flowplayer will unload
when the element it's attached to is removed. However, if we repeatedly open and close a flowplayer
then it gets stuck playing audio in the background. This is because the element is destroyed before
flowplayer is able to initialize. So we maintain which instances should exist here, and don't allow
multiple flowplayers trying to play the same video */
app.factory("FlowInstanceTracker",function(){
    const map = {};
    const set = (id,instance) => map[id] = instance;
    const remove = id => {
        let instance = map[id];
        if(instance){
            instance.unload();
        }
        map[id] = undefined;
    }
    const get = id => map[id];
    const clear = () => {
        Object.keys(map).forEach(remove);
    }
    return {
        set,
        get,
        clear,
        remove
    }
})
app.factory("VideoPlayerService",function(FlowInstanceTracker, KurentoRTSPPlayer,$injector){

    /* config:
        id
        uri
        $container - jquery wrapped container
    */
    const playConfig = config => {
        let uri = config.uri;
        let $container = config.$container;
        let mute = config.mute;
        if(config.streamName){
            return kurentoPlayConfig(config);
        }
        else if(Util.startsWith(uri,"rtmp") ||
            Util.endsWith(uri,".m3u8")){
                flowPlayConfig(config);
            }
        else if(Util.startsWith(uri,"http")){
            if(Util.startsWith(uri,"https://www.youtube.com/watch?v=")){
                let videoID = uri.slice(32);
                playYoutubeVideo({$container:$container,id:videoID,mute:mute});
            }
            else if(Util.startsWith(uri,"https://youtu.be/")){
                let videoID = uri.slice(17);
                playYoutubeVideo({$container:$container,id:videoID,mute:mute});
            }
            else{
                playAsIframe({$container:$container,uri:uri,mute:mute});
            }
        }
        else if(Util.startsWith(uri,"rtsp://")){
        //     // WebRTC
            rtspPlayConfig(config);
        }
        else{
            console.error("can't play video",uri,config);
        }
    }

    const kurentoPlayConfig = config => {
        let $container = config.$container;
        let id = config.id;
        let streamName = config.streamName;
        let queryID = id+"-kurento-video"; // queryID of <id> is already being used for the container
        let $video = $("<video autoplay muted playsinline>").attr("id",queryID).css("height","100%").css("width","100%");
        let $spinner = $('<i class="fa fa-refresh fa-spin rtsp-spinner">');
        $container.empty().append($video).append($spinner);
        Util.waitForElement("#"+queryID).then(()=>{
            $injector.get('Kurento1to1').call(streamName,$video[0]).then(()=>{
                $spinner.addClass("hidden");
            })
        });
    }

    const rtspPlayConfig = config => {
        let $container = config.$container;
        let uri = config.uri;
        let id = config.id;
        let queryID = id+"-kurento-video"; // queryID of <id> is already being used for the container
        let $video = $("<video autoplay muted playsinline>").attr("id",queryID).css("height","100%").css("width","100%");
        let $spinner = $('<i class="fa fa-refresh fa-spin rtsp-spinner">');
        $container.empty().append($video).append($spinner);
        Util.waitForElement("#"+queryID).then(()=>{
            KurentoRTSPPlayer.playURIInElement(uri,$video[0]);
        });
    }

    const flowPlayConfig = config => {
        let $container = config.$container;
        let uri = config.uri;
        let id = config.id;
        let queryID = id+"-flowplayer-video"; // queryID of <id> is already being used for the container
        let flowplayerInstance;

        /* If we are already playing this video, do not try to open a new flowplayer */
        let preexistingInstance = FlowInstanceTracker.get(id);
        if(preexistingInstance){
            return;
        }
        /* Only empty the container now that we know the video isn't already playing */
        $container.empty().append($("<div>").attr("id",queryID))//.css("height","100%"))
        
        Util.waitForElement("#"+queryID).then(()=>{
            /* RTMP support */
            if(Util.startsWith(uri,"rtmp")){

                let split = uri.indexOf("mp4");
                let rtmpPart = uri.slice(0,split-1);
                let srcPart = uri.slice(split);

                console.log("rtmp part",rtmpPart,"srcPart",srcPart);

                flowplayerInstance = flowplayer($container, {
                    autoplay: true,
                    muted:config.mute,
                    background: true,
                    rtmp: rtmpPart,
                    qualities: ["160p", "260p", "530p", "800p"],
                    defaultQuality: "260p",
                    //loop: true,
                    playlist: [{
                    sources: [
                        { type: "video/flash", src: srcPart }
                    ]}]
                })
            }
            /* HLS support */
            else if(Util.endsWith(uri,".m3u8")){
                flowplayerInstance = flowplayer($container,{
                    autoplay: true,
                    muted:config.mute,
                    clip: {
                        sources: [{ 
                            type: "application/x-mpegurl",
                            src:  uri 
                        }]
                    }
                });
            }
            else{
                alert("how do I play? "+uri);
            }

            if(flowplayerInstance){
                FlowInstanceTracker.set(id,flowplayerInstance)
                /* If we open and close a video selector too quickly, then the close function(s) end up firing
                before the instance is opened, and the instance stays open and we hear the audio in the background.
                Here we listen for the instance beginning to play ('resume' event) as well as 'ready' and 'load' events.
                and if it has been told to stop already, we stop it */
                flowplayerInstance.on("resume ready load", function () {
                    if(FlowInstanceTracker.get(id) == undefined){
                        flowplayerInstance.unload();
                    }
                });
                if(config.mute){
                    flowplayerInstance.on("ready",function (e, api, video) {
                        api.mute(true);
                        api.play();
                    });
                }

            }
        })
    }

    window.flowPlayConfig = flowPlayConfig;
    const playYoutubeVideo = config => {
        let $container = config.$container;
        let id = config.id;
        console.log("playing youtube video with id",id);
        const srcBeginning = "https://www.youtube.com/embed/";
        const options = [
            "playsinline=1", // for iPhone
            "autoplay=1",
            "showinfo=0",
            "modestbranding=1",
            "fs=1",
            "cc_load_policy=0",
            "iv_load_policy=3",
            "rel=0",
            "showInfo=0",
            "autohide=0",
            "enablejsapi=1",
            "widgetid=1"
        ]
        if(config.mute)options.push("mute=1");
        const srcEnding = "?"+options.join("&amp;");
        let src = srcBeginning + id + srcEnding;
        playAsIframe({$container:$container,uri:src});
    }
    const playAsIframe = (config) => {
        config.$container.empty().append(
            $("<iframe allowtransparency='true' frameborder='0'>").attr("src",config.uri)
        )
    }

    const playBehindSelectors = (uri) => {
        let container = $(".behindContents");
        if(container.length<1){
            container = $("<div class='behindContents'></div>");
            $(".selectorsPane").append(container);
        }
        playConfig({
            $container:container,
            uri:uri
        })
    }

    return {
        playAsIframe:playAsIframe,
        playBehindSelectors:playBehindSelectors,
        playConfig
    }
})
/* global app Util*/
app.factory("VideoWallService",function(VideoWallChooserService,SelectorsService,PublishStreamService,EventService){
    let open = new Util.Observable(false);
    let ids = Util.Set();
    open.on((v)=>console.log("VIDEO WALL OPEN",v))
    function init(){
        /* Any time active streams change or the video wall itself opens or closes, update ids */
        SelectorsService.getActiveStreams().obs.change.off(updateIDs);
        SelectorsService.getActiveStreams().obs.change.on(updateIDs);
        open.off(updateIDs);
        open.on(updateIDs);
        SelectorsService.getActiveStreams().obs.remove.off(VideoWallChooserService.unselect); // clear old handler if it exists
        SelectorsService.getActiveStreams().obs.remove.on(VideoWallChooserService.unselect); // unselect a video when it stops being broadcast
    }
    function updateIDs(){
        if(open.get()){ // if the video wall is open...
            /* Determine which selectors are both online and streaming */
            let streaming = SelectorsService.getActiveStreams().get();
            let online = SelectorsService.activeOnlines.get();
            let assignedToMe = SelectorsService.activeAssigned.get();
            let streamingAndOnline = Util.intersectArrays(streaming,online);
            let streamingAndOnlineAndAssignedToMe = Util.intersectArrays(streamingAndOnline,assignedToMe)
            ids.set(streamingAndOnlineAndAssignedToMe); // sync with Selectors Service
        }
        else{
            ids.set([]); // otherwise the video wall should be empty
        }
    }
    function publish(){
        let idToPublish = VideoWallChooserService.get()[0];
        if(idToPublish !== undefined){
            PublishStreamService.toggleID(idToPublish);
        }
    }

    EventService.on("loggedOut",()=>open.set(false))
    
    init();
    return {
        ids,
        publish,
        open
    }
})
app.factory("VideoWallChooserService",function(EventService){
    let chosen = Util.Set();

    function select(id){
        // only allow a single id to be chosen
        return chosen.set([id]);
    }
    function unselect(id){
        return chosen.remove(id);
    }
    function isChosen(id){
        return chosen.has(id);
    }
    function toggle(id){
        // reimplement toggle so only a single id can be chosen
        if(chosen.has(id)){
            return unselect(id);
        }
        else{
            return select(id);
        }
    }
    function clear(){
        chosen.set([]);
    }
    EventService.on("loggedOut",clear);
    return {
        chosen:chosen,
        obs:chosen.obs,
        get:chosen.get,
        toggle,
        isChosen,
        select,
        unselect,
    }
})
app.run(function(VideoWallService,WebRTCVideoStreamingService){
    
    let liveStreamsBeingWatched = Util.Set();

    function watchStream(id){liveStreamsBeingWatched.add(id);}
    function stopWatchingStream(id){
        if(!WebRTCVideoStreamingService.ids.has(id) && !VideoWallService.ids.has(id)){
            liveStreamsBeingWatched.remove(id);
        }
    }
    function endStreamSession(id){
        console.log("ending stream session",id,liveStreamsBeingWatched.get());
        WebRTCVideoStreamingService.getStreamSession(id).stop();
    }
    // close sessions when they are no longer being watched on their own nor part of the video wall
    WebRTCVideoStreamingService.ids.obs.add.off(watchStream);
    WebRTCVideoStreamingService.ids.obs.add.on(watchStream);
    WebRTCVideoStreamingService.ids.obs.remove.off(stopWatchingStream);
    WebRTCVideoStreamingService.ids.obs.remove.on(stopWatchingStream);
    VideoWallService.ids.obs.add.off(watchStream);
    VideoWallService.ids.obs.add.on(watchStream);
    VideoWallService.ids.obs.remove.off(stopWatchingStream);
    VideoWallService.ids.obs.remove.on(stopWatchingStream);

    VideoWallService.ids.obs.change.on(ids=>console.log("videowall ids",ids));
    WebRTCVideoStreamingService.ids.obs.change.on(ids=>console.log("webrtcvideo ids",ids));

    liveStreamsBeingWatched.obs.remove.off(endStreamSession);
    liveStreamsBeingWatched.obs.remove.on(endStreamSession); // when we have no ways in which we are watching a stream, end it.
})
/* global app Util $ */
app.factory("WebRTCVideoStreamingService",function(Kurento1to1,LabelStorageService,VideoManagerService,StreamService,EventService){
    let playingIDSet = Util.Set(); // keep track of the ids of which videos are currently opened by the user
    let streamSessions = Util.Map();


    /* Connect to KNAS and issue a call to the selector with given label.stream ID.
    Returns a promise that resolves with a session which has
        name:
        views:
        stream:
        obs:
            viewStart
            viewEnd
            connected
            disconnected
            closed
            failed
            ready
            connecting
         */
    function pullSession(id){
        let sessionName = getStreamName(id);
        let promise = Kurento1to1.connectToServer().then(()=>{
            return Kurento1to1.call(sessionName).then(session=>{
                session.name = sessionName;
                StreamService.onAnyTrackEnded(session.stream,()=>{
                    session.obs.viewEnd.notify();
                });
                session.views = 0;
                session.obs.viewStart.notify();
                return session;
            })
        });

        return promise;
    }
    function clearSession(id){
        streamSessions.set(id,undefined);
    }

    /* Class that represents an intent to receive a webrtc stream
    initialize it with the Label ID of the selector that you want to view, then
    attach it to a container that has a <video> element and a .wowza-spinner spinner
    and call start to let it know you would like to connect.
    It will try, and show the spinner, then hide the spinner and show the video.
    You can tell it to stop and it will stop.
    If you don't tell it to stop and the stream ends then it will try to reconnect*/
    function StreamSession(id){
        this.id = id;
        this.reconnectTime = 3000;
        this.obs = new Util.Observers(["userIntentToConnect","connected"]);
        this.containers = [];
        this.obs.userIntentToConnect.on(newVal=>{
            console.log("user intent to connect",newVal);
        })
        this.obs.connected.on(newVal=>{
            console.log("connected",newVal);
        })
        console.log("creating stream session",id);
        this.obs.userIntentToConnect.on(newVal=>{
            if(newVal){
                if(!this.obs.connected.get()){
                    this.performStart();
                }
            }
            else{
                if(this.obs.connected.get()){
                    this.performStop();
                }
            }
        })
        this.obs.connected.on(newVal=>{
            if(newVal){
                if(!this.obs.userIntentToConnect.get()){
                    this.performStop();
                }
            }
            else{
                if(this.obs.userIntentToConnect.get()){
                    this.performRestartAfterDelay();
                }
            }
        })
    }
    StreamSession.prototype.showSpinner = function(){
        this.containers.forEach(container=>{
            container.find(".wowza-spinner").removeClass("hidden");
        })
    }
    StreamSession.prototype.hideSpinner = function(){
        this.containers.forEach(container=>{
            container.find(".wowza-spinner").addClass("hidden");
        })
    }
    StreamSession.prototype.start = function(){
        this.obs.userIntentToConnect.set(true);
    }
    StreamSession.prototype.stop = function(){
        this.obs.userIntentToConnect.set(false);
    }
    StreamSession.prototype.performRestartAfterDelay = function(){
        console.log("stream session performing restart");
        this.performStop(); // don't change userIntentToConnect since this restart is triggered automatically and doesn't reflect user's desires
        setTimeout(()=>{
            if(this.obs.userIntentToConnect.get() && !this.obs.connected.get()){
                this.performStart();
            }
            else{
                // user no longer wants to connect or is already connected, so let this die
            }
        },this.reconnectTime);
    }
    StreamSession.prototype.performStart = function(){
        console.log("hydration started");
        if(this.sessionPromise){
            return;
        }
        this.showSpinner();
        this.sessionPromise = pullSession(this.id).then(session=>{
            this.session = session;
            this.obs.connected.set(true);
            this.hideSpinner();
            this.playInVideoElements();
            console.log("session gotten and vid playing");
            
            // viewStart triggered already by the time we get the session here
            // viewEnd triggered if they stop streaming, but not if we close the window
            session.obs.viewEnd.on(()=>{
                console.log("session view end");
                this.obs.connected.set(false);
            })
        })
        .catch(()=>{
            this.obs.connected.notify(false); // notify instead of 'set' means that the restart handler will trigger even if we already know we are disconnected
        })
        .finally(()=>{
            this.hideSpinner();
        })
    }
    StreamSession.prototype.performStop = function(){
        this.hideSpinner();
        console.log("playingIDSet removing",this.id,playingIDSet)
        Kurento1to1.stopViewingID(this.id);

        this.notifyStopped();
    }
    StreamSession.prototype.notifyStopped = function(){
        this.sessionPromise = undefined;
        // playingIDSet.remove(this.id); // this made us think that a video was closed so toggling would always open a new pane
        this.obs.connected.set(false);
    }
    StreamSession.prototype.clear = function(){
        this.stop();
        clearSession(this.id);
    }
    /* argument should be a jquery-wrapped HTML element that has...
        a <video> element as a descendant (where the video will play)
        a .wowza-spinner element as a descendant (where the spinner shows up) */
    StreamSession.prototype.attachToContainer = function($container){
        this.containers.push($container);
        if(this.session){
            this.hideSpinner();
            this.playInVideoElements();
        }
    }
    StreamSession.prototype.playInVideoElements = function(){
        this.containers.forEach(container=>{
            let vid = container.find("video")[0];
            if(vid){
                vid.srcObject = this.session.stream;
                vid.play();
            }
        })
    }
    
    const hydrate = comp => {
        let id = Number(comp.config.id); 
        let query = "#"+id;

        let ss = getStreamSession(id);
        Util.waitForElement(query).then(()=>{
            ss.attachToContainer($(query));
            ss.start();
        })
        comp.config.onClose = function(){
            // closes this pane. all the onClose handlers like this are triggered when we log out
            // so as long as we call VideoManagerService.stop here, streams will close when we log out
            // and when we log back in they won't be being currently watched anymore.
            // if we change that, we'll have to figure out how to reconcile the videomanager that tracks
            // which videos are being watched with the goldenlayout pane that is saved and reopened on login
            VideoManagerService.stop(id);

            playingIDSet.remove(id); // 
        }
        
        playingIDSet.add(id);
        console.log("playingIDSet added",playingIDSet)
    }

    const getStreamName = id => {
        if(id == undefined) return undefined;
        let labelName = LabelStorageService.getLabelName(id);
        return id+"-"+labelName;
    }

    /* Deprecated, used to give RTSP URLs to Wowza streams */
    const getStreamURL= id => {
        return "stream name: "+getStreamName(id);
    }

    function clear(){
        streamSessions.asArray().forEach(ss=>{
            ss.clear();
        })
        streamSessions.clear();
        playingIDSet.clear();
    }

    /* Either returns an existing StreamSession or creates a new one and adds it to the streamSessions Map */
    function getStreamSession(id){
        let ss = streamSessions.get(id);
        if(ss)return ss;
        let newSS = new StreamSession(id);
        streamSessions.set(id,newSS);
        return newSS;
    }

    EventService.on("loggedOut",clear);

    return {
        clear,
        getStreamName,
        getStreamURL,
        hydrate,
        getStreamSession,
        ids:playingIDSet,
        obs:playingIDSet.obs, // unnecessary?
        get:playingIDSet.get

    }
})
/* global app Util URI*/
app.factory("AudioWebSocketService",function(WebSocketService,SystemSettingsService,AuthenticationService,OriginService,EventService){
    const key = "mainAudio";
    let socket = WebSocketService.get(key);
    socket.obs.open.on((isOpen)=>{
        if(isOpen)EventService.emit("websocketOpened");
    })
    socket.obs.close.on(event=>{
        if(event)EventService.emit("websocketClosed",event);
    })

    function getURI(){
        let authNumber = AuthenticationService.getUserInfo().AUTHORIZATION;
        return SystemSettingsService.getOrPull().then(systemConfig=>{
            let uri = new URI();
            uri.protocol(OriginService.isSecure()? "wss" : "ws");
            uri.hostname(OriginService.getHostname());
            uri.port(OriginService.isSecure()? systemConfig.IP_PORT_FOR_WEB_SERVER_WSS : systemConfig.IP_PORT_FOR_WEB_SERVER_WS);
            uri.search({Authorization:authNumber}); // Including this authorization token is important
            uri.path(""); // not necessary, but makes the URL cleaner
            uri.hash(""); // having a # in a websocket's URL is not accepted. This empties the hash
            uri.normalizeHash(); // and this removes the empty hash
            return uri.toString();
        })
    }
    function open(){
        return getURI().then(uri=>{
            return WebSocketService.open({
                uri:uri,
                key:key
            })
        });
    }
    function close(){
        let s = get();
        if(s)s.close();
    }
    function get(){
        return WebSocketService.get(key);
    }
    return {
        get,
        close,
        open
    }
})

app.factory("SelfPublishSocketService",function(WebSocketService,EnvService,NotificationService){
    const key = "selfPublish";
    WebSocketService.get(key);
    function getURI(){
        let uri = new URI();
        let port = EnvService.get("selfPublishPort");
        if(port)uri.port(port);
        uri.hostname('localhost');
        uri.protocol('ws');
        return uri.origin();
    }
    function open(){
        return WebSocketService.open({
            uri:getURI(),
            key:key
        }).catch(e=>{
            NotificationService.add({message:"Couldn't open socket for self publishing. "})
            console.error(e);
        })
    }
    function get(){
        return WebSocketService.get(key);
    }
    function close(){
        let s = get();
        if(s)return s.close();
        return Promise.resolve("no such socket is open");
    }
    return {
        open,
        close,
        get
    }
})

app


app.factory("WebSocketService",function(){
    const verbose = true;
    /* Stores known websockets by an ID so we can retrieve them with 'get' function below */
    let socketMap = {};

    const defaultConfig = {
        binaryType:"arraybuffer"
        // For audio data, we interpret data as an array of 16-bit integers.
        // by default, the socket would interpret the data as a BLOB
        // the appropriate binaryType may be different for general exchange of text.
    }

    const READYSTATE_DESCRIPTIONS = {
        0: "The connection is not yet open.",
        1: "The connection is open and ready to communicate.",
        2: "The connection is in the process of closing.",
        3: "The connection is closed or couldn't be opened."
    }

    class Socket{
        // socket - the internal socket object
        // config - obj with the following properties
            // key - name this Socket is stored under
            // uri - URI that this socket is connected to
            // binaryType - 
        // obs - observers for open,close,error,message events
        // openingPromise
        // closingPromise
        constructor(config){
            config = Object.assign({},defaultConfig,config);
            if(!config.key)config.key = config.uri;

            this.config = config;
            this.obs = new Util.Observers(["opening","open","closing","close","error","message"])

            socketMap[config.key] = this;
            return this;
            
        }
        handleMessage(event){
            log("socket message received");
            this.obs.message.notify(event.data);
        }
        handleError(event){
            console.error("WebSocket closed due to error",event);
            this.handleClose(event);
            this.obs.error.set(event);
        }
        handleClose(event){
            log("handle closed event",event);
            this.obs.opening.set(false);
            this.obs.open.set(false);
            this.obs.close.set(event || true);
            this.obs.closing.set(false);
        }
        handleOpen(){
            log("socket opened successfully");
            this.obs.opening.set(false);
            this.obs.open.set(true);
            this.obs.close.set(false);
            this.obs.error.set(false);
            this.obs.closing.set(false);
            Util.beforeUnload(this.close.bind(this));
        }
        isOpen(){
            return this.obs.open.get();
        }
        isOpening(){
            return this.obs.opening.get();
        }
        isClosed(){
            return this.obs.close.get();
        }
        isClosing(){
            return this.obs.closing.get();
        }
        send(){
            if(this.isOpen()){
                this.socket.send(...arguments);
            }
            else{
                console.warn("couldn't send",...arguments,"to websocket which is not open. socket = ",this.socket);
            }
        }
        // opens a new websocket, returns a promise that resolves when it has finished opening
        // if called repeatedly it will close old existing websockets before opening new ones
        open(config){
            try{
                config = Object.assign({},this.config,config);
                log("opening socket",config);
                // if(this.isOpen() || this.isO)return this.close().then(()=>this.open(config));// close existing socket if we try to open when one is already open
                this.socket = new WebSocket(config.uri)
                this.obs.opening.set(true);
                this.socket.binaryType = config.binaryType;

                this.socket.onerror = (this.handleError.bind(this));
                this.socket.onclose = (this.handleClose.bind(this));
                this.socket.onopen = (this.handleOpen.bind(this));
                this.socket.onmessage = (this.handleMessage.bind(this));

                this.openingPromise = new Promise((res,rej)=>{
                    this.obs.open.on((isOpen)=>{
                        // console.log("opening promise isOpen",isOpen);
                        if(isOpen)res(this);
                    });
                    this.obs.error.on(isError=>{
                        if(isError){
                            rej(isError);
                        }
                    });
                    this.obs.close.on(isClosed=>{
                        if(isClosed){
                            // console.log("opening promise closed",isClosed);
                            rej(isClosed);
                        }
                    });
                })

                return this.openingPromise;
            }catch(e){
                console.error("couldn't open WebSocket",e);
                return Promise.reject(e);
            }
        }
        close(reason){
            console.log("closing socket",this.config);
            if(reason === undefined) reason = "socket manually closed";
            if(!this.socket || this.isClosed()){
                return Promise.resolve("already closed");
            }
            else{
                if(this.isClosing()){
                    return this.closingPromise;
                }
                else{
                    this.obs.closing.set(true);
                    this.closingPromise = new Promise((res,rej)=>{
                        let handle = (isClosed)=>{
                            if(!isClosed)return;
                            this.obs.close.off(handle);
                            this.closingPromise = undefined;
                            res();
                        }
                        this.obs.close.on(handle);
                    });
                    this.socket.close(1000,reason); // 1000 means 'successful closure'
                    return this.closingPromise;
                }
            }
        }
        clear(){
            this.close("clearing "+this.config.key);
            this.obs.close.set(true);
            this.obs.clear();
            delete this.socket;
        }
    }
    /* Configuration: 
        uri
        key (id used to get the websocket later)
        binaryType (string for interpreting received socket data. Defaults to 'arraybuffer')
    */
    function open(config){
        let socket = get(config.key);
        if(socket.isOpen()){
            return Promise.resolve(socket);
        }
        else if(socket.isOpening()){
            return socket.openingPromise;
        }
        else{ // either unopened or previously closed / errored
            log("opening new socket");
            return socket.open(config);
        }
    }

    function create(key){
        return new Socket({key:key})
    }
    function get(key){
        let stored = socketMap[key];
        if(stored){
            return stored;
        }
        else{
            return create(key); // also stores it in the socket map
        }

    }
    function clearKey(key){
        let s = get(key);
        if(s && s.clear){
            s.clear();
        }
        delete socketMap[key];
    }
    function clearAll(){
        Object.keys(socketMap).forEach(clearKey)
    }
    function clear(arg){
        if(arg === undefined){
            clearAll();
        }else{
            clearKey(arg);
        }
    }

    /* Tests if we can successfully connect to a websocket at the given URL.
    Returns a promise that resolves if we connected and rejects if we didn't
    Then regardless of success, we disconnect from the socket. */
    const testURL = url => {
        const TIMEOUT_DURATION = 5000; // ms
        let p = new Promise((res,rej)=>{
            let config = {
                url:url
            }
            open(config).then(sock=>{
                sock.onOpen(res);
                sock.onError(rej);
                sock.onClose(rej);
            }).catch(rej);
        })
        return Util.timeoutPromise(p,TIMEOUT_DURATION);
    }

    function log(){
        if(verbose)console.log(...arguments);
    }

    return ({
        testURL,
        get,
        clear,
        open
    })
})
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
    function broadcast(){
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
app.factory("KurentoRTSPPlayer",function(WebSocketService,NotificationService){
    const KURENTO_WEBSOCKET_URI = "wss://kurento.jsconsole.net:8433/kurento"

    const create = () => {
        /*
        * (C) Copyright 2014 Kurento (http://kurento.org/)
        *
        * All rights reserved. This program and the accompanying materials
        * are made available under the terms of the GNU Lesser General Public License
        * (LGPL) version 2.1 which accompanies this distribution, and is available at
        * http://www.gnu.org/licenses/lgpl-2.1.html
        *
        * This library is distributed in the hope that it will be useful,
        * but WITHOUT ANY WARRANTY; without even the implied warranty of
        * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
        * Lesser General Public License for more details.
        *
        */

        function getopts(args, opts)
        {
        var result = opts.default || {};
        args.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, $1, $2, $3) { result[$1] = $3; });

        return result;
        };

        var args = getopts(location.search,
        {
        default:
        {
            // ws_uri: 'ws://' + location.hostname + ':8888/kurento',
            ws_uri: KURENTO_WEBSOCKET_URI,
            ice_servers: undefined
        }
        });

        if (args.ice_servers) {
        console.log("Use ICE servers: " + args.ice_servers);
        kurentoUtils.WebRtcPeer.prototype.server.iceServers = JSON.parse(args.ice_servers);
        } else {
        console.log("Use freeice")
        }


        // window.addEventListener('load', function(){
        //     var videoOutput = document.getElementById('videoOutput');
        //     var address = document.getElementById('address');
        //     address.value = 'http://files.kurento.org/video/puerta-del-sol.ts';
        var pipeline;
        var webRtcPeer;

        // startButton = document.getElementById('start');
        // startButton.addEventListener('click', start);

        // stopButton = document.getElementById('stop');
        // stopButton.addEventListener('click', stop);

        /* Written by Steven */
        function playURI(vidElement,uri){
            console.log("Kurento playURI",vidElement,uri);
            var options = {
            remoteVideo : vidElement // convert from jquery type element to normal DOM element
            };
            webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
            function(error){
                if(error){
                    return console.error(error);
                }
                let onOffer2 = makeCustomOnOffer(uri);
                webRtcPeer.generateOffer(onOffer2);
                webRtcPeer.peerConnection.addEventListener('iceconnectionstatechange', function(event){
                if(webRtcPeer && webRtcPeer.peerConnection){
                    console.log("oniceconnectionstatechange -> " + webRtcPeer.peerConnection.iceConnectionState);
                    console.log('icegatheringstate -> ' + webRtcPeer.peerConnection.iceGatheringState);
                }
                });
            });
        }
        /* Written by Steven */
        function makeCustomOnOffer(customURI){
            return function customOnOffer(error, sdpOffer){
                if(error) return onError(error);

                kurentoClient(KURENTO_WEBSOCKET_URI, function(error, kurentoClient) {
                    if(error) return onError(error);

                    kurentoClient.create("MediaPipeline", function(error, p) {
                        if(error) return onError(error);

                        pipeline = p;

                        pipeline.create("PlayerEndpoint", {uri: customURI}, function(error, player){
                        if(error) return onError(error);

                        pipeline.create("WebRtcEndpoint", function(error, webRtcEndpoint){
                            if(error) return onError(error);

                    setIceCandidateCallbacks(webRtcEndpoint, webRtcPeer, onError);

                            webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer){
                                if(error) return onError(error);

                        webRtcEndpoint.gatherCandidates(onError);

                                webRtcPeer.processAnswer(sdpAnswer);
                            });

                            player.connect(webRtcEndpoint, function(error){
                                if(error) return onError(error);

                                console.log("PlayerEndpoint-->WebRtcEndpoint connection established");

                                player.play(function(error){
                                if(error) return onError(error);

                                console.log("Player playing ...");
                                });
                            });
                        });
                        });
                    });
                });
            }
        }
        

        // function start() {
        //     if(!address.value){
        //     window.alert("You must set the video source URL first");
        //     return;
        //     }
        //     address.disabled = true;
        //     showSpinner(videoOutput);
        //     var options = {
        //     remoteVideo : videoOutput
        //     };
        //     webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        //     function(error){
        //         if(error){
        //         return console.error(error);
        //         }
        //         webRtcPeer.generateOffer(onOffer);
        //         webRtcPeer.peerConnection.addEventListener('iceconnectionstatechange', function(event){
        //         if(webRtcPeer && webRtcPeer.peerConnection){
        //             console.log("oniceconnectionstatechange -> " + webRtcPeer.peerConnection.iceConnectionState);
        //             console.log('icegatheringstate -> ' + webRtcPeer.peerConnection.iceGatheringState);
        //         }
        //         });
        //     });
        // }

        // function onOffer(error, sdpOffer){
        //     if(error) return onError(error);

        //     kurentoClient(args.ws_uri, function(error, kurentoClient) {
        //         if(error) return onError(error);

        //         kurentoClient.create("MediaPipeline", function(error, p) {
        //             if(error) return onError(error);

        //             pipeline = p;

        //             pipeline.create("PlayerEndpoint", {uri: address.value}, function(error, player){
        //             if(error) return onError(error);

        //             pipeline.create("WebRtcEndpoint", function(error, webRtcEndpoint){
        //                 if(error) return onError(error);

        //         setIceCandidateCallbacks(webRtcEndpoint, webRtcPeer, onError);

        //                 webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer){
        //                     if(error) return onError(error);

        //             webRtcEndpoint.gatherCandidates(onError);

        //                     webRtcPeer.processAnswer(sdpAnswer);
        //                 });

        //                 player.connect(webRtcEndpoint, function(error){
        //                     if(error) return onError(error);

        //                     console.log("PlayerEndpoint-->WebRtcEndpoint connection established");

        //                     player.play(function(error){
        //                     if(error) return onError(error);

        //                     console.log("Player playing ...");
        //                     });
        //                 });
        //             });
        //             });
        //         });
        //     });
        // }

        function stop() {
            console.warn("disposing of webrtc peer and releasing pipeline");
            // address.disabled = false;
            if (webRtcPeer) {
            webRtcPeer.dispose();
            webRtcPeer = null;
            }
            if(pipeline){
            pipeline.release();
            pipeline = null;
            }
            // hideSpinner(videoOutput);
        }

        // });

        function setIceCandidateCallbacks(webRtcEndpoint, webRtcPeer, onError){
        webRtcPeer.on('icecandidate', function(candidate){
            console.log("Local icecandidate " + JSON.stringify(candidate));

            candidate = kurentoClient.register.complexTypes.IceCandidate(candidate);

            webRtcEndpoint.addIceCandidate(candidate, onNonFatalError);

        });
        webRtcEndpoint.on('OnIceCandidate', function(event){
            var candidate = event.candidate;

            console.log("Remote icecandidate " + JSON.stringify(candidate));

            webRtcPeer.addIceCandidate(candidate, onNonFatalError);
        });
        }

        function onNonFatalError(error){
            if(error){
                console.error(error);
            }
        }
        function onError(error) {
            if(error)
            {
                console.error(error);
                stop();
            }
        }
        return {
            playURI,
            stop
        }
    }

    let s;// = create();

    const playURI = function(){
        stop(); // Only allows for one RTSP video to be played at a time
        s = create();
        s.playURI(...arguments);
        Util.beforeUnload(function(){
            s.stop();
        });
    }
    const playURIInElement = (uri,vidElement) => {
        WebSocketService.testURL(KURENTO_WEBSOCKET_URI).then(()=>{
            playURI(vidElement,uri);
        })
        .catch(e=>{
            NotificationService.add({message:"Could not connect to RTSP->WebRTC conversion server at " + KURENTO_WEBSOCKET_URI,type:"danger"})
            console.error("kurento rtsp->webrtc error",e)
        })
        .finally(()=>{
            $(vidElement).parent().find(".rtsp-spinner").hide();
        })
    }
    const stop = () => {
        if(s){
            s.stop();
        }
    }

    return {
        playURIInElement,
        stop
    }
});
/* global app Util */
// more like User Info service
app.factory("AuthenticationService", function(WhichPageService, BrowserStorageService, EnvService) {
    let userInfo;
    // let loggedIn = false;
    let vcp = false;
    const setVSAUserInfo = newInfo =>{
        userInfo = {
            accessToken:        newInfo.AUTHORIZATION,
            userName:           newInfo.DISPLAY_NAME,
            connectionTimeout:  newInfo.CONNECTION_TIMEOUT_IN_MS,
            auths: {
                accessLevel:                newInfo.ACCESS_LEVEL,
                allowRestartSystem:         newInfo.ALLOW_RESTART_SYSTEM,
                allowForceFailover:         newInfo.ALLOW_FORCE_FAILOVER,
                allowPasswordDisplay:       newInfo.ALLOW_PASSWORD_DISPLAY,
                allowSystemSettingsChanges: newInfo.ALLOW_SYSTEM_SETTINGS_CHANGES,
                allowClientDeletion:        newInfo.ALLOW_CLIENT_DELETION,
                allowLicensing:             newInfo.ALLOW_LICENSING
            },
            systemSupport: {
                supportsFailover:                   newInfo.SUPPORTS_FAILOVER,
                supportsTelexTrunking:              newInfo.SUPPORTS_TELEX_TRUNKING,
                supportsDelecTrunking:              newInfo.SUPPORTS_DELEC_TRUNKING,
                supportsGeoMapping:                 newInfo.SUPPORTS_GEO_MAPPING,
                supportsUserInterfaceSettings:      newInfo.SUPPORTS_USER_INFERFACE_SETTINGS,
                supportsTelexTelephoneInterface:    newInfo.SUPPORTS_TELEX_TELEPHONE_INTERFACE,
                supportsSIPServer:                  newInfo.SUPPORTS_SIP_SERVER,
                supportsPartyLineOnly:              newInfo.SUPPORTS_PARTY_LINE_ONLY,
                supportsAudioEncryption:            newInfo.SUPPORTS_AUDIO_ENCRYPTION,
                supportsMediaServerSettings:        newInfo.SUPPORTS_VCP4WEBRTC_VIDEO,
                supportsVuMeters:                   newInfo.SUPPORTS_TIF_VU_METERS
            }
        };
        BrowserStorageService.set("userInfo",userInfo);
        updateUtilParameters();
    }

    /*
        {
            "DISPLAY_NAME":"slove",
            "AUTHORIZATION":"4d6f6e6461792c204a756e65.34392c2032362c20313736.30362f32352f31382031353a30383a34393538",
            "LABEL_ID":10310,
            "CONNECTION_TIMEOUT_IN_MS":3500
        }
    */
    const setVCPUserInfo = newInfo => {
        userInfo = newInfo;
        vcp = true;
        BrowserStorageService.set("userInfo",userInfo); // Otherwise, we will pull in user info from the last logged-in VSA user
    }

    const updateUtilParameters = () => {
        let newTimeoutTime = getUserInfo("connectionTimeout");
        if(newTimeoutTime != undefined) Util.getAPIRequestTimeout = () => newTimeoutTime
    }

    // {
    //     "SUPPORTS_FAILOVER":false,
    //     "SUPPORTS_TELEX_TRUNKING":false,
    //     "SUPPORTS_DELEC_TRUNKING":false,
    //     "SUPPORTS_SNMP":false,
    //     "SUPPORTS_GEO_MAPPING":false,
    //     "SUPPORTS_USER_INFERFACE_SETTINGS":true,
    //     "SUPPORTS_TELEX_TELEPHONE_INTERFACE":true,
    //     "SUPPORTS_SIP_SERVER":true,
    //     "SUPPORTS_PARTY_LINE_ONLY":false,
    //     "SUPPORTS_AUDIO_ENCRYPTION":false
    //   }
    const updateSystemSupportPermissions = perms => {
        console.log("updating system support permissions");
        const userInfo = getUserInfo();
        if(!userInfo.systemSupport)userInfo.systemSupport = {};
        const ss = userInfo.systemSupport;

        console.log("before",JSON.stringify(ss));

        ss.supportsFailover                 = perms.SUPPORTS_FAILOVER;
        ss.supportsTelexTrunking            = perms.SUPPORTS_TELEX_TRUNKING,
        ss.supportsDelecTrunking            = perms.SUPPORTS_DELEC_TRUNKING,
        ss.supportsSNMP                     = perms.SUPPORTS_SNMP;
        ss.supportsGeoMapping               = perms.SUPPORTS_GEO_MAPPING,
        ss.supportsUserInterfaceSettings    = perms.SUPPORTS_USER_INFERFACE_SETTINGS,
        ss.supportsTelexTelephoneInterface  = perms.SUPPORTS_TELEX_TELEPHONE_INTERFACE,
        ss.supportsSIPServer                = perms.SUPPORTS_SIP_SERVER,
        ss.supportsPartyLineOnly            = perms.SUPPORTS_PARTY_LINE_ONLY,
        ss.supportsMediaServerSettings      = perms.SUPPORTS_VCP4WEBRTC_VIDEO,
        ss.supportsAudioEncryption          = perms.SUPPORTS_AUDIO_ENCRYPTION

        console.log("after",JSON.stringify(ss));
    }
    // const isLoggedIn =              () => obs.loggedIn.get();
    // const setLoggedIn =             () => obs.loggedIn.set(true);
    const isTIF =                   () => getUserInfo('systemSupport','supportsTelexTelephoneInterface');
    const hasTrunking =             () => getUserInfo('systemSupport','supportsTelexTrunking');
    const supportsFailover =        () => getUserInfo('systemSupport','supportsFailover');
    const allowsPasswordDisplay =   () => getUserInfo("auths","allowPasswordDisplay");
    /* VU Meters only enabled if both allowed by the server AND not disabled by env.js */
    const hasVuMeters =             () => getUserInfo("systemSupport","supportsVuMeters") && (EnvService.get("disableVuMeter") != true)
    const getHomeState =            () => isTIF()? "telephoneInterface" : "systemStatus";

    function clearInfo(){
        userInfo = null;
        BrowserStorageService.remove("userInfo");
    }
    function setUserInfo(info){
        if(WhichPageService.isCP()){
            setVCPUserInfo(info);
        }
        else if(WhichPageService.isSA()){
            setVSAUserInfo(info);
        }
        else{
            console.error("what page are we on?");
        }
    }
    /* Retrieves stored session info about the logged-in user.
    This function can be used with no arguments to get everything
    or with string arguments to get specific parts of the user info, like
    getUserInfo('systemSupport','supportsFailover') === getUserInfo().systemSupport.supportsFailover */
    function getUserInfo() {
        // try loading userInfo if we need to
        if(userInfo === undefined){
            const storedUserInfo = BrowserStorageService.get("userInfo");
            if(storedUserInfo && storedUserInfo!="undefined"){
                console.log("stored user info",storedUserInfo);
                userInfo = storedUserInfo;
            }
        }
        return Util.getPropertySafe(userInfo,...Array.from(arguments));
    }
    const isVCP = () => vcp === true;

    function hasStoredCredentials(){
        return BrowserStorageService.get("BAD_PRACTICE_username");
    }
    function rememberMe(){
        return true;
    }

    return {
        rememberMe,
        clearInfo,
        setUserInfo,
        // isLoggedIn:isLoggedIn,
        // setLoggedIn,
        isTIF: isTIF,
        isVCP: isVCP,
        hasTrunking:hasTrunking,
        hasVuMeters:hasVuMeters,
        supportsFailover:supportsFailover,
        getHomeState:getHomeState,
        updateSystemSupportPermissions:updateSystemSupportPermissions,
        allowsPasswordDisplay:allowsPasswordDisplay,
        getUserInfo: getUserInfo,
        setVCPUserInfo:setVCPUserInfo,
        hasStoredCredentials,
        setVSAUserInfo
    };
});




/* Allows us to make API calls related to authentication: logging in and logging out */
app.factory("AuthenticatorService", function(StateService, APIService,
 LockService, WhichPageService){
    
    const LOGIN_TIMEOUT_MS = 10000;
    const LOGIN_RETRIES = 5;
    const vsaLogin = (userName, password) => {
        let payload = {
            'LOGIN_NAME': userName,
            'LOGIN_PASSWORD': password
        }
        return APIService.post('/authentication',payload,{retries:LOGIN_RETRIES,timeout:LOGIN_TIMEOUT_MS}).then(result=>{
            return result.data;
        });
    }
    const vcpLogin = (userName, password) => {
        let payload = {
            'LOGIN_NAME': userName,
            'LOGIN_PASSWORD': password,
            'LOGIN_TYPE': "VCP"
        }
        return APIService.post('/authentication',payload,{timeout:10000}).then(result=>{
            return result.data;
        });
    }
    const login = LockService.lock2((userName, password) => {
        if(WhichPageService.isSA()){
            return vsaLogin(userName,password);
        }
        else if (WhichPageService.isCP()){
            return vcpLogin(userName,password);
        }
        else{
            console.error("Trying to log in but unknown what page we are on. System Admin? Control Panel?");
            return Promise.reject("unknown login target");
        }
    });
    const logout = () => {
        return APIService.delete('/authentication',{hasCustomErrorHandling:true})
    }

    return {
        login:login,
        logout:logout
    }
})
/* */
app.factory("ConnectionService",function(BrowserStorageService,AuthenticatorService,AuthenticationService,StateService,
    WhosStreamingService,EventService,LockService){
    let obs = new Util.Observers(['loggedIn','connected','desireToBeOnline'])

    /* any time we disconnect, we have also logged out */
    obs.connected.on(newValue=>{
        if(!newValue){
            obs.loggedIn.set(false);
        }
    })

    const DEFAULT_CONFIG = {
        intentional:undefined,
        username:BrowserStorageService.get("BAD_PRACTICE_username"),
        password:BrowserStorageService.get("BAD_PRACTICE_password")
    }

    function username(arg){
        if(arg === undefined){
            return DEFAULT_CONFIG.username;
        }
        DEFAULT_CONFIG.username = arg;
        BrowserStorageService.setLocal("BAD_PRACTICE_username",arg); // localstorage instead of sessionstorage stores through closing browser
    }
    function password(arg){
        if(arg === undefined){
            return DEFAULT_CONFIG.password;
        }
        DEFAULT_CONFIG.password = arg;
        BrowserStorageService.setLocal("BAD_PRACTICE_password",arg);
    }
    function loginManual(){
        console.log("logging in intentionally...");
        obs.desireToBeOnline.set(true);
        return loginAuto(...arguments);
    }
    function loginAutoHelper(name,pass){
        console.log("logging in...");
        if(name===undefined)name=DEFAULT_CONFIG.username;
        if(pass===undefined)pass=DEFAULT_CONFIG.password;
        let p = AuthenticatorService.login(name,pass);
        p.then(userInfo=>{
            obs.loggedIn.set(true);
            obs.connected.set(true);
            console.log("user info",userInfo);
            AuthenticationService.setUserInfo(userInfo);
            username(name);
            password(pass);
            console.log("logged in.");
            EventService.emit("loggedIn");
            StateService.goHome();
        });

        return p;
    }
    const loginAuto = LockService.lock2(loginAutoHelper); // returns a promise if already in progress

    function logoutManual(){
        console.log("logging out intentionally...")
        obs.desireToBeOnline.set(false);
        // previously we cleared the username and password from browser storage for security...
        // username("");
        // password("");
        EventService.emit("beforeLoggedOut");
        WhosStreamingService.reportMyStreamOff(); // before we log out, try notifying the server that we aren't streaming
        return AuthenticatorService.logout().finally(()=>{// tell the server we've logged out
            disconnect();
            obs.loggedIn.set(false);
            EventService.emit("loggedOut");
        }) 
    }
    function disconnect(){
        if(obs.connected.get()){
            console.log("losing connection...");
            obs.connected.set(false);
            AuthenticationService.clearInfo();
            StateService.goToLogon();
            EventService.emit("disconnected");
        }
        else{
            console.log("connection should already be lost...");
        }
    }

    function isLoggedIn(){
        return obs.loggedIn.get();
    }

    return {
        obs,
        username,
        password,
        isLoggedIn,
        loginManual,
        loginAuto,
        logoutManual,
        disconnect
    }
})

app.factory("ConnectionStatusService",function(EventService){
    const numFailuresToFailover = 5;
    const allowedDurationOfFailing = 2000; // ms

    let numFailuresWithoutSuccesses = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let earliestFailureTime;
    let status = "connected";

    const observeFailure = () => {
        ++numFailuresWithoutSuccesses;
        ++totalFailures;
        if(!earliestFailureTime)earliestFailureTime = new Date().getTime();
        if(warrantsFailover()){
            EventService.emit("failoverWarranted");
            setDisconnected();
        }
    }
    const observeSuccess = () => {
        numFailuresWithoutSuccesses = 0;
        ++totalSuccesses;
        earliestFailureTime = undefined;
        setConnected();
    }
    /* Returns true iff
        there have been at least 5 failed API calls since the last successful API call
        AND we know API calls have been failing for at least two seconds.
    */
    const warrantsFailover = () => {
        let enoughFailures = numFailuresWithoutSuccesses >= numFailuresToFailover;
        let timeSinceFirstFailure = (new Date().getTime() - earliestFailureTime);
        let enoughTimePassed = timeSinceFirstFailure >= allowedDurationOfFailing;
        return enoughFailures && enoughTimePassed;
    }
    const setStatus = newStatus => {
        status = newStatus
    }
    const setConnected = () => {status = "connected";}
    const setDisconnected = () => {setStatus("disconnected");}
    const isDisconnected = () => status == "disconnected";
    const isConnected = () => status == "connected";
    

    return {
        observeFailure:observeFailure,
        observeSuccess:observeSuccess,
        warrantsFailover:warrantsFailover,
        // getStatus:getStatus,
        setConnected:setConnected,
        setDisconnected:setDisconnected,
        isConnected:isConnected,
        isDisconnected:isDisconnected,
        getTotalSuccesses: () => totalSuccesses,
        getTotalFailures: () => totalFailures,
        getFailuresSinceSuccess: () => numFailuresWithoutSuccesses
    }
})

/* global app */

/* 
    Many API calls intend get some state stored at the server so that the client and server are in sync.
    As an optimization, the server may just send the pieces of state that have changed since the last update.
    This service helps us to consume an API with that optimization such that we can just get the whole state
    without concerning ourselves with keeping track of the diffs.

    Responses look like this:
    {
        "TOKEN":1,
        "POSITION":[
            {
                "ID":10003,
                "ALIAS":"alan",
                "CONNECTION_STATE":"OFFLINE",
                "IP_ADDRESS":"76.220.73.163",
                "GPS_LATITUDE":37.530900000000003,
                "GPS_LONGITUDE":-122.0705
            },{
                "ID":10008,
                "ALIAS":"bgullette",
                "CONNECTION_STATE":"OFFLINE",
                "IP_ADDRESS":"98.26.104.40",
                "GPS_LATITUDE":0,
                "GPS_LONGITUDE":0,
                "GPS_ALTITUDE_IN_METERS":0,
                "GPS_HEADING_IN_DEGREES":0,
                "GPS_METERS_PER_SECOND":0
            },
            ...
        ]
    }

    We store state like this:
    {
        10003:<data about label 10003>,
        10008:<data about label 10008>,
        ...
    }

    Which can be returned as an array like this with the 'getAsArray' fn
    [<data about label 10003>,<data about label 10008>,...]
*/
app.factory("DiffUpdatesService",function(APIService,LockService,EventService){
    const create = (inputURL,overhaulProp,changesProp) => {
        let uriObj = new URI(inputURL);
        let state = {};
        let token;
        const processFullUpdate = result => {
            token = result.data.TOKEN;
            if(result.data[overhaulProp]){
                state = {}; // forget everything we knew about the data on the server, we're getting completely fresh info
                result.data[overhaulProp].forEach(item=>{
                    item.changed = true;
                    state[item.ID] = item;
                })
            }
            return state;
        }
        const getFullUpdate = () => {
            uriObj.removeQuery("token");
            return APIService.get(uriObj.toString()).then(processFullUpdate);
        }
        const processChanges = result => {
            token = result.data.TOKEN; // No matter what, update that token.
            let changes = result.data[changesProp];
            let overhaul = result.data[overhaulProp];

            if(overhaul && (overhaulProp !== changesProp)){ // this property only expected if getting full update, so it means we missed a token or a request failed
                console.log("requested changes but got full update",result.data);
                return processFullUpdate(result);
            }
            else if(changes){ // Normal-ish case where some positions changed. Assuming the property is POSITION_CHANGES
                changes.forEach(item=>item.changed=true); // mark the new updates as changed
                Object.keys(state).forEach(key=>{state[key].changed=false}); // and everything else as unchanged
                changes.forEach(item=>{
                    let id = item.ID;
                    state[id] = item;
                });
                return state;
            }
            else{ // Normal case where no changes have ocurred
                Object.keys(state).forEach(key=>state[key].changed=false); // mark everything as unchanged
                return state;
            }
        }
        const getChanges = () => {
            uriObj.setQuery("token",token);
            return APIService.get(uriObj.toString()).then(processChanges);
        }
        const get = () => {
            let promise;
            if(token === undefined){
                promise = getFullUpdate();
            }
            else{
                promise = getChanges();
            }
            promise.catch(resetToken);
            return promise;
        }
        /* If one of our requests fails, like in the case of the server going offline...
            Assume that our token will no longer work and remove it from subsequent requests
            until we get a positive response from the server */
        EventService.on("loggedOut",reset);
        function reset(){
            resetToken();
            resetState();
        }
        function resetState(){state = {}}
        function resetToken(){token = undefined;}
        const getAsArray = () => {
            return get().then(obj=>{
                let arr = [];
                Object.keys(obj).forEach(key=>{
                    arr.push(obj[key]);
                })
                return arr;
            })
        }
        const getSync = () => {
            // let arr = [];
            // Object.keys(state).forEach(key=>{
            //     arr.push(state[key]);
            // })
            // return arr;
            return state;
        }
        return {
            getSync,
            getAsArray:LockService.lock2(getAsArray),
            get:LockService.lock2(get)
        }
    }
    return {
        create
    }
})

app.factory("SelectorConnectionsService",function(DiffUpdatesService){
    let url = '/status/clientconnectionstate';
    let overhaulProp = 'CONNECTION_STATE';
    let changesProp = 'CONNECTION_STATE_CHANGES';
    let monitor = DiffUpdatesService.create(url,overhaulProp,changesProp);

    const getConnectedClients = () => {
        return monitor.get().then(excessInfo=>{
            let onlines = [];
            Object.keys(excessInfo).forEach(id=>{
                if(excessInfo[id].STATE == "ONLINE"){
                    onlines.push(Number(id));
                }
            })
            return onlines;
        })
    }
    const getSync = () => {
        let state = monitor.getSync();
        let onlines = [];
        Object.keys(state).forEach(id=>{
            if(state[id].STATE == "ONLINE"){
                onlines.push(id);
            }
        })
        return onlines;
    }

    return({
        getSync,
        getConnectedClients
    })
})

/* 
looks like

{
  "TOKEN":9,
  "CALL_NOTIFICATION":
  [{
  "ID":10310,
  "ALIAS":"slove",
  "STATE":"OFF"
}]
}
*/

app.factory("CallNotificationService",function(DiffUpdatesService){
    const UPDATE_RATE = 1000; //ms
    let url = '/status/callnotification';
    let overhaulProp = "CALL_NOTIFICATION"; // seems like we only ever get changes prop actually
    let changesProp = "CALL_NOTIFICATION";
    let monitor = DiffUpdatesService.create(url,overhaulProp,changesProp);

    let set = Util.Set();
    let updater = Util.repeater(update,UPDATE_RATE);

    
    function update(){
        return monitor.get().then(state=>{
            Object.keys(state).forEach(id=>{
                let isOn = state[id].STATE=="ON";
                if(isOn){
                    set.add(Number(id));
                }
                else{
                    set.remove(Number(id));
                }
            })
        })
    }
    function start(){
        updater.start();
    }
    function stop(){
        updater.stop();
    }
    return {
        start,
        stop,
        obs:set.obs
    }
})
/* global app */

/* These three services play similar but distinct roles.
AllowedService reflects permissions for the current user and what they are allowed to do
SupportedService reflects what the server is capable of
EnabledService combines them and is used to determine whether features appear in the UI or not.

For instance, we may not want the Geolocation option to show up to the user, but it could be because
the server doesn't support it OR because the particular user doesn't have access
*/

/* Reports which features should be made visible */
app.factory("EnabledService",function(WhichPageService,AllowedService,SupportedService,EnvService,MyLabelService,DimensionsService){
    const geoTrackMe = () => {return MyLabelService.propEquals("GEO_MAPPING_DISABLE","OFF")}; // VCP only
    const geoButton = () => {return MyLabelService.propEquals("GEO_MAPPING_BUTTON","ON")}; // whether the geomapping button should be visible for this client. VCP only
    const geoOnVSA = () => {return SupportedService.geo()}
    const systemSettings = () =>AllowedService.changeSettings();
    const failover = () =>AllowedService.failover();
    const restart = () =>AllowedService.restart();
    const deleteClients = () =>AllowedService.deleteClients();
    /* features only enabled on demo server */
    const chat = () => EnvService.get("enableChat");
    const onlineGeo = () => !EnvService.get("disableOnlineGeo"); // use the internet to get any missing geo tiles
    const advancedDropdown = () => true;//gum() && DimensionsService.isWide(); // only relevant if streaming is happening
    const vr360Config = () => EnvService.get("enableVR360Config");
    const guestLogins = () => WhichPageService.isCP() && WhichPageService.isPublicDemo();
    const wideScreen = () => DimensionsService.isWide();
    const videoStreaming = () => SupportedService.videoStreaming(); // Streaming video with Kurento

    return {
        geoOnVSA,
        geoButton,
        geoTrackMe,
        videoStreaming,
        vr360Config,
        systemSettings,
        failover,
        restart,
        chat,
        wideScreen,
        onlineGeo:onlineGeo,
        advancedDropdown,
        guestLogins,
        deleteClients
    }
})
/* Reports which features CAN be made available to the user */
app.factory("SupportedService",function(AuthenticationService,SystemSettingsService){
    const systemSupports = propName => AuthenticationService.getUserInfo("systemSupport",propName); // helper
    const failover = () => systemSupports("supportsFailover");
    const geo = () => systemSupports("supportsGeoMapping");
    const videoStreaming = () => { // returns false if called before we have gotten system settings
        let settings = SystemSettingsService.get();
        if(settings && settings.HOSTNAME_FOR_VIDEO_MEDIA_SERVER){
            return true;
        }
        return false;
    }
    return {
        videoStreaming,
        geo,
        failover
    }
})
/* Reports which features SHOULD be made available to the user */
app.factory("AllowedService",function(MyLabelService,AuthenticationService,EnvService){
    // AuthenticationService userInfo auths only available on VSA!
    const auth = propName => AuthenticationService.getUserInfo("auths",propName); // helper
    /* VCP */
    const videoStreaming = ()=> EnvService.get("enableVideoStreaming") // unused, we are moving away from using env.js to determine this
    /* VSA */
    const restart = () => auth("allowRestartSystem");
    const failover = () => auth("allowForceFailover");
    const showPasswords = () => auth("allowPasswordDisplay");
    const changeSettings = () => auth("allowSystemSettingsChanges");
    const deleteClients = () => auth("allowClientDeletion");
    const licensing = () => auth("allowLicensing");
    return {
        videoStreaming,
        restart,
        failover,
        showPasswords,
        changeSettings,
        deleteClients,
        licensing
    }
})

app.factory("PreferenceService",function(MyLabelService,SystemSettingsService){
    function getMyLabel(){return MyLabelService.get() || {}};
    function hideOfflineSelectors(){return getMyLabel().HIDE_DISABLED_SELECTORS == "ON"}
    function showOwnSelector(){return SystemSettingsService.get().ALLOW_ASSIGNMENT_OF_SELECTOR_FOR_SELF == "ON"}
    return {
        showOwnSelector,
        hideOfflineSelectors
    }
})
/* global app Util*/
/* 
 * Cross Origin Resource Sharing (CORS) preflight requests that fail, don't 
 * give any info about the nature of the failure, and all come back with status of -1.
 * This happens when testing, where requests are sent from a different host than the API is on
*/
// (()=>{
	const errorMap = {
		'401':"unauthorizedError",
		'404':"notFoundError", 
		'500':"serverError",
		'-1':"timeoutError",
		// '0':"connectionRefusedError",
	};

	/* Sometimes we may want to handle an error in a more specific way, and shouldn't do this general error handling */
	const hasCustomErrorHandling = rejection => Util.getPropertySafe(rejection,"config","data","hasCustomErrorHandling");

	/* HTTP interceptor to observe errors */
	app.factory('errorHttpIntercept', function($q,EventService){
		return {
			'responseError': rejection => {
				// console.log("error",rejection);
				if(hasCustomErrorHandling(rejection)){
					// don't throw out the normal error messages as it is being handled some other way.
					console.log("not handling error due to custom error handling",rejection);
				}
				else{
					var errorName = errorMap[rejection.status];
					if(!errorName) errorName = "miscError";
					EventService.emit(errorName,rejection);
				}
				return $q.reject(rejection);
			}
		}
	})

	.config(function($httpProvider) { $httpProvider.interceptors.push('errorHttpIntercept');  });

	/* Handle all Errors */
	app.run(function($timeout, EventService,
		ConnectionService,NotificationService,FailoverService,ConnectionStatusService) {
		/* Authorization Errors */
		EventService.on("unauthorizedError",function(){
			console.log("unauthorized event detected");
			ConnectionService.disconnect();
			if(ConnectionService.obs.desireToBeOnline.get()){
				ConnectionService.loginAuto();
			}
		})

		/* failover stuff */
		let numFailoverAttempts = 0;

		let disconnectNotification = {
			message:"Connection to the server has been lost. Trying to reconnect...",
			duration:10000,
			topic: "failover"
		}

		/* trigger a failover */
		const attemptFailover = () => {
			if(!ConnectionStatusService.warrantsFailover()) return;
			numFailoverAttempts = numFailoverAttempts+1;

			NotificationService.add(disconnectNotification);
			FailoverService.attemptFailover()
			.then(()=>{
				NotificationService.add({message:"Failing over. Your browser will be redirected.",type:"success",topic:"failover"});
			})
			.catch(reason=>{
				if(reason == FailoverService.errors.NO_SECONDARY){
					// let msg = "Failover could not take place because no secondary server is set up.";
					let msg = "Unable to connect with Virtual Matrix.";
					NotificationService.add({message:msg,type:"danger",permanent:true,topic:"failover"})
					// stop trying
				}
				if(reason == FailoverService.errors.NO_HOSTS){ // no backup server set
					let msg = "Failover could not take place because no backup servers are known.";
					NotificationService.add({message:msg,type:"danger",permanent:true,topic:"failover"})
					// stop trying
				}
				if(reason == FailoverService.errors.NO_HOSTS_UP){ // no backup server online
					let hosts = "["+FailoverService.getViableOrigins().join(", ")+"]"
					let msg = "Failover could not take place because the backup server(s) "+ hosts +" are unreachable.";
					NotificationService.add({message:msg,type:"danger",duration:10000,topic:"failover"})
					$timeout(attemptFailover,3000); // keep trying
				}
				if(reason == FailoverService.errors.SERVER_IS_UP){
					// log back into the server
					$timeout(()=>{
						ConnectionService.loginAuto().then(()=>{
							NotificationService.add({message:"Successfully regained connection to server.",type:"success",topic:"failover"});
						})
					},1500); // wait 1500 ms before trying to log back in. hopefully this prevents old failed requests to come back AFTER we log back in, then logging us back out.
					
				}
				/* other reasons failover would not take place: 
					user declined prompt to failover
					failover already in progress
					the server we're on is actually up
				*/
				console.log("did not failover",reason);
			})
		}

		const isOnOurServer = url => {
			let ourServer = Util.getHost();
			return url.includes(ourServer);
		}
		EventService.on("failoverWarranted",()=>{
			ConnectionService.disconnect();
			attemptFailover();
		})

		/* Timeout Errors */
		EventService.on('timeoutError',(event,error)=>{
			if(isOnOurServer(error.config.url)){
				ConnectionStatusService.observeFailure();			
			}
		})
		
		/* 404 */
		EventService.on('notFoundError',(event,error)=>{
			console.log("404",event,error);
			const location = error.config.url;
			NotificationService.add({message:"404. Unable to find the resource you were looking for at " + location + ".", type:"danger", topic:"notFoundError"})
		})

		/* 500 */
		EventService.on('serverError',(event,error)=>{
			NotificationService.add({message:"An error occurred on the server. " + error.data.MESSAGE, type:"danger", topic:"serverError"})
			
		})

		/* Misc Errors */
		EventService.on('miscError', (event,error) => {
			console.log("misc error",event,error);
			const method = Util.getPropertySafe(error,"config","method");
			const url = Util.getPropertySafe(error,"config","url");
			const data = Util.getPropertySafe(error,"data");
			let msg;
			if(method && url && data){
				msg = "Could not " + method + " " + url + ". " + data;
				NotificationService.add({message:msg,type:"danger"});
			}
			else{
				msg = "Misc Error. ";
				console.log("Misc error description",event,error);
				// Not showing this type of Misc Error for now, unsure of the cause of the error and of the effect
			}
			
		})
	});
// })()
/* global app Util Geo */

app.factory("WhosPositionedService",function(OnServerService,ClientPositioningService,EventService){
    const GPS_REFRESH_INTERVAL = 5000; // ms

    let resource = OnServerService.create({
        pull:ClientPositioningService.get,
        readOnly:true,
        initialValue:[],
        showLoader:false,
        name:"Whos Positioned"
    })

    let callImmediately = true;
    let repeater = Util.repeater(resource.pull,GPS_REFRESH_INTERVAL,callImmediately);
    EventService.on("firstGeoOpened",repeater.start);
    EventService.on("lastGeoClosed",repeater.stop);

    return {
        obs:resource.obs,
        get:resource.get,
        pull:resource.pull,
        getWithin:resource.getWithin
    }
})

app.factory("GeoPositioningService",function(WhosPositionedService,GeoFromIPService){
    let updateSerializer = Util.Serializer(); // helps us serialize requests to GeoFromIPService so we don't overwhelm it
    const trackedClientIDs = Util.Set();
    let trackedClientInfo = Util.Map();

    const isPositioned = client => {
        return (client.GPS_LATITUDE && client.GPS_LONGITUDE)||
        (client.IP_LATITUDE && client.IP_LONGITUDE)
    }
    trackedClientInfo.obs.update.on((key,trackingInfo)=>{
        if(isPositioned(trackingInfo)){
            trackedClientIDs.add(key);
        }
        if(!isPositioned(trackingInfo) && trackingInfo.IP_ADDRESS){
            // we want to try to get geo from IP
            updateSerializer.add(()=>{
                console.log("getting geo from IP",trackingInfo);
                return GeoFromIPService.get(trackingInfo.IP_ADDRESS).then(latlon => {
                    if(latlon.lat && latlon.lon){
                        trackedClientInfo.update(trackingInfo.ID,{
                            IP_LATITUDE:latlon.lat,
                            IP_LONGITUDE:latlon.lon
                        });
                        trackedClientIDs.add(trackingInfo.ID);
                        console.log("got lat lon",key,latlon);
                    }
                    else{
                        // Couldn't get geo from IP
                    }
                })
            })
        }
    })

    function updateGPS(){
        let clients = WhosPositionedService.get();
        clients.forEach(client=>{
            let oldInfo = trackedClientInfo.get(client.ID);
            let newInfo = client;
            // could do our own merging if we want
            trackedClientInfo.update(client.ID,newInfo);
        })
    }
    WhosPositionedService.obs.pullSuccess.on(updateGPS);


    return {
        ids:trackedClientIDs,
        getIDs:trackedClientIDs.get,
        get:trackedClientInfo.get,
        obs:trackedClientInfo.obs
    }
})
app.factory("GeoService",function(LabelStorageService, ProgressBarService, WhosTalkingService,
    EnabledService, WhosOnlineService,GeoTesterService,GeoPositioningService, LeafletFactoryService) {
    const getMap = id => {
        console.log("getting map id",id,maps);
        return maps[id];
    }
    
    // We need the ability to get this map so we can tell it to invalidateSize when its container resizes
    let maps = {} // holds the various maps to be accessed by id
    const setup = (id,$scope) => {
        const ZOOM_TO_FIT_DELAY = 250;

        let map;
        let Leaflet;
        const minZoom = 2;

        const init = () => {
            GeoTesterService.testZoomLevels([2,3,4,5,6,7,8,9]).then(results=>{
                console.log("testing results",results);
                let maxSomeLocalZoom = minZoom-1;
                let i = minZoom;
                while(results[i]){
                    ++maxSomeLocalZoom;
                    ++i;
                }
                let maxFullLocalZoom = Math.min(maxSomeLocalZoom,6) // max out at 6 since we don't have 7 or higher fully fleshed out

                Leaflet = LeafletFactoryService.create({
                    // onlineBaseMode:EnabledService.onlineGeoBase(),
                    onlineSupplement:EnabledService.onlineGeo(),
                    mapID:id,
                    minZoom: minZoom,
                    maxFullLocalZoom: maxFullLocalZoom,
                    maxSomeLocalZoom: maxSomeLocalZoom,
                    maxZoom:EnabledService.onlineGeo()?20:9
                });

                map = Leaflet.init();
                maps[id] = map;
                Leaflet.onClick(handleMapClick);

                let promise = LabelStorageService.refreshAllClients();
                promise.then(()=>{
                    WhosTalkingService.obs.pullSuccess.on(highlightMarkersWithIDs);
                    $scope.$on("$destroy",()=>WhosTalkingService.obs.pullSuccess.off(highlightMarkersWithIDs));
                    setTimeout(Leaflet.zoomToFit,ZOOM_TO_FIT_DELAY);

                    GeoPositioningService.getIDs().forEach(addMarker); // initialize the tracked IDs
                    GeoPositioningService.ids.obs.add.on(addMarker); // show new clients when they start being tracked
                    GeoPositioningService.ids.obs.remove.on(removeMarker); // remove old clients when they stop being tracked
                })
                ProgressBarService.track(promise);
            })
        }

        const handleMapClick = () => {
            // do nothing
        }

        const highlightMarkersWithIDs = voiceActiveIDs => {
            // ids = [10027,10123]
            GeoPositioningService.getIDs().forEach(label=>Leaflet.setMarkerInactive(label.ID));
            Leaflet.setMarkersOnlineAndActive(getOnlineIDs(),voiceActiveIDs);
        }

        function getOnlineIDs(){ return GeoPositioningService.getIDs().filter(isOnline)}
        const isOnline = arg => {
            let id = arg
            if(arg.ID){
                id = arg.ID
            }
            return WhosOnlineService.get().includes(id);
        }

        function addMarker(id){
            let info = GeoPositioningService.get(id);
            console.log("adding marker",id,info);
            if(!info){
                console.error("no info found for marker with id",id);
                return;
            }
            let lat = info.GPS_LATITUDE || info.IP_LATITUDE;
            let lon = info.GPS_LONGITUDE || info.IP_LONGITUDE;
            let point = Geo.pointFromLatLon(lat,lon);
            Leaflet.addMarker(point,{origin:"label",label:LabelStorageService.getLabelSync(id),id:id});
        }
        function removeMarker(id){
            console.log("removing marker",id);
            Leaflet.removeMarker(id);
        }
        init();
    }
    return {
        setup,
        getMap
    }
})


app.factory("GeoTesterService",function($http,ResourceService){
    const testZoomLevels = (zoomLevels) => {
        let results = {}
        return new Promise((resolve,reject)=>{
            zoomLevels.map(zl=>{
                testZoomLevel(zl)
                .then(()=>{
                    results[zl] = true;
                })
                .catch(()=>{
                    results[zl] = false;
                })
                .finally(()=>{
                    let numResults = Object.keys(results).length;
                    if(numResults == zoomLevels.length){
                        resolve(results);
                    }
                })
            });
        })
    }
    const assumedFiles = {
        0: "image_0_0_0.png",
        1: "image_1_0_0.png",
        2: "image_2_0_0.png",
        3: "image_3_0_0.png",
        4: "image_4_0_0.png",
        5: "image_5_0_2.png",
        6: "image_6_18_25.png", // coast of NC
        7: "image_7_19_43.png",
        8: "image_8_38_91.png",
        9: "image_9_76_174.png"
    }
    const testZoomLevel = zoomLevel => {
        return $http({
            method:"get",
            url:ResourceService.getGeotileDirectory()+zoomLevel+"/" + assumedFiles[zoomLevel],
            data:{
                hasCustomErrorHandling:true // prevents showing a 404 error on screen
            }
        })
    }
    return {
        testZoomLevels
    }
})


app.factory("GeoFromDeviceService",function(LockService,EventService,EnabledService){
    const watchOptions = {
        enableHighAccuracy:true,
        maximumAge:5*60*1000, // 5 minutes
        timeout:5000 // 5 seconds
    }
    let watchHandle;
    let mostRecentLat;
    let mostRecentLon;
    let observer = new Util.Observer();
    EventService.on("myLabelLoaded",()=>{
        if(EnabledService.geoTrackMe()){
            start()
        }
        else{
            console.log("Geopositioning tracking not enabled");
        }
    });
    EventService.on("loggedOut",stop);
    function isEnabled(){
        try{
            return "geolocation" in navigator;
        }catch(e){
            return false;
        }
    }
    function update(){
        if(isEnabled()){
            navigator.geolocation.getCurrentPosition(function(position) {
                mostRecentLat = position.coords.latitude;
                mostRecentLon = position.coords.longitude;
            });
        }
        else{
            console.warn("tried to update geolocation from device, but it is not enabled");
        }
    }
    function watchAsPromise(){
        return new Promise((res,rej)=>{
            stopWatching();
            watchHandle = navigator.geolocation.watchPosition(res,rej,watchOptions);
        })
    }
    function watchHelper(){
        return watchAsPromise().then(watchSuccess,watchError);
    }
    function watchSuccess(position){
        mostRecentLat = position.coords.latitude;
        mostRecentLon = position.coords.longitude;
        observer.notify(getLatLon());
    }
    function watchError(e){
        console.error("geolocation not available",e)
    }


    function stopWatching(){
        if(watchHandle){
            navigator.geolocation.clearWatch(watchHandle);
            watchHandle = undefined;
        }
    }

    function getLatLon(){
        return {
            lat:mostRecentLat,
            lon:mostRecentLon
        }
    }
    function start(){console.log("Geopositioning tracking started");return watchHelper()}
    function stop(){return stopWatching()}
    return {
        isEnabled,
        getLatLon,
        get:getLatLon,
        on:observer.on.bind(observer),
        start,
        stop
    }
})


app.factory("GeoFromIPService",function($http,URLService,BrowserStorageService){
    let memo = Util.Map();
    /* Makes request to the API to get geo from IP. Also stores the result in the memo 
    Instead of failing, will return a promise that resolves with {lat:undefined,lon:undefined} */
    const realGet = ip => {
        console.log("attempting real get of geo from IP");
        let url = URLService.buildURL({host:"extreme-ip-lookup.com",path:"/json/"+ip,port:"scheme"})
        return $http({method:"get",url:url}).then(httpResult=>{
            let result = {
                lat:parseFloat(httpResult.data.lat) || undefined,
                lon:parseFloat(httpResult.data.lon) || undefined
            }
            memo.set(ip,result);
            return result;
        })
        .catch(e=>{
            console.warn("couldn't get geo from IP",e);
            let result = {
                lat:undefined,
                lon:undefined
            }
            memo.set(ip,result);
            return result;
        })
    }

    function getButCheckMemo(ip){
        let stored = memo.get(ip);
        if(stored){ return Promise.resolve(stored) }
        return realGet(ip);
    }
    return {
        get:getButCheckMemo
    }
})
/* global app */

/* global app $ Grid*/

app.directive('selectorchooser', function(SelectorChooserService,LabelStorageService) {
    return {
      scope: {
          ngModel: '=', // this links the scope within this directive to the scope outside of it
          filter: '='
      },
      restrict: 'E', // matches <selectorchooser> HTML elements only
      bindToController: {
        ngModel: '=',
        filter: '='
      },
      controller: function($scope) {
          /* Initialize the button label if we have used the dialog before */
          $scope.$watch("ngModel",()=>{
            $scope.buttonLabel = LabelStorageService.getLabelName($scope.ngModel) || "Choose Selector";
          })
          $scope.openDialog = () => {
              let options = {};
              if($scope.filter){
                  options.filter = $scope.filter;
              }
              SelectorChooserService.prompt(options).then(chosen=>{
                  console.log("chosen selector",chosen);
                  $scope.buttonLabel = LabelStorageService.getLabelName(chosen);
                  $scope.ngModel=chosen; // update the model
              })
          }
      },
      controllerAs: 'ctrl',
      templateUrl: Util.url('/directives/views/selectorchooser.html')
    }
});


app.factory("SelectorChooserService", function($uibModal,LabelStorageService,$q,AgeService,
    MyLabelService,WhichPageService,$injector){
    const defaultOptions = {
        title:"Choose a Selector",
        filter:(s)=>true,
        showSystemName:false,
        autoFocusSearch:true
    }
    const prompt = options => {
        options = Object.assign({},defaultOptions,options);
        let deferred = $q.defer();
        let getLabels; // function that returns a promise that resolves when the labels are ready
        if(WhichPageService.isSA()){
            getLabels = LabelStorageService.refreshAllLabels;
            if(AgeService.getAge('allLabels') < 20000){
                getLabels = LabelStorageService.getAllLabels;
            }
        }
        if(WhichPageService.isCP()){
            // injected here not to prevent circular ref, but so System Admin doesn't need SelectorsService
            let ids = $injector.get("SelectorsService").getRealSelectors().filter(s=>s.visible).map(s=>s.ID); 
            ids = ids.filter(options.filter);
            getLabels = ()=>$q.resolve(); // We have already loaded the selectors' labels
            options.autoFocusSearch = false;
            options.ids = ids;
        }
        getLabels().then(()=>deferred.resolve());

        let instance = $uibModal.open({
            controller: "SelectorChooserController",
            templateUrl: Util.url("/SystemAdmin/views/selectorChooser-dialog.html?v="+window.vcomBuildVersion),
            resolve: {
                "deferred": ()=>deferred,
                "options": () => options
            }
        })
        return instance.result;
    }

    return {
        prompt:prompt
    }
})


app.controller('SelectorChooserController',
function($scope, deferred, $timeout, options,
    $uibModalInstance, LabelStorageService, ProgressBarService) {

    let grid;
    const init = () => {
        /* deferred is passed in with a handle on a promise attached to a request to refresh all labels.
        This way, the refresh request can progress in parallel with the process of the modal opening.
        And we want this code to run once that api request completes, but they can start simultaneously */
        let promise = deferred.promise;
        ProgressBarService.track(promise);
        promise.then(getRows).then(setupGrid);
        $scope.title = options.title;
    }

    const setupGrid = rows => {
        grid = Grid($scope);
        let gridOptions = grid.getOptions();
        gridOptions.onCellDoubleClicked = submit; // submit on double click
        gridOptions.hideEmptyColumns = true;
        if(options.showSystemName)grid.showSystemName();
        grid.attachToElementBySelector("#selectorChooserGrid").then(()=>{
            grid.setRows(rows);
            $scope.search = () => grid.search($scope.searchText);
            if(gridOptions.autoFocusSearch){
                autoFocusSearchBox();
            }
            listenForEnter();
        })
        $scope.hasOneSelected = grid.hasOneSelected;
    }

    const getRows = () => {
        let getFn = LabelStorageService.getAllLabels;
        if(options.ids){
            getFn = ()=>LabelStorageService.getLabels(options.ids);
        }
        return getFn().then(labels=>{
            let rows = labels.map(label=>{
                return {
                    id:label.ID,
                    name:label.LABEL_NAME,
                    desc:label.DESCRIPTION,
                    LABEL_SYSTEM_NAME:label.LABEL_SYSTEM_NAME,
                    type:label.LABEL_TYPE_FULL_DETAIL
                }
            })
            return rows;
        })
    }
    const listenForEnter = () => {
        let handleKeydown = event => {
            if (event.which === 13) { // Enter is pressed
                if(grid.hasOneSelected()){
                    $("#selectorChooserGrid").off("keydown",handleKeydown);
                    /* If we immediately submit, then our Enter press also is interpreted by the page under the modal.
                    Which can result in an unwanted pressing of a button */
                    $timeout(submit,100);
                }
            }
        }
        $("#selectorChooserGrid").on("keydown",handleKeydown);
    }

    const autoFocusSearchBox = () => $("#selectorChooserSearchBox").focus();
    const submit = () => {
        $uibModalInstance.close(grid.getSelectedRows()[0].id); // resolve with the ID of the selected label       
    }

    $scope.ok = submit;
    $scope.cancel = function() {
        $uibModalInstance.dismiss();
    };

    /* We had trouble with immediately calling init, as this controller code runs before the modal has finished loading.
    This happens when the deferred that is passed in has already resolved, which corresponds to the situation
    where we don't need to refresh our understanding of all the labels as the data is pretty recent.
    Waiting this little bit of time (10 ms) seems to allow the modal to finish loading.
    I would have expected the call to grid.attachToElementBySelector, which in turn calls grid.waitForElement 
    to have made this not an issue, but something about modals gums it up a bit.
    */
    setTimeout(init,10);
});
/* global app Util angular $ Form URI */
app.factory('APIService', function($rootScope, $timeout, $http, $injector, AuthenticationService,
    $q, EnvService, ConnectionStatusService, OriginService, WhichPageService){

    const defaultNumRetries = 0;
    const timeBetweenRetries = 1000;
    let temporarilyDisabled = false;

    /* These API calls are expected while the user is logged out*/
    const expectToBeDisconnected = (method,api_path) => {
        if(method=="get" && api_path == "/ssl/status") return true; // we use this to check if HTTPS is supported (while we are logged out)
        if(method=="post" && api_path == "/authentication") return true;
        if(method=="get" && api_path == "/ssl/getcrt") return true;
        return false;
    }
    const ignoreErrors = url => {
        if(url.indexOf("/status/voiceactivity")){
            return true;
        }
    }
    /* Simplified way to make API calls */
    const makeAPICall = (method,api_path,data,additionalConfig) => {
        const userInfo = AuthenticationService.getUserInfo();
        if(temporarilyDisabled){
            return $q.reject("API Service disabled");
        }
        let origin;
        try{
            origin = OriginService.getOrigin();
        }
        catch(e){
            return $q.reject("Not connected to any server");
        }
        if(!origin)return $q.reject("Not connected to any server");
        const url = OriginService.getOrigin() + "/api/v1" + (api_path);
        const request = {
            "method": method,
            "url": url
        }
        Object.assign(request,additionalConfig);  // allow additional tweaking of request object
        if(!$injector.get("ConnectionService").isLoggedIn()){
            if(expectToBeDisconnected(method,api_path)){
                // carry on
                
            }
            else{
                // cancel the request
                console.warn("not issuing request because we are disconnected",method,api_path)
                return $q.reject("No reason to attempt this request while offline");
            }
        }
        else{
            if(request.headers == undefined) request.headers = {};
            if(WhichPageService.isCP()){
                request.headers.AUTHORIZATION = userInfo.AUTHORIZATION;
            }
            else{
                request.headers.AUTHORIZATION = userInfo.accessToken;
            }
        }
        if(data){
            request.data = data;
        }
        let promise = makeRequest(request)//$http(request);
        promise.then(ConnectionStatusService.observeSuccess)
        // .catch(retryIfNeeded)
        // .catch(ConnectionStatusService.observeFailure)
        return promise;
    };

    const makeRequest = config => {
        let request = ()=>$http(config);
        if(config.failRate){
            let r = Math.random();
            if(r<config.failRate){
                let delay = (config.delay || 0) + r*500;
                return new Promise((res,rej)=>{
                    $timeout(()=>{
                        console.log("REQUEST FAILED",config.url);
                        rej();
                    },delay)
                })
            }
        }
        if(config.delay){ // implement optional delay property to suspend the request
            console.log("delaying request...");
            request = ()=>$timeout(()=>{
                console.log("issuing request",request,"after delay of",config.delay);
                return $http(config);
            },config.delay);
        }
        return request()
        .catch(err=>{
            // console.log("request failed",err);
            if(err.status == -1 && !ignoreErrors(err.config.url)){ // misc error, consistent with timeout error
                ConnectionStatusService.observeFailure();
                if(err.config.retries == undefined)err.config.retries = defaultNumRetries;
                if(err.config.retries > 0){ // we have some retries left
                    --err.config.retries;
                    // console.log("retrying request",config);
                    return $timeout(()=>makeRequest(config),timeBetweenRetries);
                }
                else{
                    // we could only observe failures here if we want to count a retried call as just one failure
                    return $q.reject(err);//throw err; // if we don't throw an error, then this is interpreted as a success, so .then gets called with nothing
                }
            }
            else{ // we shouldn't retry
                return $q.reject(err);
                // throw err; // don't handle it!
            }
        })
    }

    const disable = () => temporarilyDisabled = true;
    const enable = () => temporarilyDisabled = false;

    return {
        enable,
        disable,
        get:          (path,     addl) => makeAPICall('get', path, addl),
        put:          (path,data,addl) => makeAPICall('put', path, data, addl),
        post:         (path,data,addl) => makeAPICall('post', path, data, addl),
        delete:       (path,     addl) => makeAPICall('delete', path,addl)
    };
});

app.factory("AutoLoginService",function(MirrorService){
    const repeatDuration = 5000;
    const register = (loginFn,scope) => {
        let repeater = Util.repeater(loginFn,repeatDuration);
        let outgoingTransform = local => local==="ON"?true:false;
        let incomingTransform = stored => stored?"ON":"OFF";
        repeater.destroyWithScope(scope);
        MirrorService.matchBrowserStorage(scope,"autoLoginState","autoLoginEnabled",outgoingTransform,incomingTransform,(l,s)=>{
        });
        scope.$watch("autoLoginState",newVal=>{
            if(newVal === "ON"){
                repeater.start();
            }
            else{
                repeater.stop();
            }
        })
    }
    return {
        register:register
    }
    
})
app.factory("BackgroundProcessService",function($q,WhosOnlineService,WhosTalkingService,WhosStreamingService,GeoFromDeviceService,
    AudioWebSocketService,FlowInstanceTracker,Kurento1to1,AudioSignalingService,MicrophoneService,CallNotificationService,
    GumService, SelfPublishSocketService){
    const CLIENT_CONNECTION_STATE_INTERVAL = 1000; // ms
    const ACTIVE_VOICE_INTERVAL = 500; // ms
    const TALLY_CLOCK_DURATION = 300; // ms between flashes of the tally
    const WHOS_STREAMING_INTERVAL = 2000; // ms

    const whosOnlineMonitor = Util.repeater(WhosOnlineService.pull,CLIENT_CONNECTION_STATE_INTERVAL);
    const whosTalkingMonitor = Util.repeater(WhosTalkingService.pull,ACTIVE_VOICE_INTERVAL);
    const whosStreamingMonitor = Util.repeater(WhosStreamingService.pull,WHOS_STREAMING_INTERVAL);
    const tallyClock = Util.repeater(() => $("#selectors").toggleClass("tallyClock"),TALLY_CLOCK_DURATION);

    const startAll = () => {
        console.log("start all background processes");
        return $q.all([
            whosTalkingMonitor.start(),
            whosStreamingMonitor.start(),
            tallyClock.start(),
            AudioSignalingService.connect(),
            CallNotificationService.start(),
            // GeoFromDeviceService.start(),
            whosOnlineMonitor.start()
        ]);
    }
    const stopAll = () => {
        console.log("stop all background processes")
        return $q.all([
            FlowInstanceTracker.clear(),
            AudioWebSocketService.close(),
            tallyClock.stop(),
            whosTalkingMonitor.stop(),
            whosStreamingMonitor.stop(),
            whosOnlineMonitor.stop(),
            AudioSignalingService.disconnect(),
            MicrophoneService.disable(),
            CallNotificationService.stop(),
            GeoFromDeviceService.stop(),
            GumService.stop(),
            SelfPublishSocketService.get().close(),
            Kurento1to1.clear()
        ]);
    }
    return {
        stopAll,
        startAll
    }
})
app.factory("MasterVolumeService",function(AudioPlayerService,BrowserStorageService){
    const BSS_NAME = "MasterVolume";
    const DEFAULT_MULTIPLIER = 1.0;
    let obs = new Util.Observable();
    let stored = loadVolumeMultiplier() || DEFAULT_MULTIPLIER;
    obs.on(applyVolumeMultiplier);
    obs.set(stored);

    function getPercent(){
        return obs.get() * 100;
    }
    function getMultiplier(){
        return obs.get();
    }
    function setPercent(percent){
        percent = Number(percent);
        if(percent < 0 || percent > 100){
            throw "Tried to set volume to "+percent + " percent";
        }
        setMultiplier(percent/100);
    }
    function setMultiplier(multiplier){
        multiplier = Number(multiplier);
        if(multiplier < 0 || multiplier > 1){
            throw "Tried to set volume multiplier to " + multiplier
        }
        obs.set(multiplier);
    }
    /* Actually change the volume and store our preference */
    function applyVolumeMultiplier(multiplier){
        storeVolumeMultiplier(multiplier);
        setAudioElementMultiplier(multiplier);
    }
    function setAudioElementMultiplier(multiplier){AudioPlayerService.getAudioElement().volume = multiplier;}
    function storeVolumeMultiplier(multiplier){BrowserStorageService.set(BSS_NAME,multiplier);}
    function loadVolumeMultiplier(){return BrowserStorageService.get(BSS_NAME);}


    return {
        getPercent,
        getMultiplier,
        setPercent,
        setMultiplier
    }
})
app.factory("VSABackgroundProcessService",function(SystemStatusService,KeepaliveService){
    let systemStatusRepeater = Util.repeater(SystemStatusService.pull,Util.getSystemStatusRefreshInterval());
    function startAll(){
        systemStatusRepeater.start();
        KeepaliveService.start();
    }
    function stopAll(){
        systemStatusRepeater.stop();
        KeepaliveService.stop();
    }
    return {
        startAll,
        stopAll
    }
})

app.factory("EventService",function($rootScope){
    const emit = (eventName,b)=> {
        console.log("event service emitting",eventName);
        let eventObject;
        if(typeof b === "string"){
            eventObject = {reason:b};
        }
        else{
            eventObject = b;
        }
        $rootScope.$emit(eventName,eventObject);
    }
    const on = (eventName,b) =>{
        $rootScope.$on(eventName,b);
    }
    return {
        emit,
        on
    }
})
app.factory("TroubleshootService",function(EventService,AudioSignalingService,$uibModal){
    let logs = {};
    let allIsWellObservable = new Util.Observable(true);
    let statusObj = {
        "audioPlayer":"uninitialized",
        "websocket":"unopened",
        "webrtcAudio":"uninitialized"
    };
    const initialize = topic => {
        if(logs[topic] === undefined){
            logs[topic] = "";
        }
    }
    const log = (topic,info)=>{
        // if(typeof info == "object"){
        //     info = JSON.stringify(info);
        // }
        initialize(topic);
        logs[topic] = logs[topic] + "\n" +
        new Date().toLocaleTimeString()+ ":" +JSON.stringify(info)
    }
    const getLogs = topic => {
        initialize(topic);
        return logs[topic];
    }
    const setStatus = (topic,status)=>{
        statusObj[topic] = status;
        allIsWellObservable.set(allIsWell());
    }
    const getStatus = (topic) => { 
        // console.log('getting status for',topic,statusObj[topic],status);
        return statusObj[topic];
    }

    const show = () => {
        $uibModal.open({
            controller: "WebsocketTroubleshootController",
                templateUrl:"views/websocketTroubleshoot.html?v="+window.vcomBuildVersion
        })
    }

    const allIsWell = () => {
        return getStatus("audioPlayer") == "initialized" &&
        getStatus("websocket") == "open" &&
        ["loading","success"].includes(getStatus("webrtcAudio"))
    }

    EventService.on("websocketClosed",(angularEvent,websocketEvent)=>{
        setStatus("websocket","closed");
        let e = websocketEvent;
        let loggedEvent = {
            code:e.code,
            reason:e.reason,
            type:e.type,
            url:Util.getPropertySafe(e,"target","url")
        }
        log("websocket",loggedEvent);
    })
    EventService.on("websocketOpened",()=>{
        console.log("websocket opened in event service");
        setStatus("websocket","open");
        log("websocket","websocket opened");
    })
    EventService.on("audioPlayerError",(angularEvent,audioEvent)=>{
        setStatus("audioPlayer","failed");
        log("webaudio",{
            code:"error",
            reason:audioEvent.reason
        })
    })
    EventService.on("audioPlayerInitialized",(angularEvent,audioEvent)=>{
        setStatus("audioPlayer","initialized");
        log("webaudio",{
            code:"intialized"
            // reason:audioEvent.reason
        })
    })
    AudioSignalingService.onStatusUpdate(newStatus=>{
        setStatus("webrtcAudio",newStatus);
    })

    return {
        show,
        log,
        allIsWell,
        onOverallStatusChange:allIsWellObservable.on.bind(allIsWellObservable),
        getLogs,
        setStatus,
        getStatus
    }
})

app.factory("StateService",function($state,$injector,WhichPageService){
    /* Keeps track of the current state but only if we use StateService and don't shortcut it by using $state directly
    the VSA uses $state directly, but the VCP exclusively uses StateService. */
    let current = "logon";
    const goTo = (stateName,toParams) => {
        current = stateName;
        return $state.go(stateName,toParams);
    }
    const goToWaitingRoom = () => goTo("waitingRoom");
    const goToLogon = () => goTo("logon");
    /* Going straight to the control panel without going through the waiting room prevents background processes
    from initializing properly, so here we force a path through the waiting room. */
    const goToControlPanel = () => { 
        if(current == "controlPanel"){
            return;
        }
        else if(current == "waitingRoom"){
            return goTo("controlPanel");
        }
        else{
            console.log("redirecting through waiting room");
            return goToWaitingRoom();
        }
    }
    const goHome = () => {
        if(WhichPageService.isCP()){ // VCP
            goToControlPanel();
        }
        else{
            goTo($injector.get("AuthenticationService").getHomeState()); // prevent circular dependency with $injector
        }
    }
    const getCurrentState = () => current
    /* Expose global variable of this function so that the Raspberry Pi version can detect where we are */
    window.vcomGetPageState = getCurrentState;
    return {
        goTo,
        goHome,
        getCurrentState,
        goToWaitingRoom,
        goToLogon,
        goToControlPanel
    }
})


app.factory("SystemStatusService",function(APIService,OnServerService){
    let resource = OnServerService.create({
        name:"System Status",
        readOnly:true,
        showLoader:false,
        initialValue:{},
        pull:()=> APIService.get('/status/system').then(result=>result.data[0])
    })
    return{
        obs:resource.obs,
        get:resource.get,
        getWithin:resource.getWithin,
        getOrPull:resource.getOrPull,
        pull:resource.pull
    }
});
app.factory("RestartSystemService",function(APIService){
    return {restartSystem:() => APIService.post('/action/systemrestart')}
});
app.factory("ForcedFailoverService",function(APIService){
    return {forcedFailover:() => APIService.post('/action/forcefailover')}
});
app.factory("WhosOnlineService",function(OnServerService,SelectorConnectionsService){
    let resource = OnServerService.create({
        pull: ()=> SelectorConnectionsService.getConnectedClients(),
        readOnly:true,
        initialValue:[],
        showLoader:false,
        name:"Whos Online"
    })
    return {
        obs:resource.obs,
        get:resource.get, // returns an array of IDs of selectors that are online
        pull:resource.pull,
        getWithin:resource.getWithin
    }
})
app.factory("WhosTalkingService",function(OnServerService,APIService){
    let resource = OnServerService.create({
        pull: ()=> APIService.get("/status/voiceactivity").then(result=>{
            return result.data.map(record=>record.ID);
        }),
        readOnly: true,
        initialValue:[],
        showLoader:false,
        name: "WhosTalking"
    })
    return {
        get:resource.get,
        pull:resource.pull,
        getWithin:resource.getWithin,
        obs:resource.obs
    }
})
/* 
   This service wraps existing API calls and provides a higher level interface to interact with that data.
   We can ask for data and get back either stored data or issue a new request depending on supplied criteria
   like how old that data can be. This prevents excess requests to the server and helps enforce the server as
   a single source of truth. 

   configuration:
    name
    readOnly
    writeOnly - unimplemented
    initialValue
    showLoader
    push
    pull
    get
    set - unimplemented
*/
app.factory("OnServerService",function($q,LockService, ProgressBarService,EventService){
    const defaultConfig = {
        name:"unnamed resource",
        readOnly:true,
        initialValue: undefined,
        showLoader:true,
        writeOnly:false,
        push:()=>{this.onPushFailure()},
        pull:()=>{this.onPullFailure()},
        // onPushSuccess:()=>{},
        onPushFailure:function(e){console.error("failed to push resource",this.name,e)},
        onPullFailure:function(e){console.error("failed to pull resource",this.name,e)}
    }
    const create = config => {
        config = Object.assign({},defaultConfig,config);

        let obs = new Util.Observers(["pullSuccess","pullFailure","pushSuccess","pushFailure"])

        let stored = config.initialValue;
        let lastUpdated;

        const set = newData => {
            stored = newData;
            lastUpdated = new Date().getTime();
        }
        let onPull = newData => {
            set(newData);
            let copy = get();
            obs.pullSuccess.notify(copy);
            return copy // return a copy
        }
        /* It makes sense to update our stored value to what we push to the server. However,
        we can't guarantee that the server then looks exactly like what we have pushed.
        We should make another pull after pushing to ensure that we are treating the server as the source of truth.*/
        let onPush = pushed => {
            set(pushed);
            obs.pushSuccess.notify();
        }

        /* Pushes new data, then pulls and the promise only resolves once all that is complete.
        */
        const pushAndPull = LockService.lock2(v => {
            return new Promise((res,rej)=>{
                push(v).then(pull,rej).then(res,rej)
            })
        });

        /* should we lock pushes to prevent simultaneous pushing? */
        let push = v => {
            return config.push(v).then(()=>onPush(v),obs.pushFailure.notify);
        }
        let lockedPull = LockService.lock2(()=>{
            let promise = config.pull();
            if(config.showLoader)ProgressBarService.track(promise);
            return promise;
        });
        let pull = ()=> lockedPull().then(onPull,config.onPullFailure);
        /* we use a copy here so we can 'get' the value and play with it without changing the value for the next 'get' */
        const get = () => {
            return Util.deepCopy(stored);
        }
        /* return a value if we have one stored, or pull from the server and return that */
        const getOrPull = () => {
            return getWithin();
        }
        const getWithin = maxAge => {
            if(lastUpdated === undefined){
                return pull();
            }
            if(maxAge === undefined){
                return $q.resolve(get());
            }
            let now = new Date().getTime();
            let age = now - lastUpdated;
            if(age <= maxAge){
                return $q.resolve(get());
            }
            else{
                return pull();
            }
        }
        const reset = () => {
            stored = config.initialValue;
            lastUpdated = undefined;
        }
        EventService.on("loggedOut",reset);

        return {
            push,
            pull,
            reset,
            obs,
            pushAndPull,
            get,
            getOrPull,
            getWithin
        }
    }

    return {
        create
    }
})

/**
 * API service for System Settings
 */
app.factory("SystemSettingsService", function(OnServerService,APIService) {
    const getList = list => APIService.get('/config/system?list='+list);
    let resource = OnServerService.create({
        pull: ()=> APIService.get('/config/system').then(result=>result.data),
        push: v => APIService.put('/config/system',v),
        readOnly:false,
        name:"System Settings"
    })
    return {
        get:resource.get,
        pull:resource.pull,
        pushAndPull:resource.pushAndPull,
        getOrPull:resource.getOrPull,
        resource,
        getList:getList
    };
});

app.factory("WhosStreamingService",function(APIService,OnServerService,MyLabelService){
    let resource = OnServerService.create({
        pull: ()=> APIService.get('/status/videostreaming',{hasCustomErrorHandling:true}).then(result=>{
            return result.data.map(i=>i.ID);
        }),
        name:"WhosStreaming",
        showLoader:false
    })

    const reportStream = (id,state) => {
        console.log("report stream",id,state);
        APIService.put('/status/videostreaming/'+id+'?'+(state?'ON':'OFF'),{hasCustomErrorHandling:true});
    }
    function reportMyStreamOff(){
        let id = MyLabelService.getID();
        if(id && id != "Unknown"){
            reportStream(id,false);
        }
    }
    function reportMyStreamOn(){
        let id = MyLabelService.getID();
        if(id && id != "Unknown"){
            reportStream(id,true);
        }
    }
    return {
        get:resource.get,
        pull:resource.pull,
        obs:resource.obs,
        reportMyStreamOn,
        reportMyStreamOff,
        reportOtherStreamOff:id=>reportStream(id,false)
    }
})

app.factory("EnvService", function(OriginService){
    const ENV_DEFAULTS = {
        knasPort:8443,
        enableChat:false,
        chatName:"Intracom"
    }
    let env = {};
    const has = propName => {
        if(env[propName] != undefined) return true;
        return false;
    }
    const get = propName => env[propName];
    const set = (propName,value) => {
        env[propName] = value;
        if(window.__env){
            window.__env[propName] = value;
        }
    }
    const load = () => {
        env = Object.assign({}, ENV_DEFAULTS, window.__env);
    }
    const clear = () => {
        Object.keys(env).forEach(key=>{
            delete env[key];
            delete window.__env[key];
        })
    }
    const reset = ()=>{
       let promise = Util.loadScript(OriginService.getOrigin()+"/Config/env.js");
       return promise.then(()=>{
            load();
       })
       .catch(clear);
    }
    const isDevelopment = () => {
        return get("environment") == "development";
    }
    load();

    return {
        requireAuthorization:()=>!get("dontRequireAuthorization"),
        redirectToHTTPS:()=>!get("dontRedirectToHTTPS"),
        environment:()=>get("environment"),
        isDevelopment:isDevelopment,
        has:has,
        set,
        reset,
        get:get
    }
})

/**
 * API service for RTS Telephone
 */
app.factory("TelephoneInterfaceService", function(APIService,PhoneBankService) {
    const getStatus = () =>          APIService.get("/tif/status");
    const getStatusShowDisabled =()=>APIService.get("/tif/status?show=disabled");
    const getLevelsFromServer = () =>APIService.get("/tif/levels");
    const call = (phoneID,number) => APIService.put("/tif/" + phoneID + "?call=" + number);
    const answer = phoneID =>        APIService.put('/tif/' + phoneID + '?answer');
    const disconnect = phoneID =>    APIService.put('/tif/' + phoneID + '?disconnect');
    const getClient = id =>          APIService.get("/config/clients/" + id);
    const putClient = (id, data) =>  APIService.put("/config/clients/" + id, data);
    const getClients = () =>         APIService.get("/config/clients");
    const getRTSFunctionTypes = id=> APIService.get("/config/clients/"+ id + "?list=TELEX_LABEL_CATEGORY");

    /* makes a GET call to get an up-to-date version of the client,
    then applies the changes, and PUTs it back to the server */
    const updateClient = (id,changes) =>   {
        return getClient(id).then(result=>{
            const client = result.data[0];
            if(client){
                const data = Object.assign({},client,changes);
                return putClient(id,data);
            }
        })
    }

    const getRandomLevels = () => {
        let r = new Array(8).fill('').map(()=>Math.random()*-50);
        return [
            {
                LINE_ID:1,
                AUDIO_RX_LEVEL_AVERAGE_IN_DECIBLES:r[0],
                AUDIO_RX_LEVEL_PEAK_IN_DECIBLES:r[1],
                AUDIO_TX_LEVEL_AVERAGE_IN_DECIBLES:r[2],
                AUDIO_TX_LEVEL_PEAK_IN_DECIBLES:r[3]
            },
            {
                LINE_ID:2,
                AUDIO_RX_LEVEL_AVERAGE_IN_DECIBLES:r[4],
                AUDIO_RX_LEVEL_PEAK_IN_DECIBLES:r[5],
                AUDIO_TX_LEVEL_AVERAGE_IN_DECIBLES:r[6],
                AUDIO_TX_LEVEL_PEAK_IN_DECIBLES:r[7]
            }
        ]
    }
    let showingRandomLevels = false;
    const toggleShowingRandomLevels = () => {
        showingRandomLevels = !showingRandomLevels;
    }
    const updateLevels = () => {
        getLevelsFromServer().then(result=>{
            if(showingRandomLevels){
                PhoneBankService.updateLevels(getRandomLevels())
            }
            else{
                if(result.data == null){
                    PhoneBankService.clearAllLevels();
                }
                else{
                    PhoneBankService.updateLevels(result.data);
                }
            }
        })
    }
    
    return {
        getStatus:getStatus,
        getStatusShowDisabled:getStatusShowDisabled,
        updateLevels:updateLevels,
        getLevelsFromServer:getLevelsFromServer,
        toggleShowingRandomLevels:toggleShowingRandomLevels,
        call:call,
        answer:answer,
        disconnect:disconnect,
        getClient:getClient,
        putClient:putClient,
        getClients:getClients,
        updateClient:updateClient,
        getRTSFunctionTypes:getRTSFunctionTypes
    };
});

app.factory("PhoneBankService",function(){
 /* 
        Keeps track of phones
        We store a list of phones and receive a list of phones from the server.
        We have to match up which of our phones and which ones from the server refer to the same phone.
        We use the ID of the phone to do this.
        If a phone goes offline, it will no longer be in the list we get from the server.
        So each time we request the list from the server, we mark all of our phones for potential deletion.
        If they aren't found to be included in the server's list then we delete them.
        If they are, then we update them to match the server's version.
    */
    /* Each phone looks like this:
    {
        ID:10000,
        recentlyChanged: false,
        recentlyChangedHandle: blabhalbhalbh,
        potentiallyUnused: false,
        config:{
            "LINE_ID":1,
            "LINE_NAME":"IFB #01",
            "LINE_NUMBER":"312-981-5090”,
            "LINE_STATE":"ON-HOOK"
        }
    }

    */
    const phones = {};
    let selectedPhone = undefined;
    const RECENT_CHANGE_TIME = 5000; // ms after a change where the change is still considered 'recent'
    let onPhoneChangeFns = [];
    let onPhoneConfigUpdateFns = [];

    const updateOnePhone = newPhone => {
        const id = newPhone.ID;
        if(phones[id]){
            const oldState = phones[id].LINE_STATE;
            const newState = newPhone.LINE_STATE;
            /* Update existing record of phone */
            if(oldState != newState && oldState != "DISABLED"){
                console.log("STATE CHANGE DETECTED",id);
                newPhone.recentlyChanged = true;
                if(phones[id].recentlyChangedHandle){
                    clearTimeout(phones[id].recentlyChangedHandle);
                }
                newPhone.recentlyChangedHandle = setTimeout(()=>{
                    // We can't say newPhone as that reference gets replaced every update
                    phones[id].recentlyChanged = false;
                    console.log("STATE CHANGE NO LONGER FRESH",id);
                },RECENT_CHANGE_TIME)//ms
            }
            // Copy over new parameters to the existing entry
            phones[id] = Object.assign(phones[id],newPhone);
            delete phones[id].potentiallyUnused;
        }
        else{
            /* Create new record of phone */
            phones[id] = newPhone;
            phones[id].config = {};
            console.log("creating new phone");
        }
    }
    const updatePhones = newPhones => {
        Object.keys(phones).forEach(id=>{
            phones[id].potentiallyUnused=true;
        })
        newPhones.forEach(updateOnePhone);
        Object.keys(phones).forEach(id=>{
            if(phones[id].potentiallyUnused){
                console.log("UNUSED PHONE REMAINING");
                removePhone(id);
            }
        })
    }
    const clearAllLevels = () => {
        const min = Util.getLevelDecibelRange().min;
        getAllPhones().forEach(phone=>{
            phone.levels = {
                rxAverage:  min,
                rxPeak:     min,
                txAverage:  min,
                txPeak:     min
            }
        })
    }
    const updateLevels = levels => {
        clearAllLevels();
        if(!levels)return;
        levels.forEach(info=>{
            let phone = getPhoneByLineID(info.LINE_ID);
            if(phone){
                phone.levels = {
                    rxAverage:  info.AUDIO_RX_LEVEL_AVERAGE_IN_DECIBLES,
                    rxPeak:     info.AUDIO_RX_LEVEL_PEAK_IN_DECIBLES,
                    txAverage:  info.AUDIO_TX_LEVEL_AVERAGE_IN_DECIBLES,
                    txPeak:     info.AUDIO_TX_LEVEL_PEAK_IN_DECIBLES
                }
            }
            else{
                console.warn("tried to set levels for a phone that isn't in the bank",info.LINE_ID);
            }
        })
    }
    const removePhone = id => {
        delete phones[id];
        if(selectedPhone.ID == id){
            deselectPhone();
        }
    }
    const getPhoneByLineID = lineID => {
        return Object.values(phones).find(phone=>phone.LINE_ID == lineID);
    }
    const phoneIsEnabled = phone => {
        return phone && phone.LINE_STATE !== "DISABLED";// && phone.LINE_STATE !== "ERROR";
    }
    const getEnabledPhones = () => {
        return Object.values(phones).filter(phoneIsEnabled);
    }
    const getAllPhones = () => {
        return Object.values(phones);
    }
    const setConfig = (id,newConfig) => {
        phones[id].config = Object.assign(phones[id].config,newConfig);
        onPhoneConfigUpdateFns.forEach(fn=>fn(selectedPhone));
    }
    const getConfig = id => {
        if(!id || id < 0){
            console.error("tried to get config of id ",id);
            return;
        }
        return phones[id].config;
    }

    /* Phone selection */
    const getSelectedPhone = () => {
        return selectedPhone;
    }
    const isSelectedPhone = phone => {
        return hasSelectedPhone() && phone && selectedPhone.ID == phone.ID;
    }
    const hasSelectedPhone = () => {
        return selectedPhone != undefined;
    }
    const deselectPhone = () => {
        onPhoneChangeFns.forEach(fn=>fn());
        selectedPhone = undefined;
    }
    const reallySelectPhone = (phone) => {
        onPhoneChangeFns.forEach(fn=>fn(phone));
        selectedPhone = phone;
    }
    const selectPhone = phone => {
        console.log("selecting phone",phone);
        if(isSelectedPhone(phone)){
            deselectPhone();
        }
        else{
            reallySelectPhone(phone);
        }        
    }

    const onPhoneChange = f => {
        onPhoneChangeFns.push(f);
    }
    const onPhoneConfigUpdated = f => {
        onPhoneConfigUpdateFns.push(f);
    }
    return({
        updatePhones:updatePhones,
        getEnabledPhones:getEnabledPhones,
        getAllPhones:getAllPhones,
        getConfig:getConfig,
        setConfig:setConfig,
        updateLevels:updateLevels,
        clearAllLevels:clearAllLevels,
        getSelectedPhone:getSelectedPhone,
        getPhoneByLineID:getPhoneByLineID,
        isSelectedPhone:isSelectedPhone,
        selectPhone:selectPhone,
        onPhoneChange:onPhoneChange,
        onPhoneConfigUpdated:onPhoneConfigUpdated
    })
})


/**
 * API service for VR Configuration
 */
app.factory("VirtualRealityConfigurationService", function(APIService){    
    const getConfig = () => APIService.get("/config/vr");
    const putConfig = newConfig => APIService.put("/config/vr",newConfig);
    return {
        getConfig:getConfig,
        putConfig:putConfig
    };
});

/**
 * Service for keeping a connection alive
 */
app.factory("KeepaliveService", ['APIService', '$interval', function(APIService, $interval) {
    const keepaliveInterval = Util.getKeepaliveInterval();
    const keepaliveFunction = () => {
        APIService.get('/status/system');
    }
    let handle;
    const start = () => {
        if(handle){
            stop();
        }
        keepaliveFunction();
        handle = $interval(keepaliveFunction,keepaliveInterval);
    }
    const stop = () => {
        if(handle){
            $interval.cancel(handle);
            handle = undefined;
        }
    }
    
    return {
        start:start,
        stop:stop
    };
}]);


app.factory("LabelsService", function(APIService) {
    const getAllLabels = () => APIService.get("/config/labels");
    const getLabel = (id,list) => {
        let url = '/config/labels';
        if (id   != undefined && id   != '') url += '/' + id; // optional id parameter
        if (list != undefined && list != '') url += '?list=' + list; // optional list parameter
        return APIService.get(url);
    };
    const putLabel = label => APIService.put("/config/labels/" + label.ID,label)
    const getLabels = IDs => {
        const path = "/config/labels/";
        const pathSuffix = IDs.join(",");
        return APIService.get(path+pathSuffix);
    }
    
    return {
        getAllLabels: getAllLabels,
        getLabel: getLabel,
        getLabels: getLabels,
        putLabel: putLabel
    }
});

app.factory("SystemListService", function(APIService){    
    return {
        getSystemList: () => APIService.get('/config/systemlist')
    }
});

app.factory("ClientConfigurationService", function(APIService,$q){
    /* Create, Read, Update, and Delete client configurations */
    const postClient = client => APIService.post('/config/clients',client);             // Create
    const getClient = (clientid, list) => {                                             // Read
        let url = '/config/clients/' + clientid;
        if(Util.exists(list)) url += '?list=' + list; // optional list parameter
        return APIService.get(url);
    }
    const putClient = client => APIService.put('/config/clients/' + client.ID,client);  // Update
    const deleteClient = client => APIService.delete('/config/clients/'+client.ID);     // Delete
    const getClientConfigurationList = () => APIService.get("/config/clients");
    const getClientSelectorsHotKeys = clientid => { 
        return getClient(clientid,"SELECTORS|HOT_KEY|KEY&list=SELECTORS|HOT_KEY|MODIFIER")
    }
    const setClientProperty = (id,propName,propValue) => {
        let update = {};
        update[propName] = propValue;
        return APIService.put('/config/clients/'+id,update);
    }
    const disableClient = client => setClientProperty(client.ID,"LABEL_DISABLED","ON");
    const enableClient = client => setClientProperty(client.ID,"LABEL_DISABLED","OFF");
    /* client.TEMPLATES array looks like this:
        [
            {
                "TYPE":"SELECTOR_ASSIGNMENTS",
                "ID":10203
            },
            {
                "TYPE":"AUDIO_SETTINGS",
                "ID":10203
            },
            {
                "TYPE":"OPTIONS",
                "ID":10203
            }
        ]
    */
    const unlinkTemplate = (id,type) => {
        return getClient(id).then(result=>{
            let client = result.data[0];
            if(!client.TEMPLATES) return $q.reject("no templates")
            let index = client.TEMPLATES.findIndex(entry=>entry.TYPE==type);
            if(index == -1) return $q.reject("no template of type "+type);
            /* Bit of idiosyncracy from the server. In order to convey that a template is unlinked,
            we have to send an object like {TYPE:"AUDIO_SETTINGS",ID:undefined} instead of just omitting that obj entirely */
            client.TEMPLATES[index].ID = undefined;
            // client.TEMPLATES.splice(index,1);
            return putClient(client);
        })
    }
    return {
        enableClient,
        disableClient,
        getClientConfigurationList: getClientConfigurationList,
        getClient: getClient,
        getClientSelectorsHotKeys: getClientSelectorsHotKeys,
        putClient: putClient,
        postClient: postClient,
        unlinkTemplate:unlinkTemplate,
        deleteClient: deleteClient,
    };
});

app.factory("ClientStatisticsService", (APIService) => {
    /*
     * 06/12/2017 KSG
     * Added Sort parameter
     */
    /* Get the CPU value to display on screen */
    const getCPUDisplay = function(stat) {
        const systemCPU = Util.getPropertySafe(stat,"SYSTEM_CPU_USAGE");
        const processCPU = Util.getPropertySafe(stat,"PROCESS_CPU_USAGE");
        let displayText = "";
        if(systemCPU){
            displayText += systemCPU+"%";
        }
        if(processCPU){
            displayText += ' ('+processCPU+"%)";
        }
        displayText = displayText.trim(); // remove extra space before processCPU if no systemCPU
        return displayText
    };

    const defaultParams = {
        showUnusedClients:      'OFF',
        showControlPanels:      'ON',
        showDeviceInterfaces:   'ON',
        showSIPDevices:         'ON'
    }
    function getClientStatistics(params) {
        params = Object.assign({},defaultParams,params);
        let hideThese = [];
        if(params.showUnusedClients == 'OFF')      hideThese.push('hide=unused');
        if(params.showControlPanels == 'OFF')      hideThese.push('hide=vcp');
        if(params.showDeviceInterfaces == 'OFF')   hideThese.push('hide=vdi');
        if(params.showSIPDevices == 'OFF')         hideThese.push('hide=sip');
        let queryString = Util.toQueryString(hideThese); // a string like ?hide=unused&hide=vcp
        let url = "/status/clientstatistics" + queryString;
        /* sort and order are additional parameters, but we can sort locally. */
        let promise = APIService.get(url);
        return promise.then(result=>{
            result.data.forEach(stat=>{
                stat.CPU_STRING = getCPUDisplay(stat);
            })
            return result;
        })
    }
    const resetStatisticsForClient = id => APIService.post("/action/clientstatisticsreset/" + id);
    const resetStatisticsForAll = () => APIService.post("/action/clientstatisticsreset");
    
    return {
        getClientStatistics: getClientStatistics,
        resetStatisticsForAll:resetStatisticsForAll,
        resetStatisticsForClient:resetStatisticsForClient
    };
});

app.factory("SIPRegistrationsService", function(APIService){
    /* Helper to extract the data we are actually interested in from the response which looks like this:
    {
        SIP_REGISTRATION:[
            {...},  
            {...}
        ]
    }
    No point in making the consumer of this API wade through the SIP_REGISTRATION property... */
    const get = url => APIService.get(url).then(result=>{
        let data = Util.getPropertySafe(result,"data","SIP_REGISTRATION");
        if(!data) data = [];
        return {data:data};
    })
    const getExternalSIPRegistrations = () => get('/status/sipregistrations?hide=internal')
    const getSIPRegistrations         = () => get('/status/sipregistrations');
    return {
        getSIPRegistrations: getSIPRegistrations,
        getExternalSIPRegistrations:getExternalSIPRegistrations
    };
});

app.factory("LicenseService", ['APIService', 'UploadService', function(APIService, UploadService) {
    const getSystemIdentificationCode = () => APIService.get('/license');
    getSystemIdentificationCode.description = 'Get System Identification Code.';
    const invalidateLicense = () => APIService.post('/action/invalidatelicense');
    invalidateLicense.description = 'Invalidate License File.';
    const uploadLicense = file => {
        return UploadService.uploadFile(file,'/license');
    }
    
    return {
        getSystemIdentificationCode: getSystemIdentificationCode,
        invalidateLicense: invalidateLicense,
        uploadLicense: uploadLicense
    }
}]);

app.factory("GroupConfigurationService", function(APIService,$q) {
    const getPartyLinesList = () => APIService.get('/config/partylines');
    const getFixedGroupsList = () => APIService.get('/config/fixedgroups');
    const getAllGroupsParallel = () => {
        let promises = [
            getPartyLinesList(),
            getFixedGroupsList()
        ]
        return $q.all(promises).then(multipleResults=>{
            let list = multipleResults[0].data;
            list = list.concat(multipleResults[1].data);
            return {
                data:list
            }
        });
    }
    const getAllGroupsSerial = () => {
        return getPartyLinesList().then(result=>{
            let pl = result.data;
            return getFixedGroupsList().then(result=>{
                let fg = result.data;
                let list = pl.concat(fg);
                return {data:list};
            })
        })
    }

    const putGroup = group => {
        if(group.LABEL_TYPE=="FIXED_GROUP")return putFixedGroup(group);
        else if(group.LABEL_TYPE=="PARTY_LINE")return putPartyLine(group);
        else console.error("can't putGroup for group with a bad LABEL_TYPE (should be FIXED_GROUP or PARTY_LINE",group);
        return Promise.reject("malformed group");
    }
    const deleteGroup = group => {
        if(group.LABEL_TYPE=="FIXED_GROUP")return deleteFixedGroup(group.ID);
        else if(group.LABEL_TYPE=="PARTY_LINE")return deletePartyLine(group.ID);
        else console.error("can't deleteGroup for group with a bad LABEL_TYPE (should be FIXED_GROUP or PARTY_LINE",group);
        return Promise.reject("malformed group");
    }
    const postGroup = group => {
        if(group.LABEL_TYPE=="FIXED_GROUP")return postFixedGroup(group);
        else if(group.LABEL_TYPE=="PARTY_LINE")return postPartyLine(group);
        else console.error("can't postGroup for group with a bad LABEL_TYPE (should be FIXED_GROUP or PARTY_LINE",group);
        return Promise.reject("malformed group");
    }


    const getPartyLine = id =>      APIService.get(     '/config/partylines/' +id);
    const getFixedGroup = id =>     APIService.get(     '/config/fixedgroups/'+id);
    const postFixedGroup = group => APIService.post(    '/config/fixedgroups',          group); // Add fixed group
    const postPartyLine = group =>  APIService.post(    '/config/partylines',           group); // Add party line
    const putFixedGroup = group =>  APIService.put(     '/config/fixedgroups/'+group.ID,group); // update
    const putPartyLine = group =>   APIService.put(     '/config/partylines/' +group.ID,group); // update
    const deleteFixedGroup = id =>  APIService.delete(  '/config/fixedgroups/'+id);
    const deletePartyLine = id =>   APIService.delete(  '/config/partylines/' +id);
    return {
        getPartyLinesList: getPartyLinesList,
        getFixedGroupsList: getFixedGroupsList,
        getAllGroups:getAllGroupsSerial,
        getFixedGroup: getFixedGroup,
        getPartyLine: getPartyLine,
        postFixedGroup: postFixedGroup,
        postPartyLine: postPartyLine,
        postGroup:postGroup,
        putFixedGroup: putFixedGroup,
        putPartyLine: putPartyLine,
        putGroup:putGroup,
        deleteFixedGroup: deleteFixedGroup,
        deletePartyLine: deletePartyLine,
        deleteGroup:deleteGroup
    };
});

app.factory("UserInterfaceSettingsService", function(APIService) {
    const getUserInterfaceSettings = () => APIService.get('/config/userinterface').then(result=>result.data);
    const putUserInterfaceSettings = settings => APIService.put('/config/userinterface',settings).then(result=>result.data);
    return {
        get: getUserInterfaceSettings,
        put: putUserInterfaceSettings
    };
});
app.factory("UIService",function(UserInterfaceSettingsService){
    const colorProperties = [
        "UI_TOP_BORDER_BACKGROUND_COLOR",
        "UI_BOTTOM_BORDER_BACKGROUND_COLOR",
        "UI_SELECTOR_WINDOW_BACKGROUND_COLOR",
        "UI_SELECTOR_NORMAL_TEXT_BACKGROUND_COLOR",
        "UI_SELECTOR_NORMAL_TEXT_FOREGROUND_COLOR",
        "UI_SELECTOR_ILLUMINATED_TEXT_BACKGROUND_COLOR",
        "UI_SELECTOR_ILLUMINATED_TEXT_FOREGROUND_COLOR",
        "UI_SELECTOR_DISABLED_TEXT_BACKGROUND_COLOR",
        "UI_SELECTOR_DISABLED_TEXT_FOREGROUND_COLOR"
    ]

    let loadSettings = () => {
        let promise = UserInterfaceSettingsService.get();
        promise.then(settings=>{
            colorProperties.forEach(prop=>{
                settings[prop] = convertColorFromServer(settings[prop]);
            })
            return settings;
        });
        return promise;
    }
    let saveSettings = newSettings => {
        newSettings = newSettings.map(convertColorToServer);
        return UserInterfaceSettingsService.put(newSettings);
    }

    /* colors from the server are stored as 0xAABBGGRR.
      We want to convert them to            #RRGGBB */
    const convertColorFromServer = color => {
        // first four characters are 0xAA
        let b = color.substring(4,6);
        let g = color.substring(6,8);
        let r = color.substring(8,10);
        return ["#",r,g,b].join(""); // join with no delimiter
    }
    /* convert from #RRGGBB to AABBGGRR (remove '#', add alpha) */
    const convertColorToServer = color => {
        // for now, the alpha will always be fully opaque (ff)
        let a = "ff";
        let r = color.substring(1,3);
        let g = color.substring(3,5);
        let b = color.substring(5,7);
        return [a,b,g,r].join(""); // join with no delimiter
    }
    return{
        loadSettings:loadSettings,
        saveSettings:saveSettings
    }
})

app.factory("LogFileService",function(APIService) {
    const constructURL = (base, reqStart, reqEnd, retrievedStart, retrievedEnd) => {
        let url = base;
        let allExist = ![reqStart,reqEnd,retrievedStart,retrievedEnd].includes(undefined)
        // should this be changed to ANY existing? rather than requiring that ALL exist?
        if(allExist) {
            let props = [];
            if(!isNaN(reqStart))  props.push('requested_start_position=' + reqStart);
            if(!isNaN(reqEnd))    props.push('requested_end_position='   + reqEnd);
            if(!isNaN(retrievedStart))  props.push('retrieved_start_position=' + retrievedStart);
            if(!isNaN(retrievedEnd))    props.push('retrieved_end_position='   + retrievedEnd);
            let queryString = Util.toQueryString(props);
            url += queryString;
        }
        return url;
    }

    function getActivityLogFile(reqStart, reqEnd, retrievedStart, retrievedEnd) {
        let urlBase = '/status/activitylog';
        let url = constructURL(urlBase,reqStart, reqEnd, retrievedStart, retrievedEnd);
        return APIService.get(url);
    }

    function getDebugLogFile(reqStart, reqEnd, retrievedStart, retrievedEnd){
        let urlBase = '/status/debuglog';
        let url = constructURL(urlBase,reqStart, reqEnd, retrievedStart, retrievedEnd);
        return APIService.get(url);
    }

    return {
        getActivityLogFile: getActivityLogFile,
        getDebugLogFile:getDebugLogFile
    };
});

/*
 * Service for uploading a file
 */
app.factory("UploadService",function(Upload,$http){

    const uploadDataURI = (dataURI,path,filename) => {
        /* special HTTP configuration for uploading */
        const additionalConfig = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        }
        const uploadURL = Util.getWebApiEndpoint(path);

        /* create formData to store the file to be uploaded */
        const blob = dataURItoBlob(dataURI);
        const fd = new FormData();
        fd.append("data", blob, filename);
        /* send post */
        return $http.post(uploadURL, fd, additionalConfig)
    }
    const dataURItoBlob = dataURI => {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);

        // separate out the mime component
        //var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        var mimeString = 'application/octet-stream';

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // write the ArrayBuffer to a blob, and you're done
        return new Blob([ab],{type: mimeString});
    }
    const uploadFile = (file,path,filename) => {
        if(file && path){
            if(filename === undefined){
                filename = file.name;
            }
            /* special HTTP configuration for uploading */
            const additionalConfig = {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }
            const uploadURL = Util.getWebApiEndpoint(path);
    
            /* post multipart request to server */
            return Upload.dataUrl(file, true).then( base64Url => {
                /* create formData to store the file to be uploaded */
                const blob = dataURItoBlob(base64Url);
                const fd = new FormData();
                fd.append("data", blob, filename);
                /* send post */
                return $http.post(uploadURL, fd, additionalConfig)
            });
        }
        return Promise.reject({statusText:"No file selected for upload."});
    }
    return ({
        uploadDataURI:uploadDataURI,
        uploadFile: uploadFile
    })
})
// \api\v1\action\dial\<ID1>?destination=<ID2>&sequence=<phone number>
app.factory("DialService",function(APIService,MyLabelService,$q,SelectorDescriberService,SelectorsService){

    const canDialLabel = label => {
        let isOnline = SelectorDescriberService.isOnline(label);
        let isDialable = SelectorDescriberService.isDialable(label);
        return isOnline && isDialable;
    }

    const getDialableList = () => {
        let selectorLabels = MyLabelService.getSelectorLabels();
        let dialableLabels = selectorLabels.filter(canDialLabel);
        let dialableList = dialableLabels.map(label=>{
            return {
                "label":label.SELECTOR_NAME,
                "value":label.ID /// should it be line id?
            }
        })
        return dialableList;
    }
    const dial = (id,number) => {
        const path = "/action/dial/"+MyLabelService.getID();

        if(id == undefined || number == undefined){
            return $q.reject("Error dialing. ID or line number not supplied. ID:",id,"Number:",number)
        }
        let promise = APIService.put(path+"?destination="+id+"&sequence="+number);
        promise.then(()=>{
            SelectorsService.listenOn(id);
            SelectorsService.talkOn(id);
        })
        return promise;
    }
    

    return {
        getDialableList,
        dial
    }
})

/* Service for transmitting an audio alert to another client or group */
app.factory("PlaySoundService",function(MyLabelService,APIService,LabelStorageService,SelectorDescriberService){
    let urlBase = "/action/playsound/";
    /* SelectorsService should have loaded full-detail labels for all of these labels
    So we can use getLabelSync */

    /* Uses the API to tell the server to send an alert to another client */
    const play = (filename,inputIDs)=>{
        let myID = MyLabelService.getID();
        inputIDs = Util.ensureArray(inputIDs);
        /* If any of the passed in IDs refer to groups, then I want to find all the IDs of members in those groups
        and put them in the ID list. NOTE: This sends the alert to all members of a group, AND to the group itself */
        let allMemberIDs = inputIDs.reduce((acc,currID)=>{
            let label = LabelStorageService.getLabelSync(currID);
            let theseMemberIDs = SelectorDescriberService.getMemberIDs(label);
            acc = acc.concat(theseMemberIDs);
            return acc;
        },[]);
        let ids = inputIDs.concat(allMemberIDs);
        ids = Util.removeDuplicates(ids); // don't try to send to multiple of the same client
        let idsString = ids.join(",");
        let url = urlBase+myID+"?resource="+filename+"&clients="+idsString
        return APIService.put(url);
    }

    const loadedSoundMap = Util.Map();
    /* plays a sound locally */
    function playWav(filename){
        let loaded = loadedSoundMap.get(filename);
        if(loaded){
            loaded.play();
        }
        else{
            var audio = new Audio(filename);
            loadedSoundMap.set(filename,audio);
            audio.play();
        }
    }

    return {
        play,
        playWav
    }
})

/*
 * Service for getting names of resources as well as uploading them.
 * Resources are images and sound files
 */
app.factory("ResourceService", function(APIService, UploadService, OriginService){
    const imagesPath = "/resources?type=IMAGE_FILES";
    const graphicsPath = "/resources?type=GRAPHICS_FILES";
    const soundsPath = "/resources?type=SOUND_FILES";
    /* These functions prevent consumers of this Resource Service from having to know details of the API.*/
    const itemToName = item => item.RESOURCE_NAME;
    const resultToNames = result => Util.ensureArray(Util.getPropertySafe(result,"data","RESOURCES")).map(itemToName);
    /* Instead of returning an object with a 'data' attribute with a 'RESOURCES' attribute 
        with an array of objects with a 'RESOURCE_NAME' property, these just return an array of names */
    const getGraphicsFileNames = () => APIService.get(graphicsPath).then(resultToNames);
    const getSoundFileNames = () => APIService.get(soundsPath).then(resultToNames);
    const getImageFileNames = () => APIService.get(imagesPath).then(resultToNames);

    const upload = (file,path,filename) => {
        let promise = UploadService.uploadFile(file,path,filename);
        return promise;
    }
    const putGraphicsFile = file => upload(file,graphicsPath);
    const putSoundFile = file => upload(file,soundsPath);
    const putImageFile = file => upload(file,imagesPath);
    const putLogoFile = file => upload(file,imagesPath,"Logo.png");

    const deleteSoundFile = filename => {
        if(filename === undefined){
            return console.error("can't delete filename",filename);
        }
        let path = soundsPath+"&filename="+filename;
        console.log("deleting sound file",filename);
        return APIService.delete(path)
    }
    const deleteImageFile = filename => {
        if(filename === undefined){
            return console.error("can't delete image with filename",filename);
        }
        let path = imagesPath+"&filename="+filename;
        console.log("deleting image file",filename);
        return APIService.delete(path)
    }

    const getAvatarDirectory = () => "/avatars/";
    const getAvatarURL = name => OriginService.getOrigin() + getAvatarDirectory() + name;

    const getGeotileDirectory = () => "/geotiles/";
    const getGeotile = name => getGeotileDirectory()+name;

    return{
        getGraphicsFileNames:getGraphicsFileNames,
        getSoundFileNames:getSoundFileNames,
        getImageFileNames:getImageFileNames,
        deleteSoundFile,
        deleteImageFile,
        getAvatarURL,
        getGeotile,
        getGeotileDirectory,
        putImageFile:putImageFile,
        putLogoFile:putLogoFile,
        putGraphicsFile:putGraphicsFile,
        putSoundFile:putSoundFile
    }
})

app.factory("BrandingService",function(EnvService, LogoService, OriginService){

    let logoSrc;

    const DEFAULTS = {
        companyName: "",
        productName: "VCOM",
        logo:"",
        favicon:"none",
    }

    const HARDCODED_RTS_HOST = "rtsvlink.online";
    const HARDCODED_RTS = {
        companyName:"RTS",
        productName:"VLink",
        favicon:"/img/RTS_AppIcon_144pt.png",
        logo:"/img/RTS_Logo_Black_160_50.png",
        splashVSAImageURL:"/img/rtsvsa.png",
        splashVCPImageURL:"/img/no\ logo.jpg",
        splashHomeLink:"http://www.rtsvlink.com",
    }
    /* In order to support rtsvlink.online and intracomsystems.net using the same
    resources including same env.js file */
    function isOnRTSVLINK(){
        return location.hostname == HARDCODED_RTS_HOST;
    }

    const loadFromBrandingjs = () => {
        /* fall back on Branding.js file if there's no env.js */
        try{
            let branding = Branding.getAppBranding();
            DEFAULTS.productName = branding.productName;
            DEFAULTS.logo = branding.productLogo;
            DEFAULTS.companyName = branding.companyName;
        }catch(e){

        }
    }
    const resetBrandingjs = () => {
        // Branding.js has Branding declared as a const, so we cannot ever overwrite it ...
        let promise = Util.loadScript(OriginService.getOrigin()+"/js/Branding.js");
       return promise.then(()=>{
            loadFromBrandingjs();
       })
    }

    const getProductName = () => {
        if(isOnRTSVLINK())return HARDCODED_RTS.productName;
        return EnvService.get("productName") || DEFAULTS.productName;
    }
    const getCompanyName = () => {
        if(isOnRTSVLINK())return HARDCODED_RTS.companyName;
        return EnvService.get("companyName") || DEFAULTS.companyName;
    }
    const getLogo = () => {
        return logoSrc;
    }
    const getFavicon = () => {
        if(isOnRTSVLINK())return HARDCODED_RTS.favicon;
        return EnvService.get("favicon") || DEFAULTS.favicon;
    }
    const applyFavicon = () => {
        console.log("applying favicon",getFavicon());
        $("#dynamicFavicon").remove();
        $("head").append($('<link id="dynamicFavicon" rel="icon" href="'+getFavicon()+'" type="image/x-icon"/>'))
    }
    const applyTitle = () => {
        document.title = getCompanyName() + " - " + getProductName();
    }
    const refreshLogo = () => {
        logoSrc = ""; // while we are loading / checking the custom logo, show no logo.
        if(isOnRTSVLINK()){
            logoSrc = HARDCODED_RTS.logo;
            return Promise.resolve();
        }
        return LogoService.refreshSrc().then(src=>logoSrc=src).catch(()=>{
            // custom logo checked and found to not exist
            let env = EnvService.get("logo");
            let def = DEFAULTS.logo;
            console.log("no custom logo",env,def);
            if(env){
                console.log("env!");
                logoSrc = env;
            }
            else{
                // no env.js defined logo
                console.log("default!");
                logoSrc = def;
            }
        })
    }
    const getSplashVSAImageURL = () => {
        if(isOnRTSVLINK())return HARDCODED_RTS.splashVSAImageURL;
        return EnvService.get("splashVSAImageURL");
    }
    const getSplashVCPImageURL = () => {
        if(isOnRTSVLINK())return HARDCODED_RTS.splashVCPImageURL;
        return EnvService.get("splashVCPImageURL");
    }
    const getSplashHomeLink = () => {
        if(isOnRTSVLINK())return HARDCODED_RTS.splashHomeLink;
        return EnvService.get("splashHomeLink");
    }
    return {
        getProductName,
        getCompanyName,
        getFavicon,
        applyFavicon,
        applyTitle,
        refreshLogo,
        resetBrandingjs,
        getSplashHomeLink,
        getSplashVCPImageURL,
        getSplashVSAImageURL,
        getLogo
    }
})

app.factory("ImageTesterService",function(){
    const test = src => {
        return new Promise((resolve,reject)=>{
            $.ajax({
                url:src,
                type:'GET',
                error: function(e){
                    console.log("img failed to be loaded",e);
                    reject();
                },
                success: function(s){
                    // In lieu of being able to delete the Logo.png file, we upload a file with the value "hello"
                    // so check for that here. A file with the value of "hello" is not a valid image, in fact!
                    if(s=="hello"){
                        reject();
                    }
                    else{
                        resolve();
                    }
                    
                }
            });
        })
    }
    return {
        test
    }
})

app.factory("LogoService",function(UploadService,ResourceService,ImageTesterService){
    let src;
    const put = file => {
        UploadService.uploadFile(file,"/resources?type=IMAGE_FILES","Logo.png")
        .then(refreshSrc);
    }
    const restoreDefault = () => {
        // By making this an invalid image, the BrandingService should go to the next source for a logo, env.js
        let path = "/resources?type=IMAGE_FILES";
        // I would like to delete the Logo.png file, but instead here we take 'aGVsbG8=' which is just 'hello' in base64 and upload that
        UploadService.uploadDataURI("data:text/plain;base64,aGVsbG8=",path,"Logo.png")
        .then(refreshSrc);
    }
    const refreshSrc = () => {
        src=undefined;
        let customSrc = ResourceService.getAvatarURL("Logo.png");
        return ImageTesterService.test(customSrc).then(()=>{
            src=customSrc;
            return src;
        })
    }
    const getSrc = () => {
        return src;
    }
    return {
        restoreDefault,
        refreshSrc,
        getSrc,
        put
    }
})
/*
 * Component to show the user the progress of an action
 * Interfacing with this component is done through two attributes,
 * 'status', and 'message', shown below.
 */
app.directive('progressBar', function() {
    return {
      scope: {},
      restrict: 'E', // matches <progress-bar> HTML elements only
      bindToController: {
        status: '=', // Either 'pending', 'success', or 'failure', determines what is displayed
        message: '=', // A string displayed in addition to the normal Success or Failure message
      },
      controller: function() {
      },
      controllerAs: 'ctrl',
      template: `
        <div>
            <div ng-show="ctrl.status=='pending'"><img src="../img/loader2.gif"></div>
            <div ng-show="ctrl.status=='success'" style="color:green;"><i class="fa fa-check" aria-hidden="true"></i> Success. {{ctrl.message}}</div>
            <pre ng-show="ctrl.status=='failure'" style="color:red;"  ><i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Error. {{ctrl.message}}</pre>
        </div>
      `
    }
});

/* Handles much of the shared logic between the large and small vu meters.
Specifically handles the process of taking data from the server and averaging and reinterpreting it before
it is converted from decibels to display by the controllers of each of those directives */
app.factory("VUBrain",function(){
    const minDB = -61;
    const maxDB = 0;
    const unsuitableData = d => {
        return !Number.isFinite(d) || // applies to the 'null' that we get often from the server, as well as a general catch-all
         d == -100; // applies to the '-100' that we get from the server that seems more like an error message to me.
    }
    const makeBrain = (()=>{
        const vuq = (()=>{
            let data = [];
            const add = newData => {
                if(unsuitableData(newData)) return; // when we get bad data, just ignore it and wait for next API call
                data.push(newData);
                if(data.length > 3) data.shift();
            }
            const avg = () => {
                if(data.length < 1) return minDB;
                let sum = data.reduce((acc,curr)=>{
                    return acc+curr;
                },0)
                let realAvg = sum / data.length; // implement averaging over 3 most recent db levels
                let retVal = Util.clamp(realAvg,minDB,maxDB); // implement sticking to top and bottom of meter
                return retVal;
            }
            return {
                add:add,
                avg:avg
            }
        })
        let stored = [vuq(),vuq(),vuq(),vuq()];
        const store = (rxa,txa,rxp,txp) => {
            stored[0].add(rxa);
            stored[1].add(txa);
            stored[2].add(rxp);
            stored[3].add(txp);
        }
        const get = () => {
            return [stored[0].avg(),stored[1].avg(),stored[2].avg(),stored[3].avg()];
        }
        return{
            get:get,
            store:store
        }
    })

    return{
        makeBrain:makeBrain
    }
})

app.directive('largevumeter',function(){
    return{
        scope:{},
        restrict:'E', // matches <largevumeter> HTML elements only
        bindToController: {
            rxa: "=",
            rxp: "=",
            txa: "=",
            txp: "="
        },
        controller:function($scope,VUBrain){
            const ctrl = $scope.ctrl;
            const minDB = -61;
            const maxDB = 0;
            const widthDB = maxDB-minDB;

            const toBars = (dB,firstBorder,secondBorder) => {
                if(dB == undefined) return [];
                dB = Math.floor(dB);
                let numBars = Math.max(dB - minDB,0);
                let bars = new Array(numBars).fill(0).map((_,index)=>{
                    let dB = index+minDB;
                    return {
                        height: toHeight(dB),
                        color: dB < firstBorder? "green": dB < secondBorder ? "yellow" : "red"
                    }
                })
                return bars
            }
            const toHeight = dB => {
                let percentage = 100*(dB-minDB)/widthDB;
                return percentage;
            }
            ctrl.barClass = bar => {
                return "vumeter-bar vumeter-bar-"+bar.color;
            }
            const varNames = ['rxa','txa','rxp','txp'];
            let brain = VUBrain.makeBrain();

            let timer = Util.Timer().repeatEvery(1000).destroyWith($scope);

            /* values should be an array of decibel values for rxa, txa, rxp, and txp */
            const recordValues = values => {
                brain.store(...values);
                let dbValues = brain.get();
                ctrl.rbars = toBars(  dbValues[0],-20,-10);
                ctrl.tbars = toBars(  dbValues[1],-20,-10);
                ctrl.rxPeak = toHeight(dbValues[2]);
                ctrl.txPeak = toHeight(dbValues[3]);
            }
            const recordSilence = () => recordValues([minDB,minDB,minDB,minDB]);
            timer.then(recordSilence);
            $scope.$watchGroup(varNames.map(n=>"ctrl."+n),(newValues)=>{
                recordValues(newValues);
                timer.reset();
            })
        },
        controllerAs:"ctrl",
        template:`
        <div class="vumeter-container-large">
            <img class="vumeter-background" src="../img/vumeter-background-60.png">

            <div class="vumeter-label-large">
                Rx
            </div>
            <div class="vumeter-label-large vumeter-tx">
                Tx
            </div>
            <div ng-repeat="bar in ctrl.rbars" style="bottom:{{bar.height}}%" class="vumeter-bar-square vumeter-bar-{{bar.color}}"></div>
            <div ng-repeat="bar in ctrl.tbars" style="bottom:{{bar.height}}%" class="vumeter-bar-square vumeter-bar-{{bar.color}} vumeter-tx"></div>

            <div class="vumeter-peak" style="bottom:{{ctrl.rxPeak}}%"></div>
            <div class="vumeter-tx vumeter-peak" style="bottom:{{ctrl.txPeak}}%"></div>
        </div>
        `
    }
})

app.directive('smallvumeter',function(){
    return{
        scope:{},
        restrict:'E', // matches <smallvumeter> HTML elements only
        bindToController: {
            rxa: "=",
            rxp: "=",
            txa: "=",
            txp: "="
        },
        controller:function($scope,VUBrain){
            const ctrl = $scope.ctrl;
            const minDB = -61;
            const maxDB = 0;
            const widthDB = maxDB-minDB;

            const toBars = (dB,firstBorder,secondBorder) => {
                if(dB < minDB) return [];
                dB = Math.floor(dB);
                let height = toHeight(dB); //ranges from 0 to 100% roughly
                let firstBorderHeight = toHeight(firstBorder);
                let secondBorderHeight = toHeight(secondBorder);
                let greenHeight = Math.min(height,firstBorderHeight);
                let yellowHeight = Math.min(height,secondBorderHeight);
                yellowHeight = yellowHeight>firstBorderHeight?yellowHeight-firstBorderHeight:0;
                let redHeight = height > secondBorderHeight? height-secondBorderHeight:0;

                return {
                    r:redHeight,
                    y:yellowHeight,
                    g:greenHeight
                }
                
            }
            const toHeight = dB => {
                if(dB == undefined) return -100;
                let percentage = 100*(dB-minDB)/widthDB;
                return percentage;
            }
            ctrl.barClass = bar => {
                return "vumeter-bar vumeter-bar-"+bar.color;
            }
            const varNames = ['rxa','txa','rxp','txp'];
            let brain = VUBrain.makeBrain();
            let timer = Util.Timer().repeatEvery(1000).destroyWith($scope);
            
            const recordSilence = () => recordValues([minDB,minDB,minDB,minDB]);
            timer.then(recordSilence);
            const recordValues = newValues => {
                brain.store(...newValues);
                let dbValues = brain.get();
                
                let bars = toBars(dbValues[0],-20,-10);
                ctrl.rg = bars.g;
                ctrl.ry = bars.y;
                ctrl.rr = bars.r;
                bars = toBars(dbValues[1],-20,-10);
                ctrl.tg = bars.g;
                ctrl.ty = bars.y;
                ctrl.tr = bars.r;
                ctrl.rxPeak = toHeight(dbValues[2]);
                ctrl.txPeak = toHeight(dbValues[3]);
            }
            
            $scope.$watchGroup(varNames.map(n=>"ctrl."+n),newValues=>{
                recordValues(newValues);
                timer.reset();
            })
        },
        controllerAs:"ctrl",
        template:`
        <div class="vumeter-container">
            <img class="vumeter-background" src="../img/vumeter-background-60.png">

            <div class="vumeter-label">
                R/T
            </div>
            <div class="vumeter-bar vumeter-bar-green"              style="height:{{ctrl.rg}}%"></div>
            <div class="vumeter-bar vumeter-bar-yellow"             style="height:{{ctrl.ry}}%"></div>
            <div class="vumeter-bar vumeter-bar-red"                style="height:{{ctrl.rr}}%"></div>
            <div class="vumeter-bar vumeter-bar-green vumeter-tx"   style="height:{{ctrl.tg}}%"></div>
            <div class="vumeter-bar vumeter-bar-yellow vumeter-tx"  style="height:{{ctrl.ty}}%"></div>
            <div class="vumeter-bar vumeter-bar-red vumeter-tx"     style="height:{{ctrl.tr}}%"></div>

            <div class="vumeter-peak" style="bottom:{{ctrl.rxPeak}}%"></div>
            <div class="vumeter-tx vumeter-peak" style="bottom:{{ctrl.txPeak}}%"></div>
        </div>
        `
    }
})

/*
 * Helper component for the uploader component below.
 * Angular struggles with <input type='file'> elements and doesn't recognize onChange events.
 * So this directive helps work around that.
 */
app.directive('customOnChange', function() {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        var onChangeHandler = scope.$eval(attrs.customOnChange);
        element.on('change', onChangeHandler);
        element.on('$destroy', function() {
          element.off();
        });
      }
    };
  });
/*
 * Component to help upload a file.
 * Contains the input element, upload button, and progress bar.
 * Interfacing with this component is done through three attributes,
 * the uploadFn, onSuccess, and onFailure functions described below
 */
app.directive('uploader', function($q){
    return {
        scope: {},
        restrict: 'E', // matches <uploader> HTML elements only
        bindToController: {
          uploadFn: '=', // two-way binding with upload-fn attribute on <uploader> element
          onSuccess: '=', // on-success attribute
          onFailure: '=' // on-failure attribute
        },
        controller: function($scope) {
            const ctrl = $scope.ctrl;
            ctrl.randID = Util.generateUUID();
            const getJQueryElement = () => $("#"+ctrl.randID);
            const getFile = () => getJQueryElement()[0].files[0];

            ctrl.uploadFile = () => {
                const file = getFile();
                console.log("file",file);
                ctrl.status = "pending";
                $q.when(ctrl.uploadFn(file)).then(()=>{
                    ctrl.status = "success";
                    ctrl.onSuccess(file.name);
                })
                .catch(err=>{
                    ctrl.status = "failure";
                    ctrl.errMessage = err.statusText;
                    ctrl.onFailure(err)
                })
            }
            /* Clear the <input> element, so choosing the same file twice will still trigger a 'change' event twice */
            ctrl.clear = () => {
                getJQueryElement().val('');
            }
        },
        controllerAs: 'ctrl',
        template: `
        <div>
            <input type="file"
                id="{{ctrl.randID}}"
                custom-on-change="ctrl.uploadFile"
                ng-click="ctrl.clear()"
                ng-touchstart="ctrl.clear()">
        </div>
        <div>
            <progress-bar
                status="ctrl.status"
                message="ctrl.errMessage">
            </progress-bar>
        </div>
        `
      }
})

app.factory("ModalConfirmer",function($uibModal){

    const defaultOptions = {
        focusOkay: true,
        message: "Are you sure?",
        okayLabel: "Okay",
        cancelLabel:"Cancel",
        title:"Confirm",
        static: false, // set to true if you want to prevent modal from closing if we click outside of it
        messageClass:""
    }
    const prompt = options => {
        options = Object.assign({},defaultOptions,options);
        // let modalInstance = $uibModal.open(
        let modalSettings = {
            controller: 'ModalConfirmerController',
            /* The template is written here instead of in its own file so that
            it is delivered to the browser before it is needed rather than right when it is needed.
            This means that if the browser loses connection to the server, then this modalconfirmer
            can still pop up and ask them about failing over. Otherwise, if it were in its own file,
            the browser would attempt to load that .html file after the server was down, resulting in
            a failed request and no popup for the user! */
            template:`
            <div class="modal-header">
                <h3>{{title}}</h3>
            </div>
            <div class="modal-body">
                <p class="{{messageClass}}"> {{message}} </p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-warning" ng-click="cancel()">{{cancelLabel}}</button>
                <button id="modalConfirmerOkayButton" class="btn btn-primary" data-ng-click="ok()">{{okayLabel}}</button>
            </div>
            `,
            // templateUrl: 'views/modalConfirmer.html',
            // backdrop: 'static', // Without this, the user can click outside the box to close it
            // size: 'sm',
            resolve: {
                options: () => options
            }
        };
        if(options.static){
            modalSettings.backdrop = 'static';
        }
        let modalInstance = $uibModal.open(modalSettings);
        return modalInstance.result;
    }

    return ({
        prompt:prompt
    })
})
/* Set notifications that look like the following:
    {
        message:'text that shows up',
        type: 'danger' or 'warning'
    }
*/
app.factory("NotificationService",function(EnabledService){

    let queue = Util.MyStack();
    let topicMap = {};
    const setTopic = (topic,id) => topicMap[topic] = id;
    const clearTopic = topic => {
        if(topicMap[topic] != undefined){
            remove(topicMap[topic]); // clear the notification
            topicMap[topic] = undefined; // and remove it from topicMap
        }
    }

    const defaultProperties = {
        message:"Default Notification.",
        type:"warning",
        showOnMobile:true,
        duration:4000, // ms
        permanent:false
    }

    const add = notification => {
        notification = Object.assign({},defaultProperties,notification);
        console.log("notification",notification);

        /* Don't show certain notifications on a thin screen */
        if(!EnabledService.wideScreen() && !notification.showOnMobile){
            return;
        }

        let id;
        if(notification.permanent){
            id = queue.push(notification); 
        }
        else{
            id = queue.temporaryPush(notification,notification.duration);
        }
        /* Replace an existing notification with the same topic, if such a notification exists */
        if(notification.topic){
            clearTopic(notification.topic); // close any preexisting notification with this topic
            setTopic(notification.topic,id); // and record this topic
        }
        /* Add clearFn property which will be called when user clicks the 'x' on the notification */
        notification.clearFn = () => {
            queue.popID(id);
        }
        return id;
    }
    const remove = queue.popID;

    const get = queue.get;
    const clear = queue.clear;

    return ({
        add:add,
        remove:remove,
        get:get,
        clear:clear,
        clearTopic:clearTopic
    })
});

app.factory("ProgressBarService",function(){
    let stack = Util.MyStack();
    let spinnerStatus = "hidden";

    const init = () => {
        stack.push("hidden");
    }

    const get = () => stack.top();

    const defaultOptions = {
        showBar:true,
        showSuccess:false,
        showFailure:true,
        successMessage:"Success!",
        successDuration: 3000, // ms
        failureDuration: 3000 // ms
    }
    const trackSpinner = promise => {
        spinnerStatus = "show";
        promise.finally(()=>{
            spinnerStatus = "hidden";
        })
    }
    const track = (promise,options) => {
        options = Object.assign({},defaultOptions,options);
        let id = stack.push("pending");
        promise.then(()=>{
            if(options.showSuccess){
                stack.temporaryPush("success",options.successDuration)
            }
        })
        .catch(()=>{
            if(options.showFailure){
                stack.temporaryPush("failure",options.failureDuration)
            }
        })
        .finally(()=>{
            stack.popID(id);
        })
        return promise;
    }

    const getSpinner = () => spinnerStatus;
    const isVisible = () => get() != "hidden";
    const clear = () => {
        stack.clear();
        stack.push("hidden");
    }
    init();
    return {
        get:get,
        clear,
        getSpinner:getSpinner,
        trackSpinner:trackSpinner,
        isVisible:isVisible,
        track:track
    }
})
app.factory("OSKService",function(BrowserStorageService,PlatformService){
    const SUPPORTED_INPUT_TYPES = ["text","password","textarea"];
    // BrowserStorageService.set("configuration-osk",false)
    let obs = new Util.Observable();
    let keyboardCreator = new Util.Timer().repeatEvery(500).then(turnEveryInputIntoVirtualKeyboard);
    let keyboardDestroyer = new Util.Timer().repeatEvery(500).then(removeVirtualKeyboards);

    obs.on(newValue=>{
        if(newValue){
            keyboardCreator.start();
            keyboardDestroyer.stop();
        }
        else{
            removeVirtualKeyboards();
            keyboardCreator.stop();
            keyboardDestroyer.start();
        }
        BrowserStorageService.set("configuration-osk",newValue);
    })

    if(BrowserStorageService.get("configuration-osk") || PlatformService.isPi()){
        enable();
    }


    function turnEveryInputIntoVirtualKeyboard(){
        $("input").each(function(){
            let i = $(this);
            if(SUPPORTED_INPUT_TYPES.includes(i.attr("type"))){
                if(!i.getkeyboard()){
                    // console.warn("actually making new keyboard");
    
                    i.keyboard({
                        autoAccept:true,
                        usePreview: false
                    })
                }
                else{
                    i.getkeyboard().openOn = true;
                }
            }
            
        })
    }
    function removeVirtualKeyboards(){
        $("input").each(function(){
            let i = $(this);
            if(SUPPORTED_INPUT_TYPES.includes(i.attr("type"))){
                if(i.getkeyboard()){
                    // console.warn("actually closing keyboard");
                    i.getkeyboard().destroy();
                }
            }
        });
    }


    function toggle(){
        return obs.toggle();
    }
    function enable(){
        // console.warn("enabling keyboards");
        return obs.set(true);
    }
    function disable(){
        // console.warn("disabling keyboards");
        return obs.set(false);
    }
    function get(){
        return obs.get();
    }


    return {
        toggle,
        enable,
        disable,
        get,
    }
})


app.factory("MirrorService",function(BrowserStorageService){

    const matchBrowserStorage = (scope,varName,browserStorageName,outgoingTransform,incomingTransform,listener) => {
        /* Apply defaults */
        if(!browserStorageName) browserStorageName = varName;
        if(!outgoingTransform) outgoingTransform = a => a; // no transform
        if(!incomingTransform) incomingTransform = b => b; // no transform
        if(!listener)           listener = () => {}; // no fn

        /* Watch scope */
        scope.$watch(varName,function(newValue,oldValue){
            if(newValue !== oldValue){
                let transformed = outgoingTransform(newValue);
                console.log("setting Browser storage",browserStorageName,transformed);
                BrowserStorageService.set(browserStorageName,transformed);
                listener(newValue,transformed);
            }
        })
        /* Watch Browser Storage */
        BrowserStorageService.subscribe(browserStorageName,newVal=>{
            let transformed = incomingTransform(newVal);
            console.log("setting $scope.",varName,transformed);
            scope[varName] = transformed;
            listener(transformed,newVal)
        })

        /* Initialize */
        let stored = BrowserStorageService.get(browserStorageName)
        let transformed = incomingTransform(stored);
        scope[varName] = transformed;
        listener(scope[varName],stored);

    }
    return {
        matchBrowserStorage:matchBrowserStorage
    }
})

app.factory("BrowserStorageService",function($window,$injector){
    const VERSION = "1.0.3";
    let subscribers = {}

    let AndroidService;
    let onAndroid = false;
    try{
        AndroidService = $injector.get("AndroidService");
        onAndroid = AndroidService && AndroidService.isEnabled();
    }
    catch(e){
        // We haven't included AndroidService (likely for the splash 'app')
    }

    const init = () => {
        let prevVersion = get("BSS_VERSION");
        if(VERSION != prevVersion){
            $window.sessionStorage.clear();
            $window.localStorage.clear();
        }
        // set("BSS_VERSION",VERSION); // removed because of an issue preventing BSS_VERSION from being stored
        setLocal("BSS_VERSION",VERSION);
    }
    const subscribe = (key,fn) => {
        if(!subscribers[key]){
            subscribers[key] = [];
        }
        subscribers[key].push(fn);
    }
    const publish = (key,val) => {
        if(subscribers[key]){
            subscribers[key].forEach(f=>f(val))
        }
    }
    // const simpleGet = key => $window.sessionStorage[key];
    const simpleGet = key => {
        let s = $window.sessionStorage[key];
        if(s == undefined){ // changed from === because of an issue preventing BSS_VERSION from being stored
            return $window.localStorage[key];
        }
        return s;
    }
    const simpleGetType = key => simpleGet(key+"__type__");
    const simpleSet = (key,val) => $window.sessionStorage[key] = val;
    const simpleSetLocal = (key,val) => $window.localStorage[key] = val;
    const simpleSetType = (key,val) => simpleSet(key+"__type__",val);
    const simpleSetLocalType = (key,val) => simpleSetLocal(key+"__type__",val);
    const simpleRemove = key => {
        $window.sessionStorage.removeItem(key);
        $window.sessionStorage.removeItem(key+"__type__");
        $window.localStorage.removeItem(key);
        $window.localStorage.removeItem(key+"__type__");
    }

    const set = (key,val) => {
        if(onAndroid)return AndroidService.setPreference(key,val);
        const type = typeof(val);
        if(type=="object"){
            set(key,JSON.stringify(val));
            simpleSetType(key,"object");
        }
        else if(type=="boolean"){
            simpleSetType(key,"boolean");
            simpleSet(key,val);
        }
        else if(val === undefined){
            remove(key);
        }
        else{
            if(get(key) === val){
                return; // already set that way, no need to do anything
            }
            publish(key,val);
            simpleSet(key,val);
        }
    }
    /* sets to Local Storage instead of Session Storage (lasts through browser closing and reopening) */
    const setLocal = (key,val) => {
        if(onAndroid)return AndroidService.setPreference(key,val);
        const type = typeof(val);
        if(type=="object"){
            setLocal(key,JSON.stringify(val));
            simpleSetLocalType(key,"object");
        }
        else if(type=="boolean"){
            simpleSetLocalType(key,"boolean");
            simpleSetLocal(key,val);
        }
        else if(val === undefined){
            remove(key);
        }
        else{
            if(get(key) === val){
                return; // already set that way, no need to do anything
            }
            publish(key,val);
            simpleSetLocal(key,val);
        }
    }
    const get = key => {
        if(onAndroid)return AndroidService.getPreference(key);
        const type = simpleGetType(key);
        const val = simpleGet(key);
        if(type == "object" && val && val != "undefined"){
            return JSON.parse(val);
        }
        else if(type=="boolean"){
            return val === "true";
        }
        else{
            return val;
        }
    }
    const has = key => {
        return get(key) != undefined;
    }
    const remove = key => {
        simpleRemove(key);
    }
    init();

    return {
        set:set,
        setLocal,
        get:get,
        has:has,
        subscribe:subscribe,
        remove:remove
    }
})

/* Hacky way to figure out whether we're on VSA or VCP */
app.factory("WhichPageService",function($injector){
    let curPage = "Unset page";
    const set = page => curPage = page;
    const get = () => curPage;
    const isCP = () => curPage == "Control Panel";
    const isSA = () => curPage == "System Admin";
    const isOnDemoServer = () => Util.urlContains("intracomsystems.net") || Util.urlContains("74.208.201.229");
    const isPublicDemo = () => {
        let port = $injector.get("URLService").getCurrentPort();
        return isOnDemoServer() &&  (port == "80" || port == "443");
    }
    return {
        get:get,
        isCP:isCP,
        isSA:isSA,
        isOnDemoServer,
        isPublicDemo,
        set:set
    }
})

/* Service to facilitate redirection to HTTPS when logging in, if appropriate */
app.factory("RedirectService", function(APIService,URLService,EnvService,$window,$q,WhichPageService){
    const httpsDisabled = () => EnvService.get("dontRedirectToHTTPS");
    const onHTTPS = () => URLService.isConnectionSecured();
    const shouldRedirect = () => {
        return !httpsDisabled() && !onHTTPS();
    }
    const doesServerSupportHTTPS = () => {
        return APIService.get("/ssl/status");
    }

    const redirectToHTTPSLoginOnPort = port => {
        let path;
        /* for some reason, with URL like 'http://localhost:3000/ControlPanel/index.html#/'
        $location.path() gives us '/', so I have resorted to a hacky way of determining what path to redirect to */
        let url = new URI();
        if(WhichPageService.isSA()){
            path = "/SystemAdmin/";
        }
        else if(WhichPageService.isCP()){
            path = "/ControlPanel/";
        }
        url.path(path);
        url.port(port);
        url.protocol("https");
        console.log("redirect to ",url.toString());
        $window.location.href = url.toString(); // send us there

    }

    const redirectToFailoverServer = (origin,userName,password) => {
        var credentials = "";
        if(!password){
            password = "";
        }
        if(userName){
            credentials = "?name="+userName+"&pass="+password;
        }
        const path = Util.url("/SystemAdmin/#/");
        const url = origin + path + credentials;
        $window.location.href = url;
    }

    const redirectToHTTPSIfNecessary = () => {
        const deferred = $q.defer();
        if(shouldRedirect()){
            doesServerSupportHTTPS().then(result=>{
                if(result.data.HTTPS == "ENABLED"){
                    // Redirect to HTTPS
                    deferred.resolve("redirecting to HTTPS");
                    const port = result.data.HTTPS_PORT;
                    redirectToHTTPSLoginOnPort(port);
                }
            })
            .catch((e)=>{
                console.error(e);
                deferred.reject("redirect not supported. "+e);
            })
        }
        else{
            deferred.reject("redirect not necessary");
        }
        return deferred.promise;
    }

    const determineIfHTTPSIsSupported = () => {
        return new Promise((resolve,reject)=>{
            if(httpsDisabled()){
                reject("https disabled in env.js");
            }
            else{
                doesServerSupportHTTPS().then(result=>{
                    if(result.data.HTTPS == "ENABLED"){
                        // Redirect to HTTPS
                        const port = result.data.HTTPS_PORT;
                        // redirectToHTTPSLoginOnPort(port);
                        resolve(port);
                    }
                    else{
                        reject("redirect not enabled by server");
                    }
                })
                .catch(()=>{
                    reject("request to see if redirect is enabled failed");
                })
            }
        });
    }



    return {
        determineIfHTTPSIsSupported,
        redirectToHTTPSIfNecessary:redirectToHTTPSIfNecessary,
        redirectToFailoverServer:redirectToFailoverServer
    }
});

app.factory("DownloadService",function(){
    function download(config) {
        let filename = config.filename;
        let text = config.text;
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }


      function downloadBlob(config){
            let blob = config.blob;
            let filename = config.filename;
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
      }

      return {
          downloadBlob,
          download
      }
})
app.factory("CertificateService",function(SSLService,DownloadService,ModalConfirmer,BrowserStorageService,ProgressBarService,EnvService){

    const promptDownloadCertificate = () => {
        let message = `Would you like to download the SSL certificate for this site? \n
        Downloading and installing the SSL certificate will prevent you from needing to tell your browser to trust this page.`;
        ModalConfirmer.prompt({
            title:"Download SSL Certificate?",
            message:message,
            static:true, // don't go away if we click outside
            okayLabel:"Download"
        }).then(downloadCertificate).catch(()=>{
            BrowserStorageService.set("declined-download-certificate-prompt",true);
        })
    }

    const downloadCertificate = () => {
        let p = SSLService.getCRT();
        ProgressBarService.track(p);
        p.then(text=>{
            DownloadService.download({
                filename:"vcp.crt",
                text:text
            })
        });
        return p;
    }
    /* Only show the download prompt if...
    enabled in env.js
    page is not secure
    user has not declined the prompt previously
    and a certificate exists */
    const promptDownloadIfNecessary = () => {
        if(!EnvService.get("promptDownloadCertificate")) return;
        if(window.isSecureContext) return;
        if(BrowserStorageService.get("declined-download-certificate-prompt")) return;
        SSLService.getCRT().then(crt=>{
            if(!crt || crt.length < 2) return;
            promptDownloadCertificate();
        })
    }

    return {
        downloadCertificate,
        promptDownloadIfNecessary,
    }
})
app.factory("SSLService",function(APIService){

    /* 
    This function creates a Certificate Signing Request that may be sent to a Certificate Authority.
    This must be the first SSL function called.
    The files created will be used to process the Generate CRT, Get CSR, and Get Key requests.
    Example payload:
    {
        "PASSWORD":”intracom",
        "COMMON_NAME":"www.intracomsystems.net",
        "ORGANIZATION":"Intracom Systems, LLC",
        "COUNNTRY":"US",
        "STATE_REGION":"California"
    }
    */
    const generateCSR = payload => {
        return APIService.post("/ssl/generatecsr",payload)
    }

    /* This function creates and installs a Self-Signed Certificate, used for testing. */
    const generateCRT = () => {
        return APIService.post("/ssl/generatecrt");
    }

    /*
    This function installs a Signed Certificate received from a Certificate Authority.
    It must be passed as plain text.  For example:
    -----BEGIN CERTIFICATE-----
    MIIDLjCCAhYCCQCArQcnar2jgjANBgkqhkiG9w0BAQsFADBZMRUwEwYDVQQDDAwx
    :
    :
    AtZOk+IuK9/XHvPkW/gsaojySR0hjYchoNG8xw/yholFGsP+QkBcDZ5mSgss5RBg
    Nm0=
    -----END CERTIFICATE-----
    */
    const installCRT = certificate => {
        return APIService.post("/ssl/installcrt",certificate)
    }

    /*
    This function returns the status of the SSL interface.  For example:
    {
    "HTTPS":"ENABLED",
    "WSS":"ENABLED"
    }
    */
    const getStatus = () => APIService.get("/ssl/status");

    /*
    This function returns the CSR created by generatecsr.
    It is returned as plain text that may be copied and sent to a Certificate Authority for signing 
    For Example:
    -----BEGIN CERTIFICATE REQUEST-----
    MIICnjCCAYYCAQAwWTEVMBMGA1UEAwwMMTkyLjE2OC4xLjY0MR4wHAYDVQQKDBVJ
    :
    :
    NLC7pEoYgEjHc/BTy5ZUQWxB8w0tttF+UEEEsJTtVbDjkgVlQEbO2iUvh35EvJo4
    WK8=
    -----END CERTIFICATE REQUEST-----
    */
    /* hasCustomErrorHandling prevents this request's failure from triggering normal error handling (ugly popup) */
    const getCSR = () => APIService.get("/ssl/getcsr",{hasCustomErrorHandling:true}).then(result=>result.data); 

    /*
    This function returns the private key created by generatecsr. For example:
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEArYWhqg5AWohn2IRZVZvOx+GJAy8jov1xsNtTUJPbgyoCpaie
    :
    :
    8/f1NGvrIN/m+q767DDZdWE5CzSQHCVhdrYwfRm9zoSxORz4eZn+pQ==
    -----END RSA PRIVATE KEY-----
    */
    const getPrivateKey = () => APIService.get("/ssl/getprivatekey",{hasCustomErrorHandling:true}).then(result=>result.data);

    const installPrivateKey = newKey => APIService.post("/ssl/installprivatekey",newKey)

    /* This function returns the certificate that was either
    uploaded with installcrt or generated with generatecrt. */
    const getCRT = () => APIService.get("/ssl/getcrt",{hasCustomErrorHandling:true}).then(result=>result.data);
    // .then(success=>{console.log("success getting CRT",success)})
    // .catch(error => {console.log("error getting CRT",error)});

    return {
        generateCSR:generateCSR,
        generateCRT:generateCRT,
        installCRT:installCRT,
        installPrivateKey,
        getStatus:getStatus,
        getCSR:getCSR,
        getPrivateKey:getPrivateKey,
        getCRT:getCRT
    }
})

app.factory("SortService",function(){
    const clientSort = Sorting.clientComparator;

    return {
        clientSort:clientSort
    }
})
/* Prevents an asynchronous function from being called again while it is already in progress */
app.factory("LockService",function($q){
    /* Input: a function that returns a promise (asynchronous)
    Output: also a function that returns a promise.
    arguments input into this new function will be funneled to the original input function
    calling this locked version of the fn will result in a rejection if a previous invocation has not completed
    */
    const lock = fn => {
        let locked = false;
        const unlock = () => locked = false;
        return function(){
            if(locked){
                console.log("Could not call function",fn,"as it is locked!");
                return $q.reject("Function locked");
            }
            locked = true;
            let promise = fn.apply(null,arguments);
            promise.finally(unlock);
            return promise;
        }
    }
    /* Prevent duplicate calls to the same fn
    returns a promise of fn in progress so you can ignore whether the fn
    has or hasn't already been called and .then or .catch it */
    const lock2 = fn => {
        let ongoingPromise;
        let locked = false;
        const unlock = () => {
            locked = false;
            ongoingPromise = undefined;
        }
        return function(){
            if(locked){
                return ongoingPromise;
            }
            locked = true;
            let promise = fn.apply(null,arguments);
            promise.finally(unlock);
            ongoingPromise = promise;
            return promise;
        }
    }
    /* Prevent duplicate calls to the same fn
    Excess calls get queued up and processed after a delay */
    const queueLock = (fn,processDelay) => {
        if(processDelay === undefined) processDelay = 200; // ms
        let fQueue = [];
        let intervalHandle;

        const startProcessing = () => {
            if(!intervalHandle)intervalHandle = setInterval(processNextFile,processDelay);
        }
        const processNextFile = () => {
            if(fQueue.length > 0){
                let fn = fQueue.shift();
                fn();
            }
            else{
                // queue is empty, done processing
                clearInterval(intervalHandle);
                intervalHandle = undefined;
            }
        }
        return function(){
            let loadedFn = () => fn(...arguments); 
            fQueue.push(loadedFn);
            if(!intervalHandle)startProcessing();
        }
    }

    const queueLockAsync = fn => {
        let queue = [];
        let handle;

        const loadNext = () => {
            if(queue.length > 0){
                let nextFn = queue.shift();
                handle = nextFn();
                handle.finally(loadNext);
            }
            else{
                handle = undefined;
            }
        }
        
        return function(){
            let loadedFn = () => fn(...arguments);
            queue.push(loadedFn);
            if(handle === undefined){
                loadNext();
            }
        }
    }
    return{
        lock2:lock2,
        queueLock:queueLock,
        queueLockAsync:queueLockAsync,
        lock:lock
    }
})
/* Keeps track of the age of different data that are retrieved from the server */
app.factory("AgeService",function(){
    const times = {};
    /* Establishes this moment as the time that a named piece of data was updated */
    const recordUpdate = varName => {
        times[varName] = new Date().getTime();
    }
    /* Returns the age in ms of a named piece of data */
    const getAge = varName => {
        let now = new Date().getTime();
        let then = times[varName];
        if(then == undefined){
            return Infinity; // if it has never been updated, return infinity. should work for checking if age < a certain number
        }
        return now-then; // time in ms
    }
    /* Invalidates the age of a named piece of data, so that its age is infinite  
        useful if we make a change to the data and want to make note that our data is possibly out of date */
    const invalidate = varName => {
        times[varName] = undefined;
    }
    return {
        getAge:getAge,
        invalidate:invalidate,
        recordUpdate:recordUpdate
    }
})

app.factory("LabelStorageService",function($q,LabelsService,SelectorDescriberService,SortService, WhichPageService,
    ClientConfigurationService,GroupConfigurationService, AgeService, AuthenticationService, LockService){

    let labelMap;
    clear(); // initializes empty label map
    
    function clear(){
        labelMap = Util.Map();
    }
    function clearAllClients(){
        labelMap.asArray().forEach(label=>{
            if(isClient(label)){
                labelMap.set(label.ID,undefined);
            }
        })
    }

    const isClient = SelectorDescriberService.isClient;

    function getAllClientsSync(){return labelMap.asArray().filter(isClient).sort(SortService.clientSort);}
    function getAllLabelsSync(){return labelMap.asArray().sort(SortService.clientSort)}
    /* mid-level details */
    const refreshAllLabels = () => {
        if(WhichPageService.isCP()) return refreshAllLabelsVCP();
        return refreshAllLabelsVSA();
    }
    const refreshAllLabelsVSA = () => {
        return LabelsService.getAllLabels().then(result=>{
            labelMap.clear();
            result.data.forEach(label=>{
                let id = label.ID;
                let decorated = SelectorDescriberService.decorateLabel(label);
                labelMap.set(id,decorated);
            })
            AgeService.recordUpdate("allLabels");
            AgeService.recordUpdate("allClients"); // since this is a subset of allLabels
            // and update the clients as well
            console.log("all labels refreshed");
            return getAllLabelsSync();
        });
    };
    const refreshAllLabelsVCP = () => {
        return LabelsService.getAllLabels().then(result=>{
            labelMap.clear();
            result.data.forEach(label=>{
                let id = label.ID;
                let decorated = SelectorDescriberService.decorateLabel(label);
                labelMap.set(id,decorated);
            })
            AgeService.recordUpdate("allLabels");
            AgeService.recordUpdate("allClients"); // since this is a subset of allLabels
            // and update the clients as well
            console.log("all labels refreshed");
            return refreshMyLabel().then(getAllLabelsSync); // added refreshMyLabel so we don't overwrite our full-detail label with mid-details
        });
    };
    /* mid-level details */
    function refreshAllClientsVCP(){
        return ClientConfigurationService.getClientConfigurationList().then(result=>{
            let clients = result.data;
            SelectorDescriberService.decorateClients(clients);
            // Any *clients* that are stored in labelMap but not reported by ClientConfigurationService have been deleted!
            clearAllClients();
            clients.forEach(client=>{
                labelMap.set(client.ID,client);
            })  
            AgeService.recordUpdate("allClients");
            console.log("all clients refreshed");
            return refreshMyLabel().then(getAllClientsSync); // added refreshMyLabel so we don't overwrite our full-detail label with mid-details
        })
    }
    function refreshAllClientsVSA(){
        return ClientConfigurationService.getClientConfigurationList().then(result=>{
            let clients = result.data;
            SelectorDescriberService.decorateClients(clients);
            // Any *clients* that are stored in labelMap but not reported by ClientConfigurationService have been deleted!
            clearAllClients();
            clients.forEach(client=>{
                labelMap.set(client.ID,client);
            })  
            AgeService.recordUpdate("allClients");
            console.log("all clients refreshed");
            return getAllClientsSync();
        })
    }
    const refreshAllClients = () => {
        if(WhichPageService.isCP()) return refreshAllClientsVCP();
        return refreshAllClientsVSA();
    };
    /* full-level details. Refreshes just a chosen subset of labels*/
    const refreshFullDetailLabels = ids => {
        console.log("refreshing full detail labels",ids);
        if(ids.length == 0){
            return $q.resolve([]);
        }
        return LabelsService.getLabels(ids).then(result=>{
            result.data.forEach(label=>{
                SelectorDescriberService.decorateLabel(label);
                labelMap.set(label.ID,label);
            })
            return Util.ensureArray(labelMap.get(ids));
        })
    };
    /* full-level detail. Refreshes ALL clients rather than a subset */
    const refreshFullDetailClients = () => {
        // first we get all clients so we can be sure we know the IDs of all the clients
        let promise = refreshAllClients().then(clients=>{
            clearAllClients();
            let clientIDs = clients.map(client=>client.ID);
            // then we get each one individually
            return LabelsService.getLabels(clientIDs).then(result=>{
                result.data.forEach(client=>{
                    labelMap.set(client.ID,SelectorDescriberService.decorateLabel(client));
                })
                AgeService.recordUpdate("fullDetailClients");
                return getAllClientsSync();
            })
        })
        return promise;
    }
    

    const getLabelName = id => {
        let found = labelMap.get(id);//.find(label=>label.ID == id);
        if(found){
            return found.LABEL_NAME;
        }
        else{
            return '';//"not found";
        }
    }

    const getLabel = targetID => $q.resolve(labelMap.get(targetID));
    const getLabelSync = targetID => labelMap.get(targetID);
    /* This sync method returns undefined if we haven't gotten user info yet */
    const getMyLabelSync = () => { 
        let info = AuthenticationService.getUserInfo();
        if(info){
            return getLabelSync(info.LABEL_ID);
        }
        else{
            return undefined;
        }
    }
    const refreshLabel = id => refreshFullDetailLabels([id]).then(arr=>arr[0]);
    const refreshMyLabel = () => refreshLabel(AuthenticationService.getUserInfo("LABEL_ID"));
    /* Reloads our label and the labels of all of our selectors */
    const refreshVCP = () => {
        return new Promise((res,rej)=>{
            refreshMyLabel().then(myLabel=>{
                let ids = myLabel.SELECTORS.map(s=>s.ID).filter(id=>id!=undefined);
                refreshFullDetailLabels(ids).then(res).catch(rej);
            }).catch(rej);
        })
    }
    const getAllLabels = () => $q.resolve(labelMap.asArray().sort(SortService.clientSort));
    const getLabels = ids => $q.resolve(labelMap.get(ids));
    const getAllClients = () => $q.resolve(labelMap.asArray().filter(SelectorDescriberService.isClient));
    const refreshAllGroups = () => {
        return GroupConfigurationService.getAllGroups().then(result=>{
            let groups = result.data;
            groups.forEach(SelectorDescriberService.decorateLabel);
            groups = groups.sort(SortService.clientSort);
            return groups;
        });
    }
    const getAllGroups = () => $q.resolve(labelMap.asArray().filter(SelectorDescriberService.isGroup))
    
    return{
        clear,
        refreshAllClients:LockService.lock2(refreshAllClients),
        refreshFullDetailClients:LockService.lock2(refreshFullDetailClients),
        refreshAllLabels:LockService.lock2(refreshAllLabels),
        refreshLabel:LockService.lock2(refreshLabel),
        getAllLabels:getAllLabels,
        getLabels,
        getLabel:getLabel,
        getLabelSync,
        getMyLabelSync,
        refreshMyLabel,
        refreshVCP,
        getLabelName:getLabelName,
        getAllClients:getAllClients,
        getAllGroups:getAllGroups,
        refreshAllGroups:LockService.lock2(refreshAllGroups),
        refreshFullDetailLabels:LockService.lock2(refreshFullDetailLabels)
    }
})

app.factory("SelectorDescriberService",
function($q,SystemListService,LabelsService,AuthenticationService,WhosOnlineService,OriginService,ResourceService){
    let systemList;
    let vcomLabelTypes;
    let intracomLabelCategories;
    let telexLabelCategories;
    let initializationPromise;
    let initialized = false;

    const init = () => {
        if(!initializationPromise){
            let promises = [
                loadSystemList(),
                loadVCOMLabelTypes(),
                loadIntracomLabelCategories(),
                loadTelexLabelCategories()
            ]
            initializationPromise = $q.all(promises).then(()=>{
                console.log("selector describer service initialized");
                initializationPromise = undefined;
                initialized = true;
            })
        }
        return initializationPromise;
    }

    const waitUntilReady = () => {
        if(initialized){
            return $q.resolve();
        }else{
            return init();
        }
    }

    const loadSystemList = () => {
        return SystemListService.getSystemList()
        .then(result => {
            systemList = result.data;
            console.log("Systemlist loaded",systemList);
        });
    }
    const loadVCOMLabelTypes = () => {
        // console.log("load vcom label types");
        return LabelsService.getLabel(undefined, 'VCOM_CLIENT_LABEL_TYPE')
        .then(result => vcomLabelTypes = Util.objectToArray(result.data.VCOM_CLIENT_LABEL_TYPE));
    }
    const loadIntracomLabelCategories = () => {
        return LabelsService.getLabel(undefined, 'INTRACOM_LABEL_CATEGORY')
        .then(result => intracomLabelCategories = Util.objectToArray(result.data.INTRACOM_LABEL_CATEGORY));
    }
    const loadTelexLabelCategories = () => {
        return LabelsService.getLabel(undefined, 'TELEX_LABEL_CATEGORY')
        .then(result => telexLabelCategories = Util.objectToArray(result.data.TELEX_LABEL_CATEGORY));
    }

    const defaultSystemType = "INTRACOM";
    const getSystemType = selector => {
        if(selector.SYSTEM_TYPE){
            return selector.SYSTEM_TYPE;
        }
        if(selector.LABEL_CATEGORY && selector.LABEL_CATEGORY.includes){
            if(selector.LABEL_CATEGORY.includes("VCP") || selector.LABEL_CATEGORY.includes("VCOM")){
                return "INTRACOM";
            }
        }
        return defaultSystemType;
    }
    const isControlPanel = label => {
        return (typeof label.LABEL_TYPE === "string")  && label.LABEL_TYPE.includes("VCP");
    }
    const isClient = label => {
        if(label.LABEL_TYPE_PREFIX == undefined)label.LABEL_TYPE_PREFIX = getBaseType(label);
        return ["VCP","VDI","SIP","RTSP","P2P"].includes(label.LABEL_TYPE_PREFIX);
    }
    const isDispatchContact = label => {
        return ["VCP","VDI"].includes(label.LABEL_TYPE_PREFIX);
    }
    const getMemberIDs = label => {
        let members = Util.ensureArray(label.MEMBERS);
        let ids = members.map(member=>member.ID);
        return ids;
    }

    const getSystemName = selector => {
        let targetSystemIndex;
        if(selector.SYSTEM_TYPE == 'TELEX'){
            targetSystemIndex = selector.SYSTEM_INDEX;
        }
        else{
            targetSystemIndex = 31;
        }
        /* Search systemsList for a matching system */
        const matchingSystem = Util.findElementWithProperty(systemList,"SYSTEM_INDEX",targetSystemIndex);
        if(matchingSystem) return matchingSystem.SYSTEM_NAME;
        return '';
    }

    /* Given a selector, return a description of its type */
    const getTypeDescription = selector => {
        let match;
        if(selector.SYSTEM_TYPE === undefined || selector.SYSTEM_TYPE == 'INTRACOM') {
            if(selector.LABEL_CATEGORY == 'VCOM_CLIENT') {
                // Lookup LABEL_TYPE in VCOM_CLIENT_LABEL_TYPE list.
                match = Util.findElementWithProperty(vcomLabelTypes,"value",selector.LABEL_TYPE)
            } else {
                // Lookup LABEL_CATEGORY in INTRACOM_LABEL_CATEGORY list.
                match = Util.findElementWithProperty(intracomLabelCategories,"value",selector.LABEL_CATEGORY);
            }
        } else if(selector.SYSTEM_TYPE == 'TELEX') {
            // Lookup LABEL_CATEGORY in TELEX_LABEL_CATEGORY list
            match = Util.findElementWithProperty(telexLabelCategories,"value",selector.LABEL_CATEGORY);
        }
        if(match){
            return match.label
        }
        else{
            return '';
        }
    };

    /* Given a selector, return a description of its name.
    Prioritize SELECTOR_NAME over EXTERNAL_NAME_LONG over EXTERNAL_NAME_SHORT */
    const getNameDescription = selector => {
        if(selector.SELECTOR_NAME) return selector.SELECTOR_NAME;
        if(selector.EXTERNAL_NAME_LONG) return selector.EXTERNAL_NAME_LONG;
        if(selector.EXTERNAL_NAME_SHORT) return selector.EXTERNAL_NAME_SHORT;
        return "";
    };

    const getBaseType = selector => {
        let type = selector.LABEL_TYPE;
        let typeDescription = getTypeDescription(selector);
        /* detect Party Line and Fixed Group */
        if(typeDescription.includes("Party Line")) return "PL";
        if(typeDescription.includes("Fixed Group")) return "FG";
        // console.log(typeDescription,"neither PArty line nor Fixed group");

        /* detect VCP_xxx, RTSP_xxxx, VDI_xxx, SIP_xxx */
        if(type && type.indexOf && type.indexOf("_")){
            let firstWord = type.slice(0,type.indexOf("_")); 
            /* detect VIDEO_STREAMING_URI */
            if(firstWord == "VIDEO"){
                return "P2P";
            }
            else{
                return firstWord;
            }
        }
        else{
            return "";
        }
    }
    const getTypeSuffix = label => {
        let type = label.LABEL_TYPE_FULL_DETAIL || '';
        if(["Party Line","Fixed Group"].includes(type)) return type;
        if(type.includes(":")){
            return type.slice(type.indexOf(":")+1);
        }
        else{
            return type.slice(type.indexOf(" ")+1);
        }
    }
    const hasAnyRestrictions = label => {
        return label.NO_LOCAL_ASSIGNMENT_BY_ADMINISTRATOR == "ON" || label.NO_LOCAL_ASSIGNMENT_BY_USER == "ON";
    }

    const getPasswordDisplay = label => {
        if(!label.LOGIN_PASSWORD) return "";
        if(AuthenticationService.allowsPasswordDisplay()){
            return label.LOGIN_PASSWORD;
        }
        else{
            return new Array(label.LOGIN_PASSWORD.length).fill("*").join("");
        }
    }

    const getTemplateName = (label,type,clients) => {
        let id = getTemplateID(label,type);
        if(id){
            let templateLabel = Util.findElementWithProperty(clients,"ID",id);
            if(templateLabel){
                return getNameDescription(templateLabel);
            }
            else{
                return "";
            }
        }
        else{
            return "";
        }
    }
    const getTemplateID = (label,type) => {
        if(!label.TEMPLATES || label.TEMPLATES.length < 1) return undefined;
        let template = label.TEMPLATES.find(template => {
            return template.TYPE == type
        })
        return Util.getPropertySafe(template,"ID")
    }

    const getLatchable = label => {
        if(label.LATCH_DISABLE == "ON"){
            return false;
        }
        else{
            return true;
        }
    }

    const getPartyLine = label => {
        if(label.PARTY_LINE_OPERATION == 'ON'){ /* this doesn't seem to apply to every label that is a party line */
            return true;
        }
        return false;
    }
    const getSystemNumberToDisplay = label => { // index from 1, not 0
        return label.SYSTEM_INDEX+1+""; // conversion to string helps ag grid filters
    }
    const getPortToDisplay = label => { // index from 1, not 0
        return label.LABEL_INDEX+1+""; // conversion to string helps ag grid filters
    }
    /* Not for a full-detail label, but rather for a selector inside a SELECTORS array
    or for a selector in a group's MEMBERS array
    Returns "Talk", "Listen", or "Talk/Listen" (the type of the selector) */
    let typeMap = {
        /* for selector assignments */
        "SELECTOR":"Talk/Listen",
        "SELECTOR_TALK":"Talk",
        "SELECTOR_LISTEN":"Listen",
        /* for groups */
        "TALK_LISTEN":"Talk/Listen",
        "TALK":"Talk Only",
        "LISTEN":"Listen Only"
    }
    const getSelectorType = selector => {
        return typeMap[selector.TYPE];
    }

    const getHotkeyString = selector => {
        let str = "";
        let mod = Util.getPropertySafe(selector,"HOT_KEY","MODIFIER");
        let key = Util.getPropertySafe(selector,"HOT_KEY","KEY");
        if(mod && mod != "none") str += mod + " + ";
        if(key) str += key;
        // console.log("hot key string",selector,str);
        return str;
    }

    const getImageURL = label => {
        let defaultPath = ResourceService.getAvatarURL("VCP.png");
        if(label.IMAGE === undefined) return defaultPath;
        return ResourceService.getAvatarURL(label.IMAGE);
    }
    
    /* We need this in order to properly decorate the TEMPLATE_NAME properties.
    In order to determine TEMPLATE_NAME_XXX we iterate over all clients. We should use
    the most up to date clients, which are these clients themselves, so we can't
    just decorate them one at a time without having access to the rest to find TEMPLATE_NAMES */
    const decorateClients = clients => {
        clients.forEach(label=>{
            decorateLabel(label);
            ["OPTIONS","SELECTOR_ASSIGNMENTS","AUDIO_SETTINGS"].forEach(n=>{
                let id = getTemplateID(label,n);
                if(id != undefined){
                    label[n+"_TEMPLATE_ID"] = id;
                    label[n+"_TEMPLATE_NAME"] = getTemplateName(label,n,clients);
                }
                else{ /* in the case that we are redecorating a label that has had its templates unlinked */
                    delete label[n+"_TEMPLATE_ID"];
                    delete label[n+"_TEMPLATE_NAME"];
                }
            })

        })
    }
    const isFixedGroup = label => label.LABEL_CATEGORY === "VCOM_FIXED_GROUP";
    const isPartyLine = label=>label.LABEL_CATEGORY === "VCOM_PARTY_LINE";
    const isGroup = label => isFixedGroup(label) || isPartyLine(label);
    const isDialable = label => isSIP(label);
    const isOnline = label => WhosOnlineService.get().includes(label.ID);
    const isSIP = label => label.LABEL_TYPE == "SIP_REGISTERED_TRUNK";

    
    /* Only relevant for group types, where LABEL_TYPE is missing */
    const getLabelType = label => {
        if(label.LABEL_TYPE) return label.LABEL_TYPE;
        let type = label.LABEL_TYPE_FULL_DETAIL || "";
        if(type.indexOf("Party Line")>-1) return "PARTY_LINE";
        if(type.indexOf("Fixed Group")>-1) return "FIXED_GROUP";
    }

    const getGPSString = label => {
        let lat = label.GEO_MAPPING_LATITUDE;
        let lon = label.GEO_MAPPING_LONGITUDE;
        let string = "Unknown";
        if(lat || lon){
            string = "Lat: "+lat + " Lon: "+lon
        }
        return string;
    }

    const getBaseTypeName = label => {
        let baseType = getBaseType(label);
        if(baseType == "RTSP") return "VIDEO";
        if(baseType == "P2P") return "VIDEO";
        return baseType;
    }
    const decorateLabel = label => {
        if(label == undefined){
            console.error("trying to decorate undefined label");
        }
        label.LABEL_SYSTEM_NAME = getSystemName(label);
        label.LABEL_SYSTEM_TYPE = getSystemType(label);
        label.LABEL_NAME = getNameDescription(label);
        label.LABEL_TYPE_FULL_DETAIL = getTypeDescription(label);
        label.LABEL_TYPE_SUFFIX = getTypeSuffix(label);
        label.LABEL_TYPE_PREFIX = getBaseType(label);
        label.LABEL_BASE_TYPE_NAME = getBaseTypeName(label);
        label.LABEL_TYPE = getLabelType(label);
        label.LABEL_IS_GROUP = isGroup(label);
        label.LABEL_IS_FG = isFixedGroup(label);
        label.LABEL_IS_PL = isPartyLine(label);
        // label.RESTRICTED = hasAllRestriction(label);
        label.RESTRICTIONS_DISPLAY = hasAnyRestrictions(label)?"Yes":"";
        label.LOGIN_PASSWORD_DISPLAY = getPasswordDisplay(label); // this is the only kind we ever wanted, I think.  Should I have some way to distinguish between values meant for display (like Yes/No) vs values for computation (like true/false)
        label.IS_CLIENT = isClient(label);
        label.IS_DISPATCH_CONTACT = isDispatchContact(label);
        label.IS_DISPATCH_GROUP = label.LABEL_IS_FG;
        label.LATCHABLE = getLatchable(label);
        label.LATCHABLE_DISPLAY = getLatchable(label)?"Yes":"";
        label.IS_PARTY_LINE = getPartyLine(label);
        label.IS_RTS_TRUNK = label.LABEL_TYPE && label.LABEL_TYPE.includes("TELEX_TRUNK");
        label.PORT = getPortToDisplay(label);
        label.SYSTEM_NUMBER = getSystemNumberToDisplay(label);
        label.IMAGE_URL = getImageURL(label);
        label.GPS_STRING = getGPSString(label);
        /* Changes to output of the API to make them more easily understood by the client */
        /* null => empty array */
        if(!Array.isArray(label.SELECTORS)){label.SELECTORS = [];} // Instead of null, empty SELECTORS should be []
        label.SELECTORS = label.SELECTORS.filter(item=>item!=null); // remove nulls from the array
        if(!Array.isArray(label.MEMBERS)){label.MEMBERS = [];} // Instead of null, empty MEMBERS should be []
        label.MEMBERS = label.MEMBERS.filter(item=>item!=null); // remove nulls
        /* undefined => empty string */
        if(label.SELECTOR_NAME_LISTEN_ONLY === undefined){label.SELECTOR_NAME_LISTEN_ONLY="";}
        /* missing permissions => NO_PERMISSIONS */
        if(label.SYSTEM_ADMINISTRATION_PRIVILEGES === undefined){label.SYSTEM_ADMINISTRATION_PRIVILEGES = "NO_PRIVILEGES"}
        /* missing selector volume gain */
        if(label.SELECTOR_VOLUME_GAIN === undefined){label.SELECTOR_VOLUME_GAIN = []}
        /* missing LATCH_DISABLE */
        if(label.LATCH_DISABLE === undefined){label.LATCH_DISABLE="OFF"}
        return label;
    }

    // init();
    return {
        getTypeDescription:getTypeDescription,
        getNameDescription:getNameDescription,
        getSystemName:getSystemName,
        getSystemType:getSystemType,
        getSelectorType:getSelectorType,
        getBaseType:getBaseType,
        getHotkeyString:getHotkeyString,
        decorateLabel:decorateLabel,
        decorateClients:decorateClients,
        isControlPanel:isControlPanel,
        isClient:isClient,
        isGroup:isGroup,
        isSIP,
        isDialable,
        isOnline,
        getMemberIDs,
        waitUntilReady:waitUntilReady
    }
});

app.factory("ServerTesterService",function($q,$http){
    const makeTestRequest = ip => {
        return $http({
            method:"get",
            url:ip+"/api/v1/ssl/status"
        })
    }
    const getWorkingServers = ips => {
        let promises = ips.map(ip=>{
            return makeTestRequest(ip).then(result=>{
                console.log(ip,"works",result);
                return ip;
            },reason=>{
                // console.log(ip,"doesn't work",JSON.stringify(reason));
                return undefined;
            });
        })
        return $q.all(promises).then(results=>{
            const workingServers = results.filter(result=>result!=undefined);
            // console.log("working servers",workingServers);
            return workingServers;
        })
    }
    const getWorkingServer = ips => {
        return getWorkingServers(ips).then(result=>{
            if(result.length > 0){
                return result[0];
            }
            else{
                return undefined;
            }
        })
    }
    return {
        getWorkingServers:getWorkingServers,
        getWorkingServer:getWorkingServer
    }
})
/*
    This Service helps manage the process of failing over to a backup host.
    Instead of just alternating between two potential servers, it looks at an array of potential servers
    and is willing to set the host to any of them that works.  
    Util.getHost() will give the current server being used.  
    Util.getDefaultHost() will give the default host that is baked in.
*/
app.factory("FailoverService",function($q,$timeout,SystemStatusService, URLService, SystemSettingsService,
    RedirectService,ServerTesterService,BrowserStorageService,OriginService,ProgressBarService){
    const numTriesToReachServers = 3;
    const delayBetweenServerTests = 1000; // ms

    /* Here when I say host, I'm referring to what is actually called an 'origin', which is a combined
    protocol + hostname + port, eg. (http://intracomsystems.net:80) */

    const errors = {
        IN_PROGRESS:"Failover already in progress.",
        USER_DENIED:"The user chose not to failover.",
        NO_SECONDARY:"Failover not enabled due to lack of secondary ip address",
        NO_HOSTS:"No known hosts to failover to.",
        NO_HOSTS_UP:"None of the known servers are up.",
        SERVER_IS_UP:"The current server is not actually down, so no failover is necessary.",
    }

    let _failingOver = false;
    let _secondaryIsActive = false;

    const failoverMap = {
        primary:"secondary",
        primaryNAT:"secondaryNAT",
        secondary:"primary",
        secondaryNAT:"primaryNAT"
    }

    const getOriginsFromTitles = titles => {
        let hostnames = titles.map(URLService.titleToHostname).filter(entry=>entry!=undefined); // remove undefined hostnames
        let origins = hostnames.map(hostnameToOrigin);
        return origins;
    }
    
    const isASecondaryOrigin = origin => getOriginsFromTitles(["secondary","secondaryNAT"]).includes(origin);
    const isAPrimaryOrigin = origin => getOriginsFromTitles(["primary","primaryNAT"]).includes(origin);

    const getPrimaryHostname = () => URLService.titleToHostname("primary");
    const getSecondaryHostname = () => URLService.titleToHostname("secondary");

    const getFailoverHostname = () => {
        let currentHostname = URLService.getCurrentHostname();
        let title = URLService.hostnameToTitle(currentHostname);
        if(title == undefined) return undefined;
        let targetTitle = failoverMap[title];
        let targetHostname = URLService.titleToHostname(targetTitle);
        return targetHostname;
    }
    const getWebPort = () => {
        let settings = SystemSettingsService.get();
        let appropriatePort = (URLService.isConnectionSecured())?settings.IP_PORT_FOR_WEB_SERVER_HTTPS:settings.IP_PORT_FOR_WEB_SERVER_HTTP;
        return appropriatePort;
    }
    const hostnameToOrigin = hostname => {
        if(hostname){
            return URLService.getCurrentProtocol()+"://"+hostname+":"+getWebPort();
        }
        else{
            return undefined;
        }
    }
    const getCurrentOrigin = OriginService.getOrigin;

    const getViableOrigins = optionalOrigins => {
        /* There was a problem with just checking the primary and failover hosts.
        An IP address can't have a certificate, and our primary and failover hosts are IP addresses.
        So on HTTPS, they appear down (unless the user navigates there in the browser to manually say they are okay)
        We can allow an automatic reconnect to the server by checking with the current host, which is normally a FQDN, not an IP
        */

        
        const defaultOrigins = [getCurrentOrigin()];
        let goodFailoverOrigin = hostnameToOrigin(getFailoverHostname())
        if(goodFailoverOrigin){
            defaultOrigins.push(goodFailoverOrigin)
        }
        else{
            /* We aren't on one of the known servers
            Try any of the servers */
            let settings = SystemSettingsService.get();

            [settings.IP_ADDRESS_FOR_PRIMARY_SERVER,
            settings.IP_ADDRESS_FOR_SECONDARY_SERVER,
            settings.IP_ADDRESS_OF_NAT_FOR_PRIMARY_SERVER,
            settings.IP_ADDRESS_OF_NAT_FOR_SECONDARY_SERVER].filter(entry=>entry!=undefined).forEach(ip=>{
                let orig = hostnameToOrigin(ip);
                defaultOrigins.push(orig);
            })
        }
        let origins;
        if(!optionalOrigins){
            origins = defaultOrigins;
        }
        else{
            origins = optionalOrigins;
        }
        /* filter out any duplicates or missing */
        origins = origins.filter(o=>o!=undefined);
        origins = Util.removeDuplicates(origins);
        console.log("viable origins",origins);
        return origins;
    }

    const failoverHasBegun = () => _failingOver = true;
    const failoverHasEnded = () =>  _failingOver = false;
    const isFailingOver = () => _failingOver;
    const secondaryIsActive = () => _secondaryIsActive;

    /* Repeatedly tests hosts to see if any will respond.
        Rejects when no hosts respond 
        Resolves with a responsive host if one responds
        */
    const tryToGetWorkingServer = (hosts,tries) => {
        console.log(tries, "tries remaining to check on the availability of ",hosts);
        if(tries == 0){
            failoverHasEnded();
            return $q.reject(errors.NO_HOSTS_UP)
        }
        return ServerTesterService.getWorkingServer(hosts).then(potentialHost=>{
            if(potentialHost == undefined){
                // they might just not be up quite yet! Try again perhaps
                return $timeout(()=>tryToGetWorkingServer(hosts,tries-1),delayBetweenServerTests);
            }
            else{
                return $q.resolve(potentialHost);
            }
        })
    }
    /* Performs failover by redirecting the user to the given host */
    const failover = host => {
        const name = BrowserStorageService.get("BAD_PRACTICE_username");
        const pass = BrowserStorageService.get("BAD_PRACTICE_password");
        return RedirectService.redirectToFailoverServer(host,name,pass);
    }

    /* Determines if we think we are on a given origin (like "http://192.168.1.3:1000")
        This is easy if we can look at the current URL and match it to the supplied origin.
        But in the case where we want to compare an IP address to a FQDN, (like "intracomsystems.net" vs "57.83.12.30")
        We have to be more creative.
        System Status API tells us whether the server we are contacting is primary or secondary.
        We store that info and reference it here. If we know our server to be secondary and the supplied origin is one of the known secondaries
        then we can conclude that we are on that server.
        Similarly, if we know our server to be primary, and the supplied origin is one of the known primary servers (public/private versions)
        then we can conclude that we are on the supplied server origin
    */
    const weAreOnOrigin = origin => {
        if(origin == getCurrentOrigin()) return true; // straightforward
        if(secondaryIsActive() && isASecondaryOrigin(origin)) return true;
        if(!secondaryIsActive() && isAPrimaryOrigin(origin)) return true;
    }

    /* We use presence of IP_ADDRESS_FOR_SECONDARY_SERVER or IP_ADDRESS_OF_NAT_FOR_SECONDARY_SERVER to 
    determine if we should try to failover or not */
    function isSecondaryEnabled(){
        let settings = SystemSettingsService.get();
        return settings.IP_ADDRESS_FOR_SECONDARY_SERVER || settings.IP_ADDRESS_OF_NAT_FOR_SECONDARY_SERVER
    }

    /* Looks for a viable origin that's online.
       If one is found, then the user is prompted to failover.
       If they agree, then failover occurs */
    const attemptFailover = optionalOrigins => {
        /* Check failover in progress */
        if(isFailingOver()){
            return $q.reject(errors.IN_PROGRESS);
        }
        /* Check host viability */
        if(!isSecondaryEnabled()){
            return $q.reject(errors.NO_SECONDARY);
        }
        let viableOrigins = getViableOrigins(optionalOrigins);
        if(viableOrigins.length < 1){
            return $q.reject(errors.NO_HOSTS);
        }
        failoverHasBegun();
        /* Check host status */
        let promise = tryToGetWorkingServer(viableOrigins,numTriesToReachServers)
        ProgressBarService.track(promise,{showFailure:false});
        return promise
        .then(goodOrigin=>{
            /* Verify it's not the origin we're already using */
            if(weAreOnOrigin(goodOrigin)){
                console.log("not failing over, just momentarily lost connection");
                failoverHasEnded();
                return $q.reject(errors.SERVER_IS_UP);
            }
            failoverHasEnded();
            return failover(goodOrigin)
        })
    }

    /* Use System Status API to determine if the server we're on thinks that the secondary server is active.
    This helps us know which server to failover to */
    const updateSecondaryIsActive = () => {
        return SystemStatusService.getOrPull().then(systemStatus=>{
            let status = Util.getPropertySafe(systemStatus,"FAILOVER_STATUS","TEXT");
            if(status && status.indexOf("SECONDARY ACTIVE") != -1){
                _secondaryIsActive = true;
                return true;
            }
            _secondaryIsActive = false;
            return false;
        })
    }

    return {
        getViableOrigins,
        updateSecondaryIsActive:updateSecondaryIsActive,
        attemptFailover:attemptFailover,
        secondaryIsActive:secondaryIsActive,
        isFailingOver:isFailingOver,
        errors:errors
    }
});
app.directive("audiofilechooser", function(ResourceService,ModalConfirmer,ProgressBarService){
    return {
        scope: {
            ngModel: '=' // this links the scope within this directive to the scope outside of it
        },
        restrict: 'E', // matches <audiofilechooser> HTML elements only
        bindToController: {
          ngModel: '=',
        },
        controller: function($scope) {
            $scope.buttonLabel = "Choose Audio File";
            const init = () => {
                $scope.uploadFn = ResourceService.putSoundFile;
                $scope.onSuccess = (newlyUploadedName) => {
                    console.log("uploaded",newlyUploadedName);
                    updateDropdown().then(()=>{
                        selectOption(newlyUploadedName);
                    })
                }
                $scope.onFailure = name => {
                    console.log("failed to upload",name);
                }
                $scope.confirmDelete = confirmDelete;
                updateDropdown();
            }
            const confirmDelete = ()=>{
                let chosenFilename = Util.getPropertySafe($scope,"ngModel","value");
                ModalConfirmer.prompt({
                    title:"Confirm file deletion",
                    okayLabel:"Delete File",
                    message:"Are you sure you would like to remove the file '"+chosenFilename+"' from the server?"
                }).then(()=>{
                    let promise = ResourceService.deleteSoundFile(chosenFilename);
                    ProgressBarService.track(promise,{showSuccess:true});
                    promise.then(updateDropdown);
                })
            }
            /* set the currently selected value in the dropdown */
            const selectOption = filename => {
                // ngModel is an object like {value:'blah',label:'blah'}, so setting $scope.ngModel='blah' won't do
                $scope.ngModel = Util.findElementWithProperty($scope.soundFiles,"value",filename);
            }
            /* Request the available sound file names to populate our dropdown */
            const updateDropdown = () => {
                return ResourceService.getSoundFileNames()
                .then(names=>{
                    /* convert to objects with label and value, to be used as drop down list */
                    const soundsAsDropdownList = names.map(name=>{
                        return {
                            label:name,
                            value:name
                        }
                    })
                    $scope.soundFiles = soundsAsDropdownList;
                });
            }
            init();
        },
        controllerAs: 'ctrl',
        templateUrl: Util.url('/directives/views/audiofilechooser.html')
      }
})

app.directive("imagefilechooser", function(ResourceService,ModalConfirmer,ProgressBarService){
    return {
        scope: {
            ngModel: '=' // this links the scope within this directive to the scope outside of it
        },
        restrict: 'E', // matches <imagefilechooser> HTML elements only
        bindToController: {
          ngModel: '=',
        },
        controller: function($scope) {
            $scope.buttonLabel = "Choose Image File";
            const init = () => {
                $scope.uploadFn = ResourceService.putImageFile;
                $scope.onSuccess = (newlyUploadedName) => {
                    console.log("uploaded",newlyUploadedName);
                    updateDropdown().then(()=>{
                        selectOption(newlyUploadedName);
                    })
                }
                $scope.onFailure = name => {
                    console.log("failed to upload",name);
                }
                $scope.confirmDelete = confirmDelete;
                updateDropdown();
            }
            const confirmDelete = ()=>{
                let chosenFilename = Util.getPropertySafe($scope,"ngModel","value");
                ModalConfirmer.prompt({
                    title:"Confirm file deletion",
                    okayLabel:"Delete File",
                    message:"Are you sure you would like to remove the file '"+chosenFilename+"' from the server?"
                }).then(()=>{
                    let promise = ResourceService.deleteImageFile(chosenFilename);
                    ProgressBarService.track(promise,{showSuccess:true});
                    promise.then(updateDropdown);
                })
            }
            /* set the currently selected value in the dropdown */
            const selectOption = filename => {
                // ngModel is an object like {value:'blah',label:'blah'}, so setting $scope.ngModel='blah' won't do
                $scope.ngModel = Util.findElementWithProperty($scope.imageFiles,"value",filename);
            }
            $scope.getSrc = () => {
                let filename = Util.getPropertySafe($scope,"ngModel","value");
                let result = ResourceService.getAvatarURL(filename);
                return result;
            }
            /* Request the available image file names to populate our dropdown */
            const updateDropdown = () => {
                return ResourceService.getImageFileNames()
                .then(names=>{
                    /* convert to objects with label and value, to be used as drop down list */
                    const imagesAsDropdownList = names.map(name=>{
                        return {
                            label:name,
                            value:name
                        }
                    })
                    $scope.imageFiles = imagesAsDropdownList;
                });
            }
            init();
        },
        controllerAs: 'ctrl',
        templateUrl: Util.url('/directives/views/imagefilechooser.html')
      }
})


/* Allows you to prompt the user to replace all instances of one selector with another */
app.factory("SearchAndReplaceService",function(AgeService,LabelStorageService, LockService,
    $q,ProgressBarService, ModalConfirmer, NotificationService, LabelsService){
    const maxAgeOfFullDetailClients = 30000; // 30 seconds

    let replacementsMade = 0;
    let replacementsFailed = 0;
    /* Resolves with labels that need to be altered to make the current replacement.
    Separating this function out allows us to see how many clients would be modified
    before we actually make any changes. */
    const getClientsWithSelector = destID => {
        const isDestSelector = selector => selector.ID == destID;
        const hasDestSelectorAssignment = label => {
            if(label.SELECTORS){
                return label.SELECTORS.find(isDestSelector) != undefined;
            }
            else{ // No SELECTORS assigned to this client
                return false;
            }
        }
        /* determine whether or not we should contact the server to refresh our understanding of the clients */
        let ageOfFullDetailClients = AgeService.getAge("fullDetailClients");
        let getClientsFn = LabelStorageService.refreshFullDetailClients;
        if(ageOfFullDetailClients < maxAgeOfFullDetailClients){ // no need to make an API call, use stored clients
            getClientsFn = LabelStorageService.getAllClients;
        }
        return getClientsFn().then(clients=>clients.filter(hasDestSelectorAssignment));
    }

    /* Looks through the SELECTORS field of a label and finds selectors where
    the ID matches destID.  Those selectors have their ID replaced with sourceID and their ALIAS replaced with sourceAlias.
    Returns a promise */
    const performOneReplacement = (label,destID,sourceID,sourceAlias) => {
        const matches = label.SELECTORS.filter(summary=>summary.ID == destID);
        /* modify selector assignments */
        matches.forEach(match=>{
            match.ID = sourceID;
            match.ALIAS = sourceAlias;
        })
        /* PUT those changes to the server */
        const putPromise = LabelsService.putLabel(label);
        // let putPromise = $q.resolve();
        // if(Math.random()<0.1) putPromise = $q.reject();
        putPromise.then(()=>{
            replacementsMade += 1;
        })
        .catch(()=>{
            replacementsFailed += 1;
        })
        return putPromise;
    }
    
    /* Implements replacing all instances of destID with sourceID in the SELECTORS array of all clients.
    Determines which clients need to be updated to reflect the replacement
    Makes the necessary changes, and aggregates all of the PUT promises into one and returns that */
    const replaceSelectors = LockService.lock((destID,sourceID) => {
        const putPromises = [];
        /* reset successes/failed statistics */
        replacementsFailed = 0;
        replacementsMade = 0;
        const getSourceAlias = ()=>LabelStorageService.getLabel(sourceID).then(sourceLabel=>{
            return sourceLabel.ALIAS;
        })

        return getSourceAlias().then(sourceAlias=>{
            return getClientsWithSelector(destID).then(clientsWithSelector => {
                clientsWithSelector.forEach(clientLabel => {
                    putPromises.push(performOneReplacement(clientLabel,destID,sourceID,sourceAlias));
                })
                /* resolve when all the PUTs are complete */
                if(putPromises.length > 0){
                    let allReplacements = $q.all(putPromises);
                    allReplacements.finally(()=>{
                        if(replacementsMade > 0){
                            /* Our storage of labels is now invalidated as we have made changes */
                            AgeService.invalidate("allClients");
                            AgeService.invalidate("allLabels");
                            AgeService.invalidate("fullDetailClients"); 
                        }
                    })
                    return allReplacements;
                }
                /* no selectors to update; we consider this successful */
                return $q.resolve();
            })
        })
    });

    /* Prompt the user to confirm their choice to replace the given selectors */
    const promptReplaceSelectors = (destID,sourceID) => {
        promptUserToReplace().then(onConfirm);
        /* actually perform replacement */
        function onConfirm(){
            let promise = replaceSelectors(destID,sourceID);
            ProgressBarService.track(promise,{showFailure:false});
            promise.finally(reportReplacementsMade)
        }
        function promptUserToReplace(){
            let sourceName = LabelStorageService.getLabelName(sourceID);
            let destName = LabelStorageService.getLabelName(destID);
            let message = 'Are you sure you want to replace selector \'' + destName + '\' with selector \'' + sourceName + '\'?';
            let promise = getClientsWithSelector(destID);
            ProgressBarService.track(promise);
            return promise.then(clientsWithSelector => {
                const num = clientsWithSelector.length;
                var pluralized;
                if(num == 1){
                    pluralized = "client's selector assignments";
                }
                else{
                    pluralized = "clients' selector assignments";
                }
                const suffix = " (" + num + " " + pluralized + " will be changed)"
                message += suffix;
                return ModalConfirmer.prompt({
                    title:"Confirm Replacement",
                    okayLabel:"Replace",
                    message:message
                })
            });
        }
    }
    /* Make a notification showing the results of the replacement */
    const reportReplacementsMade = () => {
        let msg = replacementsMade + " replacement(s) made.";
        let type = "success";
        if(replacementsFailed > 0){
            msg += " And " + replacementsFailed + " replacement(s) failed."
            type = "warning";
        }
        NotificationService.add({message:msg,type:type})
    }

    return {
        promptReplaceSelectors:promptReplaceSelectors
    }
});
app.factory("LevelsService",function(MyLabelService,BrowserStorageService){
    const min = -18;
    const max = 18;
    const sliderMin = 0;
    const sliderMax = 36;
    const sliderStep = 6;
    const query = "#selectors.original";
    const browserStorageName = "showLevels";
    const cssClass = "showLevels";

    /* Unfortunately, the input type="range" sliders were struggling with negative numbers.
    So we translate from the range [0,36] to the actual range [-18,18] */
    function setGainFromSlider(id,valFromSlider){
        valFromSlider = Number(valFromSlider); // input type="range" ng-model is set to a string, not a number
        let vol = valFromSlider + min;
        return MyLabelService.putVolume(id,vol);
    }
    function getGainForSlider(id){
        let vol = MyLabelService.getVolume(id);
        return vol-min;
    }
       
    function updateVisibility(){
        if(BrowserStorageService.get(browserStorageName)){
            Util.waitForElement(query).then(()=>{
                $(query).addClass(cssClass);
            })
        }
    }
    
    function toggleVisibility(){
        let prev = BrowserStorageService.get(browserStorageName);
            let newVal = !prev;
            BrowserStorageService.set(browserStorageName,newVal);
            $(query).removeClass(cssClass);
            if(newVal){
                $(query).addClass(cssClass);
            }
    }

    return {
        sliderStep,
        sliderMin,
        sliderMax,
        setGainFromSlider,
        getGainForSlider,
        updateVisibility,
        toggleVisibility
    }
})
app.factory("MyLabelService",function(LabelStorageService,LabelsService, ProgressBarService,
    SelectorDescriberService, EventService,AuthenticationService){
    let obs = new Util.Observers(["label"])
    EventService.on("loggedOut",obs.clear.bind(obs));
    /* Refresh my label */
    function refresh(){
        let id = getID();
        return LabelsService.getLabels([id]).then(result=>{
            let label = result.data[0];
            SelectorDescriberService.decorateLabel(label);
            obs.label.set(label);
            EventService.emit("myLabelLoaded");
        })
    };

    function refreshMySelectors(){
        let ids = getSelectors().map(s=>s.ID).filter(id=>id!=undefined);
        return LabelStorageService.refreshFullDetailLabels(ids);
    }
    /* Refresh my label and the full-detail labels of all of our selectors */
    const refreshVCP = () => {
        return ProgressBarService.track(refresh().then(refreshMySelectors));
    }

    const putVolume = (id,volume_gain) => {
        volume_gain = Number(volume_gain);
        if(volume_gain < -18 || volume_gain > 18){
            return console.error("can't set volume < -18 or > 18. you tried ",volume_gain);
        }
        // We just want to update on element of this SELECTOR_VOLUME_GAIN array
        // so we grab the existing array and modify it with the one desired change
        // and then push that as the result
        let allVolume = getAllVolume();
        let existingVolume = Util.findElementWithProperty(allVolume,"ID",id);
        if(existingVolume){
            existingVolume.VOLUME_GAIN = volume_gain;
        }
        else{
            allVolume.push(
                {
                    "ID":id, // id of the selector whose volume we want to change.
                    "VOLUME_GAIN":volume_gain
                }
            )
        }
        return LabelsService.putLabel({
            ID: getID(), // the ID of the logged-in user
            SELECTOR_VOLUME_GAIN:allVolume
        });
    }
    const getAllVolume = () => {
        return get().SELECTOR_VOLUME_GAIN; // guaranteed to exist by selectorDescriberService. Will be an empty array if we receive nothing from the server
    }
    const getVolume = id => {
        let label = get();
        if(id === undefined){
            return getAllVolume();
        }
        try{
            if(label && label.SELECTOR_VOLUME_GAIN){
                let existingVolume = Util.findElementWithProperty(label.SELECTOR_VOLUME_GAIN,"ID",id);
                if(existingVolume) return existingVolume.VOLUME_GAIN;
                return 0;
            }
            else{
                return 0;
            }
        }catch(e){
            console.error("couldn't get volume",id,label,e);
            return 0;
        }
    }
    const get = () => obs.label.get();
    const getAsync = () => {
        return new Promise((res,rej)=>{
            try{
                let sync = get();
                if(sync){
                    res(sync);
                }
                else{
                    res(refresh);
                }
            }
            catch(e){
                rej(e);
            }
        })
    }
    const getProp = name => get()[name];
    const getID = () => {
        let info = AuthenticationService.getUserInfo();
        if(info){
            return info.LABEL_ID;
        }
        else{
            console.error("My label ID not known");
            return "Unknown";
        }
    }
    const getSelectors = () => Util.ensureArray(getProp("SELECTORS"));
    const getSelectorLabels = () => {
        let ids = getMySelectorIDs();
        let labels = ids.map(LabelStorageService.getLabelSync);
        return labels;
    }
    /* returns false if myLabel doesn't exist yet.
    Helps to accomodate synchronous calls to getMyLabel which may be invoked before we've gotten the label */
    const propEquals = (prop,val) => {
        let label = get();
        if(!label) return false;
        return label[prop] == val;
    }
    const getMySelectorIDs = () => getSelectors().map(s=>s.ID);
    const getStreamName = () => getID()+"-"+getProp("LABEL_NAME");
    return {
        getID,
        getStreamName,
        refresh,
        refreshVCP,
        getSelectors,
        getMySelectorIDs,
        getSelectorLabels,
        get,
        putVolume,
        getVolume,
        getAsync,
        propEquals,
        getProp
    }
})

app.factory("ClientPositioningService",function(DiffUpdatesService){
    const MAX_OFFLINE_TIME = 2; // hours!
    let url = '/status/clientpositioning?maximumofflinetime='+MAX_OFFLINE_TIME;
    let overhaulProp = 'POSITION';
    let changesProp = 'POSITION_CHANGES';
    let cps = DiffUpdatesService.create(url,overhaulProp,changesProp);

    const get = () => {
        return cps.getAsArray().then(arr=>{
            /* Code for testing if markers move properly when GPS values change */
            // arr.forEach(obj=>{
            //     obj.GPS_LATITUDE = Math.random()*180-90;
            //     obj.GPS_LONGITUDE = Math.random()*360-180; 
            // })
            return arr;
        })
    }
    return {
        get
        // get:cps.getAsArray
    }
})

// myLayout.registerComponent( templateName, function( container, state ){
//     // state passed in through the componentState property of the golden layout config
//     // console.log("REGISTERING container,state",container,state);
//     $templateRequest(templateURL).then(function(html){
//                         /* html is a string of everything in the html file linked with templateURL. */
//         html = html.replace(/STATE_ID/g,state.id); // jankily insert data through the state argument
//         var template = angular.element(html);
//         container.getElement().html(template);
//         $compile(template)($scope);
//      });
/*
    buttons: [
        {
            label,
            icon,
            f
        }
    ]
*/

app.factory("DimensionsService",function(){
    /* 
        in decreasing order of maximum size:
        content: could be a massive scrollable website in both directions
        screen: physical screen of device
        window: webpage and all sorts of borders
        viewport: like window but without any scrollbars and borders.

    */
    const getContentWidth = () => $(document).width();
    const getContentHeight = () => $(document).height();

    const getScreenWidth = () => screen.width;
    const getScreenHeight = () => screen.height;

    const getWindowWidth = () => window.outerWidth;
    const getWindowHeight = () => window.outerHeight;

    const getViewportWidth = () => window.innerWidth;
    const getViewportHeight = () => window.innerHeight;

    const isWide = () => getViewportWidth() > 992;
    return {
        isWide,
        getContentWidth,
        getContentHeight,
        getScreenWidth,
        getScreenHeight,
        getWindowWidth,
        getWindowHeight,
        getViewportWidth,
        getViewportHeight
    }
});
app.factory("PlatformService",function(DimensionsService){
    const isPortrait = () =>  {
        console.log("PLATFORMSERVICE",DimensionsService.getViewportHeight(),DimensionsService.getViewportWidth())
        return DimensionsService.getViewportHeight() > DimensionsService.getViewportWidth();
    }
    const isLandscape = () => !isPortrait();
    function isElectron(){
        var userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.indexOf(' electron/') > -1) {
            return true;
        }
    }
    /* Detect if we are running on a Raspberry Pi. This may mean we want to show some additional
    UI elements like a master volume control or an on-screen-keyboard */
    function isPi(){
        return !!window.vcomPi;
    }
    return {
        isPi,
        isElectron,
        isPortrait,
        isLandscape
    }
})
app.factory("PaneService",function(PlatformService,GoldenLayoutService){
    const open = config => {
        config.container = { // config for the container
            maxPerRow:determineMaxPerRow(),
            rowHeights:determineRowHeights()
        }

        if(config.fullRow){
            config.container.maxPerRow = 1;
        }
        if(config.shortRow){
            config.container.rowHeights = [0,12,12,12,12,12]
        }

        let indexToInsertAt = undefined; // defaults to the end of the list

        let side = determineAppropriateSide(config);
        console.log("appropriate side",side);
        if(side == "bottom"){
            if(config.insertAtBeginning == true)indexToInsertAt = 0; // leftmost part of the row
            return GoldenLayoutService.openVideoContainer(config,indexToInsertAt);
        }
        else if(side == "side"){
            if(config.insertAtBeginning == true)indexToInsertAt = 1; // leftmost part of the side windows (still right of the selectors)
            return GoldenLayoutService.makeSideWindow(config,indexToInsertAt);
        }
    }
    const close = id => {
        GoldenLayoutService.remove(id);
    }
    const toggleMaximize = id => {
        GoldenLayoutService.toggleMaximize(id);
    }
    const determineMaxPerRow = () => {
        if(PlatformService.isPortrait()){
            return 2; // items per row
        }
        else{
            return 5;
        }
    }
    /* returns the height that a row should be, based off of the number of elements in the row */
    const determineRowHeights = () => {
        if(PlatformService.isPortrait()){
            return [0,50,25]; // %
        }
        else{
            return [0,45,40,35,35,35]; // 0% height for 0 items, 45% height for 1 item, ...
        }
    }
    const determineAppropriateSide = config => {
        /* content types:
        geo, chat, dialPad, browse, video, anonVideo, gum, wowzaStream
        */
        if(PlatformService.isPortrait()){
            return "bottom";
        }
        else{
            if(["video","anonVideo","gum","wowzaStream"].includes(config.contentType)){
                return "bottom";
            }
            else{
                return "side";
            }
        }
    }
    const openBehindSelectors = () => {
        let container = $(".behindContents");
        if(container.length<1){
            container = $("<div class='behindContents'></div>");
            $("#controlPanelPane").prepend(container);
        }
        return container;
    }
    return {
        open,
        toggleMaximize,
        get:GoldenLayoutService.get,
        openBehindSelectors,
        close
    }

});

app.factory("ClipboardService",function(NotificationService){
    const copy = text => {
        const el = document.createElement('textarea');  // Create a <textarea> element
        el.value = text;                                // Set its value to the string that you want copied
        el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
        el.style.position = 'absolute';
        el.style.left = '-9999px';                      // Move outside the screen to make it invisible
        document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
        const selected =
            document.getSelection().rangeCount > 0        // Check if there is any content selected previously
            ? document.getSelection().getRangeAt(0)     // Store selection if found
            : false;                                    // Mark as false to know no selection existed before
        el.select();                                    // Select the <textarea> content
        document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
        document.body.removeChild(el);                  // Remove the <textarea> element
        if (selected) {                                 // If a selection existed before copying
            document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
            document.getSelection().addRange(selected);   // Restore the original selection
        }

        NotificationService.add({message:"Copied '"+text+"' to the clipboard.",type:"success"});

    }
    return {
        copy
    }
})

app.factory("TestingService",function(
    $rootScope,
    SystemSettingsService,
    $http,
    ServerTesterService,
    ForcedFailoverService,
    FailoverService,
    NotificationService,
    TelephoneInterfaceService,
    ProgressBarService,
    WhosStreamingService,
    $q,
    LockService,
    $timeout,
    DebugService,
    FormModalService,
    ResourceService,
    APIService
){

    const resolveInX = x => {
        let deferred = $q.defer();
        $timeout(deferred.resolve,x);
        return deferred.promise;
    }
    const rejectInX = x => {
        let deferred = $q.defer();
        $timeout(deferred.reject,x);
        return deferred.promise;
    }
    const makeTimeoutErrors = n => {
        for(let i = 0; i < n; ++i){
            $http({url:"http://intracomsystems.net:80/api/v1/ssl/status",method:"get",timeout:1})
        }
    }
    const makeLockedCall = LockService.lock(()=>{
        return $timeout(()=>console.log("making locked call"),3000);
    })
    return {
        pull:()=>{
            SystemSettingsService.pull().then(newstuff=>console.log(newstuff));
        },
        getWithin:()=>{
            let formdata = Form(1);
            let field = formdata.get(0);
            field.label="Max age";
            field.modelName = "maxage";
            FormModalService.open({
                title:"within test",
                form:formdata,
                submit:submitted=>{
                    SystemSettingsService.getWithin(parseInt(submitted.maxage)).then(console.log);
                }
            })
        },
        get:()=>{
            console.log(SystemSettingsService.get());
        },
        getHosts:()=>{
            alert(FailoverService.getViableOrigins());
        },
        reportStreamOff:()=>{
            let formdata = Form(1);
            let field = formdata.get(0);
            field.label="Label ID";
            field.modelName = "id";
            FormModalService.open({
                title:"Report a stream as offline",
                form:formdata,
                submit:submitted=>{
                    let id = submitted.id;
                    WhosStreamingService.reportOtherStreamOff(id);
                }
            })
        },
        testServers:()=>{
            let failoverIP = FailoverService.getFailoverHost();
            ServerTesterService.getWorkingServers([
                "http://www.intracomsystems.net:80",
                "http://www.intracomsystems.net:2080",
                "http://intracomsystems.net:1949",
                failoverIP
            ])
        
        },
        testLockService:makeLockedCall,
        testImageFiles: () => {
            ResourceService.getImageFileNames().then(console.log);
        },
        forceFailover:()=>{
            ForcedFailoverService.forcedFailover();
            // FailoverService.failover().then(console.log),
        },
        simulateMiscError: ()=>$rootScope.$emit("miscError",{data:"simulated error"}),
        testTimeoutError:()=>{
            makeTimeoutErrors(1);
        },
        testFailover:()=>{
            $rootScope.$emit("loggedOut");
            makeTimeoutErrors(5);
            $timeout(()=>{
                makeTimeoutErrors(5);
            },3000)
        },
        setNumErrors:()=>{
            let formdata = Form(1);
            let field = formdata.get(0);
            field.label="Errors";
            field.modelName = "errors";
            FormModalService.open({
                title:"Observe this many failures since last success",
                form:formdata,
                submit:submitted=>{
                    let num = parseInt(submitted.errors);
                    console.log("observing",num,"errors");
                    makeTimeoutErrors(num);
                }
            })
        },
        showRandomLevels:()=>{
            TelephoneInterfaceService.toggleShowingRandomLevels();
            $timeout(TelephoneInterfaceService.toggleShowingRandomLevels,5000);
        },
        simulateLogout:()=>{
            APIService.delete("/authentication");
        },
        showDebugState: ()=>{
            alert("debug enabled? "+DebugService.isEnabled());
        },
        successProgressBar: () => {
            ProgressBarService.track(resolveInX(1500),{showSuccess:true});
        },
        failProgressBar: () => {
            ProgressBarService.track(rejectInX(1500),{showFailure:true});
        },
        randomMessage: () => {
            let r = Math.random();
            let msg = "test message" + r;
            let types = [
                "danger",
                "warning",
                "success"
            ]
            let type;
            if(r < 0.3) type = types[0];
            else if(r < 0.7) type = types[1];
            else type = types[2];
            
            NotificationService.add({message:msg,type:type})
        },
        setOrigin: () => {
            const formdata = Form(1);
            let field = formdata.get()[0];
            field.label = "origin";
            field.modelName = "origin";
            field.initialValue = FailoverService.getFailoverHost();

            FormModalService.open({
                title:'Set the host origin. eg. http://intracomsystems.net',
                form:formdata,
                submit:submitted=>{
                    let origin = submitted.origin;
                    Util.setHost(origin);
                },
            });
        }

    }
})


/*
 * Component to show the user the progress of an action
 * Interfacing with this component is done through two attributes,
 * 'status', and 'message', shown below.
 */

app.directive('myform', function() {
    return {
      scope: {},
      restrict: 'E', // matches <myform> HTML elements only
      bindToController: {
        models:    '=',
        formdata: '=', // 
      },
      controller: function($scope,BrowserStorageService) {
            $scope.$watch("ctrl.formdata",formdata=>{
                if(formdata){
                    /* Initialize form values */
                    formdata.get().forEach(field=>{
                        let current = $scope.ctrl.models[field.modelName];
                        if(current){
                            //already initialized
                        }
                        else{
                            /* Initialize with initialValue property */
                            /* For toggle switches, default to initial value of "OFF" */
                            if(field.type == "toggleSwitch" && field.initialValue == undefined){
                                $scope.ctrl.models[field.modelName] = "OFF";
                            }
                            if(field.type == "imagefile" && field.initialValue != undefined){
                                $scope.ctrl.models[field.modelName] = {label:field.initialValue,value:field.initialValue};
                            }
                            else if(field.initialValue != undefined && !field.usingLocalStorage){
                                $scope.ctrl.models[field.modelName] = field.initialValue;
                            }

                            /* Initialize with localstorage property if it exists */
                            if(field.localStorage){
                                let stored = BrowserStorageService.get(field.localStorage);
                                let current = $scope.ctrl.models[field.modelName];
                                if(current === undefined && stored !== undefined){ // prefer initialValue over localStorage property
                                    $scope.ctrl.models[field.modelName] = stored;
                                }
                            }
                        }
                        
                    })
                }
            })
            /* Called every time any of our models changes, including each type a character is typed in a field  */
            $scope.$watchCollection("ctrl.models",models=>{
                /* localStorage save on any change (not waiting for submit to save) */
                if($scope.ctrl.formdata){
                    $scope.ctrl.formdata.get().forEach(field=>{
                        if(field.localStorage){
                            let newValue = models[field.modelName];
                            BrowserStorageService.setLocal(field.localStorage,newValue);
                        }
                    })
                }
            })
      },
      controllerAs: 'ctrl',
      templateUrl: Util.url('/SystemAdmin/views/myform-template.html')
    }
});

app.factory("FormModalService",function($uibModal,BrowserStorageService){
    /* object to store values when 'rememberOnSubmit' is enabled.
    Uses the 'title' of the form-modal as the key, and the remembered values as the value.
    */
    let memories = {};
    const DEFAULT_SIZE = 'md';
    const SIZE_NAMES = {
        "small":"sm",
        "large":"lg",
        "medium":"md",
        "sm":"sm",
        "lg":"lg",
        "md":"md"
    }
    /*
        This function accepts a 'params' object that should have the following properties:
        'title': a string that will be displayed as the title of the form modal. Also uniquely identifies the form for 'rememberOnSubmit'
        'submit': a function that takes in an object representing the results of the form
        'onChange': a function to trigger whenever the models are updated
        'rememberOnSubmit': a boolean that determines if we should remember what the user has chosen for next time they open the dialog
        'rememberOnChange': a boolean like above but updates on any input changing rather than on submitting
        'closeOnSubmit': a boolean
        'form': a Form object (take a look at js/Form.js in this project)

        each field has the following properties
        'label'
        'modelName'
        'initialValue'
        'localStorage'
        'type'
    */

    const defaultParams = {
        rememberOnSubmit:false,
        rememberOnChange:false, // by default, remembers on submit
        hasSubmit:true,
        onChange:()=>{},
        title:'Form',
        closeOnSubmit:true
    }
    const open = params => {
        params = Object.assign({},defaultParams,params);
        let size = SIZE_NAMES[params.size] || DEFAULT_SIZE;
        const modalInstance = $uibModal.open({
            controller: function($scope,$uibModalInstance,$timeout){
                $scope.params = params;

                /* trigger onchange fn */
                $scope.$watchCollection("params.models",newModels => {
                    if($scope.params.rememberOnChange){
                        memories[$scope.params.title] = newModels;
                    }
                    $scope.params.onChange(newModels);
                })
                /* Submit button */
                $scope.submit = () => {
                    $scope.params.submit($scope.params.models);
                    if($scope.params.rememberOnSubmit){
                        memories[$scope.params.title] = $scope.params.models;
                    }
                    $scope.params.form.get().forEach(field=>{
                        let storageName = field.localStorage;
                        if(storageName){
                            BrowserStorageService.set(storageName,$scope.params.models[field.modelName]);
                        }
                    })
                    if($scope.params.closeOnSubmit){
                        $uibModalInstance.close();
                    }
                }
                /* Cancel button */
                $scope.cancel = () => {
                    $uibModalInstance.dismiss();
                }
                /* Submit form if it is filled in and Enter is pressed */
                const isFilledIn = () => {
                    const numFields = $scope.params.form.get().length
                    console.log($scope,"scope");
                    const numCompletedFields = Object.keys($scope.params.models).length;
                    console.log("numfields, num completed",numFields,numCompletedFields,$scope.params.models);
                    return numCompletedFields == numFields;
                }
                // let handleKeydown = event => {
                //     if (event.which === 13) { // Enter is pressed
                //         console.log("enter pressed");
                //         if(isFilledIn()){
                //             $scope.submit();
                //         }
                //     }
                // }
                // $(document).on("keydown",handleKeydown); // Listen for Enter
                // $scope.$on("$destroy",()=>{ // No matter if the user submits or cancels the form
                //     $(document).off("keydown",handleKeydown); // we have to stop listening for enter
                // })
                /* Automatically focus first <input> element */
                $timeout(()=>{
                    let firstModelName = $scope.params.form.get()[0].modelName;
                    console.log($scope,"scope");
                    let id = firstModelName+"_id_for_myform";
                    $("#"+id).focus();
                },100);

                /* remember what the user previously chose */
                if($scope.params.rememberOnSubmit || $scope.params.rememberOnChange){
                    $scope.params.models = memories[$scope.params.title];
                }
                if($scope.params.models == undefined){
                    $scope.params.models = {};
                }

                /* Initialize form values */
                $scope.params.form.get().forEach(field=>{
                    /* For toggle switches, default to initial value of "OFF" */
                    if(field.type == "toggleSwitch" && field.initialValue == undefined){
                        $scope.params.models[field.modelName] = "OFF";
                    }
                    /* Otherwise, default initial values are undefined
                    here we implement specified initial values.
                    It looks like the <option value='360'> that gets created can only really be a string rather than a number 
                    So if we set initialValue to 360, it turns into the string '? number:360 ?'. So initial values of numbers
                    may not work without some finagling */
                    if(field.initialValue != undefined){
                        $scope.params.models[field.modelName] = field.initialValue;
                    }
                    let stored = BrowserStorageService.get(field.localStorage);
                    if(field.localStorage !== undefined && stored !== undefined){
                        field.usingLocalStorage = true;
                        $scope.params.models[field.modelName] = stored;
                    }
                    
                })
            },
            templateUrl: Util.url('/SystemAdmin/views/formModal-template.html'),
            size:size
            // backdrop: 'static', // this option would prevent the modal from closing if user clicks outside
        });
    }
    return {
        open:open
    }
})
/* wrapper for accessing query string */
app.factory("QueryStringService",function(){
    const getProperty = propName => getQueryString()[propName];
    const getQueryString = () => {
        let map = new URI().query(true); // true parameter here returns a map rather than a string
        Object.keys(map).forEach(key=>{ 
            let val = map[key];
            // treat ?debug as {debug:true}
            if(val===null){
                map[key] = true;
            }
            // treat ?debug=false as {debug:false}
            if(val==="false"){
                map[key] = false;
            }
            // otherwise, values will be strings. ?debug=off => {debug:"off"} which would mean QueryStringService.get('debug') would be 'truthy'
        })
        return map;
    }
    /* take a list of property names and return the first value found for any of them, or undefined if none are found.
    the empty string counts as something being found */
    const firstToExist = propNames => propNames.find(propName=>getProperty(propName)!== undefined)
    const findOneOf = propNames => {
        let propName = firstToExist(propNames);
        if(propName != undefined){
            return getProperty(propName);
        }
    }
    function get(arg){
        if(arg===undefined){
            return getQueryString();
        }
        return getQueryString()[arg];
    }
    console.log("querystring",get()); // upon initialization, print out what we think the query string is
    return {
        get,
        getProperty:getProperty,
        findOneOf:findOneOf,
        getQueryString:getQueryString
    }
})

app.factory("DebugService",function(){
    let debugEnabled = false;   // Determines whether or not to show the option to turn debugging features on/off
    const enable = () => debugEnabled = true; 
    const toggle = () => debugEnabled = !debugEnabled;

    function display(obs){
        let container = $("#debugDisplay");
        if(!container){
            $("body").append($("<div id='debugDisplay'>"))
        }
        let newItem = $("<div>");
        newItem.text(obs.get());
        obs.on(newItem.text);
        container.append(newItem);
    }
    return {
        enable:enable,
        toggle:toggle,
        isEnabled:()=>debugEnabled
    }
})

app.factory("ExposerService",function(){
    let exposing = {};
    const set = (k,v) => exposing[k] = v;
    const get = k => exposing[k];
    return {
        set:set,
        get:get
    }
})

app.factory("OriginService",function(BrowserStorageService,$injector,EventService,QueryStringService){
    /* The origin is made up of three parts
        protocol : "http"
        hostname:  "192.168.1.13"
        port:      "80"
    */

    let uri;
    let defaultURI;

   const getDefaultOrigin = () => {
        const PRIMARY_HOST = location.origin;
        /* get environment variables */
        var env = {};
        if(window){  
            Object.assign(env, window.__env);
        }
        var host;
        /* determine which API we'll use */

        if(env.hosts == undefined){ // in case something is wrong with the env.js file, don't bother trying to access it
            host = PRIMARY_HOST
        }
        else if(Util.isOnGithub()){
            host = env.hosts.github;
        }
        else if(Util.isNgrok()){
            host = env.hosts.ngrok;
        }
        else if(env.environment == "development"){
            let port = parseInt(location.port);
            if(env.hosts[port]){
                host = env.hosts[port]
            }
            else{
                host = PRIMARY_HOST;
            }
        }
        else{
            host = PRIMARY_HOST;
        }
        return host;
    };

    const init = () => {
        let storedProtocol = BrowserStorageService.get("configuration-HTTPS")=="ON"?"https":"http";
        let storedHostname = BrowserStorageService.get("configuration-hostname");
        let storedPort = BrowserStorageService.get("configuration-port");
        let storedURI;
        /* URI.js will throw an error if we try to set port to something nonsensical like 'asdf'
        So check each property to make sure it's okay, and if an error is thrown then go ahead
        and reset to default by removing the stored bad value */
        if(storedHostname && storedPort && storedProtocol){
            storedURI = new URI();
            try{
                storedURI.port(storedPort)
            }catch(e){
                BrowserStorageService.remove("configuration-port");
            }
            try{
                storedURI.hostname(storedHostname);
            }catch(e){
                BrowserStorageService.remove("configuration-hostname");
            }
            try{
                storedURI.protocol(storedProtocol);
            }catch(e){
                BrowserStorageService.remove("configuration-HTTPS");
            }
            storedURI.path(null).fragment(null);
        }
        console.log("stored origin",storedProtocol,storedHostname,storedPort);

        /* If the URL is telling us to suppress normal default origin behavior, then we leave the origin 'blank'.
        If an origin is saved from previous use, then we will still go with that one*/
        if(QueryStringService.getProperty("clearConfig")){
            uri        = new URI().port(443).hostname(null);
            defaultURI = new URI().port(443).hostname(null);
        }
        else{
            defaultURI = new URI(getDefaultOrigin());
            uri        = new URI(getDefaultOrigin()); // making this its own copy instead of setting uri = defaultURI so that defaultURI doesn't get clobbered
        }
        /* If we've stored a preferred origin, then draw from that origin's env.js */
        if(storedURI){
            let storedOrigin = storedURI.origin();
            if(storedOrigin != defaultURI.origin()){
                uri = storedURI;
                EventService.emit("originChanged",{showSuccess:false});
            }
        }
        EventService.emit("OriginServiceInitialized")
        EventService.emit("initializeBranding");
    }


    const setProtocol = newProtocol => {
        console.log("setProtocol",newProtocol);
        let result;
        try{
            uri = uri.protocol(newProtocol);
            result = false;
        }
        catch(e){
            result = e;
        }
        return result;
    }
    const setHostname = x => {
        console.log("setHostname",x);
        let result;
        try{
            uri = uri.hostname(x);
            result = false;
        }
        catch(e){
            console.log("bad hostname",e);
            result = e;
        }
        return result;
    }
    const setPort = x => {
        console.log("setPort",x);
        let result;
        try{
            uri = uri.port(x);
            result= false;
        }
        catch(e){
            result = e;
        }
        return result;
    }

    const testOrigin = () => {
        return $injector.get("APIService").get("/ssl/status");
    }

    const getOrigin = () => uri.origin(); // https://intracomsystems.net:8443
    const getHost = () => uri.host(); // intracomsystems.net:8443
    const getHostname = () => uri.hostname(); // intracomsystems.net
    const getPort = () => uri.port(); // 8443
    /* This function helps return "80" or "443" instead of "".
    The URI won't have one of these default ports in the string but we would still like to see it */
    const getExplicitPort = uri => uri.port() || $injector.get("URLService").getAutoPort(uri.protocol());
    const getDefaultPort = () => getExplicitPort(defaultURI);
    const getDefaultHostname = () => defaultURI.hostname();

    const isSecure = (input) => {
        if(!input)input = uri;
        return input.protocol().includes("https");
    }

    // normally we would call init() here, but in order for originChanged event handling
    // to work, we need to init AFTER the event handling is set up.
    // So that all happens in an app.run block in app.js
    return {
        init,
        setProtocol,
        setHostname,
        isSecure,
        setPort,
        getPort,
        getOrigin,
        testOrigin,
        getDefaultPort,
        getDefaultHostname,
        getHostname,
        getHost
    }
})

app.factory("URLService",function($location, SystemSettingsService){


    /* here a hostname means an ip address, like "192.168.1.13" */
    const hostnameToTitle = endpoint => {
        let settings = SystemSettingsService.get();
        if(endpoint == settings.IP_ADDRESS_FOR_PRIMARY_SERVER) return "primary";
        if(endpoint == settings.IP_ADDRESS_OF_NAT_FOR_PRIMARY_SERVER) return "primaryNAT";
        if(endpoint == settings.IP_ADDRESS_FOR_SECONDARY_SERVER) return "secondary";
        if(endpoint == settings.IP_ADDRESS_OF_NAT_FOR_SECONDARY_SERVER) return "secondaryNAT";
        return undefined;
    }
    const titleToHostname = title => {
        let settings = SystemSettingsService.get();
        return {
            primary:settings.IP_ADDRESS_FOR_PRIMARY_SERVER,
            primaryNAT:settings.IP_ADDRESS_OF_NAT_FOR_PRIMARY_SERVER,
            secondary:settings.IP_ADDRESS_FOR_SECONDARY_SERVER,
            secondaryNAT:settings.IP_ADDRESS_OF_NAT_FOR_SECONDARY_SERVER
        }[title];
    }
    const getCurrentPort = () => $location.port();
    const getCurrentHostname = () => $location.host();
    const getCurrentProtocol = () => $location.protocol();
    const knownHost = () => {
        let currentHost = $location.host()+":"+$location.port();
        let settings = SystemSettingsService.get();
        if(currentHost == settings.IP_ADDRESS_FOR_PRIMARY_SERVER) return "primary";
        if(currentHost == settings.IP_ADDRESS_OF_NAT_FOR_PRIMARY_SERVER) return "primaryNAT";
        if(currentHost == settings.IP_ADDRESS_FOR_SECONDARY_SERVER) return "secondary";
        if(currentHost == settings.IP_ADDRESS_OF_NAT_FOR_SECONDARY_SERVER) return "secondaryNAT";
        return undefined;
    }
    const isOnPublicIP = () => knownHost() == "primary" || knownHost() == "secondary";
    const isOnPrivateIP = () => knownHost() == "primaryNAT" || knownHost() == "secondaryNAT";
    const getDowngradedPort = () => {
        let port = parseInt($location.port());
        let downgraded = {
            443:80,
            2443:2080,
            3443:3080,
            4443:4080,

        }
        if(downgraded[port] !== undefined){
            port = downgraded[port];
        }
        return port;
    }
    const getUpgradedPort = () => {
        let port = parseInt($location.port());
        let upgraded = {
            80:443,
            2080:2443,
            3080:3443,
            4080:4443,

        }
        if(upgraded[port] !== undefined){
            port = upgraded[port];
        }
        return port;
    }

    const isConnectionSecured = () => {
        const protocol = $location.protocol();
        return (protocol == "https");
    }

        /* Make a URL out of its components.
    In Angularjs, protocols don't include a trailing colon */
    const combineURLComponents = (protocol,host,port,path) => {
        return protocol + "://" + host + ":" + port + path;
    }

    const getAutoPort = protocol => {
        if(protocol.includes("https")) return "443";
        if(protocol.includes("http")) return "80";
    }

    const sanitizeHost = host => {
        if(Util.endsWith(host,"/")){
            return host.slice(0,-1);
        }
        return host;
    }

    /* Build a URL given an object with optional values for 
    protocol, 
    host, (like www.example.com, not www.example.com:8080). Generally called a 'hostname'. Gotten by $location.host() but not location.host
    port, (like 80 or 443)
    path (like /SystemAdmin/index.html)
    queryParameters (like {name:'admin',pass:'1234'} or ['name=admin','pass=1234'])
    If any values are missing, then use the current value of the page */
    const buildURL = components => {
        const protocol = components.protocol ? components.protocol : $location.protocol();
        const host = sanitizeHost(components.host ? components.host : $location.host());
        /* Allow the option to deduce the port from the protocol/scheme, by putting {"port":"scheme"} in the components obj */
        let autoPort = (components.port=="protocol" || components.port=="scheme" || components.port=="auto")?getAutoPort(protocol):undefined;
        let normalPort = components.port ?  components.port : $location.port();
        const port = autoPort? autoPort : normalPort;
        let path = components.path ? components.path : $location.path();
        path = Util.url(path); // modify absolute path if necessary
        const urlBase = combineURLComponents(protocol,host,port,path);
        let queryString = Util.toQueryString(components.queryParameters)
        let url = urlBase + queryString;
        return url;
    }

    return {
        isConnectionSecured:isConnectionSecured,
        buildURL:buildURL,
        getUpgradedPort:getUpgradedPort,
        getAutoPort,
        getCurrentPort,
        isOnPrivateIP,
        isOnPublicIP,
        getCurrentHostname,
        getCurrentProtocol,
        hostnameToTitle,
        titleToHostname,
        getDowngradedPort:getDowngradedPort
    }
});


/* Create and modify a dynamic stylesheet to help implement our dynamic UI settings */
app.factory("StylesheetService",function(){
    let id = Util.generateUUID();
    let rules = {}

    const init = () => {
        $("head").append("<style id='"+id+"'></style>");
    }
    /* Internal function to add the rule without updating the stylesheet */
    const justAddRule = (selector,prop,val) => {
        let rule = rules[selector] || [];
        rule.push(prop+":"+val+";");
        rules[selector] = rule;
    }
    /* Exposed function to add a rule and update stylesheet */
    const addRule = (selector,prop,val) => {
        justAddRule(selector,prop,val);
        updateSheet();
    }
    const addRules = (selector,obj) => {
        Object.keys(obj).forEach(prop=>{
            let val = obj[prop];
            addRule(selector,prop,val);
        })
        updateSheet();
    }
    const updateSheet = () => {
        let text = "";
        Object.keys(rules).forEach(selector=>{
            text += selector +"{" + rules[selector].join("\n") + "}\n";
            // console.log("css text",text);
        })
        $("#"+id).text(text);
    }
    const deactivate = () => {
        $("#"+id).attr("disabled",true);
    }
    const activate = () => {
        $("#"+id).attr("disabled",false);
    }
    init();
    return {
        addRule:addRule,
        addRules:addRules
    }
})

app.factory("TimeService",function(){

    function simplify(ms){
        if(!Number.isFinite(ms)) return "NaN";
        if(ms < 0) return "0";
        if(ms < 1000) return "<1s"
        if(ms < 1000*60*2) return toSeconds(ms)+"s"; // under 2 minutes
        if(ms < 1000*60*60*2) return toMinutes(ms)+"m"; // under 2 hours
        if(ms < 1000*60*60*24*2) return toHours(ms)+"h"; // under 2 days
        return toDays(ms)+"d";
    }
    function toMinutes(ms){
        return Math.floor(ms/60000);
    }
    function toSeconds(ms){
        return Math.floor(ms/1000);
    }
    function toHours(ms){
        return Math.floor(ms/(60*60*1000))
    }
    function toDays(ms){
        return Math.floor(ms/(24*60*60*1000));
    }
    function timeSince(date){
        let startMS = date;
        let endMS = new Date().getTime()
        let diff = endMS-startMS;
        return simplify(diff);
    }
    return {
        timeSince
    }
})
/* global app Util Form $ */
app.controller('LogonController',
function($scope, $state, AuthenticationService, ConnectionService, FormModalService, EventService, AndroidService, EnabledService, CertificateService, OSKService,
    RedirectService, NotificationService, ProgressBarService, AutoLoginService, WhichPageService, OriginService, BrowserStorageService, StateService) {

    const ALLOW_GUEST_LOGIN = EnabledService.guestLogins();
    const DELAY_BEFORE_USERNAME_AND_PASSWORD_MODIFICATION = 500; // ms
    const DEFAULT_TO_GUEST = true;

    $scope.versionNumber = window.vcomBuildVersion;

    $scope.getLoginAsUserButtonText = () => {
        if(ALLOW_GUEST_LOGIN){
            return "Login as " + ($scope.loginAsGuest?"Guest":"User");
        }
        else{
            return "Login";
        }
    }
    $scope.downloadCertificate = () => {
        CertificateService.downloadCertificate();
    }

    const init = () => {
        $scope.isAuthenticating = false; // When true, this property disables the login button so we can't spam it.
        // RedirectService.redirectToHTTPSIfNecessary().then(()=>{
        //     console.log("Redirecting to HTTPS");
        // },reason=>{
        //     console.log("Not redirecting to HTTPS",reason);
        // })
        AutoLoginService.register(()=>{
            $("form.login").submit()
        },$scope);
        $scope.handleFormSubmission = handleFormSubmission;
        $scope.showConfiguration = showConfiguration;
        $scope.allowGuestLogin = ALLOW_GUEST_LOGIN;
        let storedGuestMode = BrowserStorageService.get("login-guest-mode");
        let desiredGuestMode = storedGuestMode == undefined? DEFAULT_TO_GUEST : storedGuestMode;
        $scope.loginAsGuest = ALLOW_GUEST_LOGIN && desiredGuestMode;
        /* Here we give the browser ample time to complete any autofilling it wants to do before we mess with the username/password */
        Util.wait(DELAY_BEFORE_USERNAME_AND_PASSWORD_MODIFICATION).then(()=>{
            autofillCredentials();
            CertificateService.promptDownloadIfNecessary();
        });
    }
    $scope.$watch("loginAsGuest",newValue=>{
        BrowserStorageService.set("login-guest-mode",newValue);
    });

    const showConfiguration = () => {
        let form = Form();
        let field = form.get(0);
        field.label = "Virtual Matrix IP Address";
        field.modelName = "hostname";
        field.initialValue = OriginService.getDefaultHostname();
        field.localStorage = "configuration-hostname";
        field.placeholder   = OriginService.getDefaultHostname();
        field = form.get(1);
        field.label = "Port";
        field.modelName = "port";
        field.initialValue = OriginService.getDefaultPort();
        field.placeholder  = OriginService.getDefaultPort();
        field.localStorage = "configuration-port";
        field = form.get(2);
        field.type="toggleSwitch";
        field.label="HTTPS";
        field.initialValue = "ON";
        field.localStorage = "configuration-HTTPS";
        field.modelName="HTTPS";
        field = form.get(3);
        field.type="button";
        field.label="Certificate";
        field.buttonLabel = "Download Certificate";
        field.fn = ()=>{
            $scope.downloadCertificate();
        };
        field = form.get(4);
        field.type="toggleSwitch";
        field.label="On-Screen Keyboard";
        field.initialValue = OSKService.get()?"ON":"OFF";
        field.modelName="osk";

        FormModalService.open({
            title:"Configuration",
            form:form,
            // buttons:[
            //     {
            //         label:"Reset to Default",
            //         fn:function(params){
            //             params.models.hostname=OriginService.getDefaultHostname()
            //         }
            //     }
            // ],
            submit:submitted=>{
                console.log("submitted",submitted);
                // Util.setHostname(submitted.hostname);
                // Util.setHostport(submitted.port);
                let badhostname = false;
                let badport = false;
                badhostname  = OriginService.setHostname(submitted.hostname);
                badport = OriginService.setPort(submitted.port);
                OriginService.setProtocol(submitted.HTTPS=="ON"?"https":"http");
                (submitted.osk == "ON")?OSKService.enable():OSKService.disable();

                if(badhostname || badport){
                    if(!badport){
                        NotificationService.add({message:"bad hostname: ("+submitted.hostname+"). Try again (no http:// at the beginning)"})
                    }
                    else if(!badhostname){
                        NotificationService.add({message:"bad port: ("+submitted.port+")."})
                    }
                    else{
                        NotificationService.add({message:"bad port and hostname: ("+submitted.hostname+").Try again (no http:// at the beginning)"})
                    }
                }
                else{
                    EventService.emit("originChanged");
                }
                // BrowserStorageService.set("configuration-hostname",submitted.hostname);
            }

        })
    }

    /*
    * We have to do some gymnastics in order to get Chrome to ask the user to save their password.
    * Chrome would prefer that we submit a form and navigate to a new page.
    * Instead, we prevent the form's submission, and if we successfully log in,
    * we hide the form and send an AJAX request to a new page as if we were navigating there.
    */
    const sendDecoyRequest = () => {
        var request = new XMLHttpRequest();
        request.open('GET', Util.url('/SystemAdmin/index.html'), true);
        request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        request.send();
    }

    const goHome = () => {
        if(WhichPageService.isCP()){ // VCP
            StateService.goToWaitingRoom();
            // $state.transitionTo("waitingRoom",null,{reload:true,notify:true});
        }
        else if(AuthenticationService.isTIF()){ // VSA TIF
            $state.transitionTo("telephoneInterface",null,{reload:true,notify:true});
        }
        else{ // VSA normal
            $state.transitionTo("home",null,{reload:true,notify:true});
        }
    }

    /* Remove login field highlighting when the user types into the field */
    $scope.$watch("userName",newValue=>{
        if(newValue && newValue.length > 0){
            $("#login2").removeClass("highlight");
        }
    })

    const promptToFillInUsername = () => {
        Util.refreshAnimation($("#login2"),"highlight"); // highlight the empty login field
        $("#login2").focus();
    }

    const handleFormSubmission = event => {
        event.preventDefault();
        try{

            // /* Warn user if no origin is set up */
            let hostname = OriginService.getHostname();
            console.log("hostname",hostname);
            if(!hostname){
                NotificationService.add({message:"Not connected to any server. Open the Configuration dialog."})
                return;
            }

            setTimeout(()=>{
                try{
                    /* Prevent error where angular doesn't realize that the forms have been autofilled */
                    $scope.userName = $("#login2").val();
                    $scope.password = $("#password2").val();
                    /* If username is not filled out, remind the user to fill it out.
                    Empty username is NOT a valid use case */
                    if(!$scope.userName){
                        promptToFillInUsername();
                        return;
                    }
                    /* Empty password is a valid use case
                    So the only time we modify the supplied password is if the user is trying to log in as a guest */
                    if(ALLOW_GUEST_LOGIN && $scope.loginAsGuest){
                        $scope.password = "guest";
                    }
                    
                    $scope.isAuthenticating = true;
                    let promise = ConnectionService.loginManual($scope.userName, $scope.password);
                    ProgressBarService.track(promise,{showFailure:false});
                    promise.then( () => {
                        event.target.style.display = 'none'; // hide form (for Chrome save-password prompt)
                        sendDecoyRequest(); // send decoy request (for Chrome save-password prompt)
                        if(AndroidService.isEnabled()){
                            AndroidService.setPreference("loginName",$scope.userName);
                            AndroidService.setPreference("loginPass",$scope.password);
                        }
                    })
                    .catch(reason=>{
                        const messageBase = "Failed to log in.";
                        let messageSpecifics = Util.getPropertySafe(reason,"data","MESSAGE");
                        if(messageSpecifics == null) messageSpecifics = "";
                        const message = messageBase + " " + messageSpecifics;
                        NotificationService.add({message:message,type:"danger",topic:"login"});
                        console.log(reason,"failed to log in");
                    })
                    .finally(()=>{
                        $scope.isAuthenticating = false;
                    })
                }catch(e){ //cleanup if some error occurs
                    handleLoginError(e);
                }
            },1) // timeout duration of 1ms
        }catch(e){ //cleanup if some error occurs
            handleLoginError(e);
        }
    }

    function handleLoginError(e){
        NotificationService.add({message:"Error logging in",type:"danger",topic:"login"})
        ProgressBarService.clear();
        console.error("Error logging in",e);
        $scope.isAuthenticating = false;
    }

    function autofillCredentials(){
        if(AuthenticationService.rememberMe()){
            if(AndroidService.isEnabled()){
                // on Android we don't have access to browser storage so we use their system of saving preferences
                $scope.userName = AndroidService.getPreference("loginName");
                $scope.password = AndroidService.getPreference("loginPass");
            }
            else{
                // not on Android...
                Util.waitForElement("#password2").then(()=>{
                    if($("#password2").val()){
                        // the browser has autofilled credentials for us
                    }
                    else{
                        $scope.userName = BrowserStorageService.get("BAD_PRACTICE_username");
                        $scope.password = BrowserStorageService.get("BAD_PRACTICE_password");
                        if($scope.password){
                            $("#password2").val($scope.password).css("background","#00c0ff0f");
                        }
                        if($scope.userName){
                            $("#login2").val($scope.userName).css("background","#00c0ff0f");
                        }
                    }
                })
            }
        }
        else{
            // we are intentionally not storing the user's credentials, do nothing
        }
    }

    /* Trigger this every time we enter the logon controller */
    $scope.$on('$viewContentLoaded', function() {
        init();
    });
});
/* global app $ */
app.controller('ModalConfirmerController',function($scope, $uibModalInstance, $timeout, options) {
    
    $scope.ok = function() {
        $uibModalInstance.close();
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss();
    };

    if(options.focusOkay){
        $timeout(()=>{
            $("#modalConfirmerOkayButton").focus();
        },100);
    }

    $scope.message = options.message;
    $scope.okayLabel = options.okayLabel;
    $scope.cancelLabel = options.cancelLabel;
    $scope.title = options.title;
    $scope.messageClass = options.messageClass;

});
    
    
const Geo = (()=>{
    /* Settings */
    let width = 500; // default width and height
    let height = 500;


    /* Helper functions */
    const rad = deg => deg * Math.PI / 180;
    const sin = deg => Math.sin(rad(deg));
    const deg = rad => rad*180/ Math.PI;
    /* Parameters */
    const LATITUDE_LIMIT = 85;

    /* Convert from lat,lon to a point on a unit square */
    /* point is an object with properties 'lat' and 'lon'. -90 < lat <= 90, -180 < lon <= 180 */
    const mercatorProject = (point) => {
        return {
            x: rad(point.lon) / (2 * Math.PI) + 0.5,
            y: (Math.atanh(sin(LATITUDE_LIMIT)) - Math.atanh(sin(point.lat))) / (2 * Math.PI)
        }
    }
    /* Convert from unit square back to lat,lon */
    /* point is an object with properties 'x' and 'y' that are both floating point numbers between 0 and 1 */
    const mercatorInverse = (point) => {
       return {
            lon: deg((2 * point.x - 1) * Math.PI),
            lat: deg(Math.asin(Math.tanh((Math.atanh(sin(LATITUDE_LIMIT)) - 2 * Math.PI *point.y))))
        }
    }

    const setWidth = w => width = w;
    const setHeight = h => height = h;
    const pointFromLatLon = (lat,lon) => {
        lat = parseFloat(lat);
        lon = parseFloat(lon);
        let p = {
            lat:lat,
            lon:lon
        };
        let projected = mercatorProject(p);
        p.x = projected.x;
        p.y = projected.y;
        p.xOffset = p.x*width;
        p.yOffset = p.y*height;
        return p;
    }
    const pointFromOffsets = (xOffset,yOffset) => {
        let p = {
            xOffset:xOffset,
            yOffset:yOffset,
            x:xOffset/width,
            y:yOffset/height
        }
        let inverseProjected = mercatorInverse(p);
        p.lat = inverseProjected.lat;
        p.lon = inverseProjected.lon;
        return p;
    }

    const normalizeLongitude = lon => {
        if(Number.isFinite(lon)){
            while(lon < -180){lon+=360;}
            while(lon > 180){lon-=360;}
        }
        else{
            console.error("can't normalize longitude",lon);
        }
        return lon;
    }

    return {
        mercatorInverse:mercatorInverse,
        mercatorProject:mercatorProject,
        pointFromLatLon:pointFromLatLon,
        pointFromOffsets:pointFromOffsets,
        normalizeLongitude:normalizeLongitude,
        setWidth:setWidth,
        setHeight:setHeight
    }
})();
/* global L Util Geo angular $ app */

/* This Object wraps functionality that we use from the leaflet library */
const defaultConfig = {
    online:false,
    maxZoom:9
}
/* L is the variable exposed by the leaflet-dist directory */

app.factory('LeafletFactoryService',function(ResourceService){
    function create(config){
        config = Object.assign({},defaultConfig,config);
        /* Parameters */
        const defaultLat = 35.8283;
        const defaultLon = -98.5795;
        // const defaultLat = 46.8182;
        // const defaultLon = 8.2275;
        const defaultZoom = 5;
        const minZoom = config.minZoom
        const maxFullLocalZoom = config.maxFullLocalZoom // Zoom levels above this will just be stretched images from zoom level 6 (For the base tile layer)
        const maxSomeLocalZoom = config.maxSomeLocalZoom;
        const maxZoom = config.maxZoom;
        const copyMarkersToTheLeft = 1;
        const copyMarkersToTheRight = 1;
        const saveMode = false;
        // const onlineBaseMode = config.onlineBaseMode;
        const onlineSupplementMode = config.onlineSupplement; // controls whether or not we get higher detail zoom tiles from an online source
        const onlineOnlyMode = saveMode; // controls whether we get ALL tiles from an online source
       
        /* If you switch saveMode to true, then the map will receive tiles from the mapbox server, online.
            As you browse through the map, tiles you download from the server will also be saved to your downloads folder.
            Then you can copy those files into this project (in the Geo/images directory) and you'll be able
            to serve those files offline (when saveMode is false)
        */
    
        /* zoom levels
            0: 1 image at 256x256 pixels
            1: 4 images
            2: 16
            3: 64
            4: 256
            5: 1024
        */
    
        const localTileHost = ResourceService.getGeotileDirectory()+'{z}/image_{z}_{x}_{y}.png';
        const remoteTileHost = 'https://api.tiles.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token={accessToken}'
        const mapOptions = {
            worldCopyJump:true, // if we pan left/right too far, our view gets teleported back to the original map
            attributionControl:false // don't show credit to Leaflet / OpenStreetMap / MapBox in the bottom right
        }
    
        /* Variables */
        let baseTileHost = onlineOnlyMode? remoteTileHost : localTileHost;
        let savedFiles;
        let map;
        let defaultIcon;
        let clusterMarkers; // from MarkerCluster plugin
        let allMarkers; // manually track all markers. Leaflet dev says they don't do this to save on memory. Otherwise we could use map.eachLayer
        let zoomObserver;
        // tile layers
        let baseTileLayer;
        let higherDetailTileLayer;
        let onlineHigherDetailTileLayer;
    
    
    
        const init = () => {
    
            savedFiles = [];
            allMarkers = [];
            zoomObserver = new Util.Observer();
    
            console.log("MAX ZOOMS",minZoom,maxFullLocalZoom,maxSomeLocalZoom,maxZoom)
    
            map = L.map(config.mapID,mapOptions).setView([defaultLat,defaultLon], defaultZoom);
            /* Main tile layer, generally restricted from zoom levels 0 through 6.
             Setting maxNativeZoom < maxZoom allows for us to zoom in further and get
             stretched versions of lower res tiles */
            baseTileLayer = L.tileLayer(baseTileHost, {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: maxZoom,
                maxNativeZoom: maxFullLocalZoom,
                minZoom: minZoom,
                id: 'mapbox.streets',
                errorTileUrl: ResourceService.getGeotile('errorTile.png'),
                accessToken: 'pk.eyJ1IjoibG92ZXN0ZXZlbmQiLCJhIjoiY2pldnRlenkyMjI4ZTJ4cDlnZ2t6eHJpMCJ9.TnOjq-lh1qzZJrUNeAf-YQ'
            }).on('tileload',e=>{
                if(saveMode){
                    saveTile(e);
                }
            })
    
            /* This higher detail layer has clear error tiles which allows a lower resolution layer beneath it to show through.
            This allows us to have a variety of levels of zoom depth with good failback to just a stretched lower res image.
            This is for our saved images at zooms of 7, 8, and 9, which only cover some areas of the US and Europe, not the whole world */
            higherDetailTileLayer = L.tileLayer(baseTileHost, {
                accessToken:'pk.eyJ1IjoibG92ZXN0ZXZlbmQiLCJhIjoiY2pldnRlenkyMjI4ZTJ4cDlnZ2t6eHJpMCJ9.TnOjq-lh1qzZJrUNeAf-YQ',
                maxZoom: maxSomeLocalZoom,
                minZoom: maxFullLocalZoom+1,
                errorTileUrl: ResourceService.getGeotile('clearErrorTile.png'),
            })
    
            /* This is an optional online layer for higher zoom levels (7-infinity) */
            onlineHigherDetailTileLayer = L.tileLayer(remoteTileHost, {
                id: 'mapbox.streets',
                accessToken: 'pk.eyJ1IjoibG92ZXN0ZXZlbmQiLCJhIjoiY2pldnRlenkyMjI4ZTJ4cDlnZ2t6eHJpMCJ9.TnOjq-lh1qzZJrUNeAf-YQ',
                maxZoom:maxZoom,
                minZoom:maxFullLocalZoom+1,
                errorTileUrl: ResourceService.getGeotile('clearErrorTile.png')
            });
            map.on('zoomend', function(e) {
                let zoomLevel = e.target._zoom;
                console.log("zoom level",zoomLevel);
                let query = "#"+config.mapID+ " .leaflet-zoom-amount-label";
                if(!$(query).length){
                    let newElement = $("<div>");
                    newElement.addClass("leaflet-zoom-amount-label");
                    newElement.css("width","100%");
                    newElement.css("text-align","center");
                    $("#"+config.mapID+" .leaflet-control-zoom a:nth-child(1)").after(newElement)
                }
                $(query).text(zoomLevel);
                zoomObserver.notify(zoomLevel);
            });
    
            /* Add the actual layers to the map */
            baseTileLayer.addTo(map);
            higherDetailTileLayer.addTo(map);
            if(onlineSupplementMode){
                onlineHigherDetailTileLayer.addTo(map);
            }
    
            /* Cluster Markers */
            Clustering.setup();
    
            /* Awesome Markers */
            defaultIcon = L.AwesomeMarkers.icon({
                icon: 'user',
                iconColor: 'black',
                markerColor:'white',
                prefix: 'fa'
            })
    
            return map;
        }
    
        const getAllMarkers = () => allMarkers;
        const isUnique = marker => marker.data.wrapOffset == 0;
        const getUniqueMarkers = () => allMarkers.filter(isUnique);
        const getMarkersByID = id => allMarkers.filter(marker=>marker.data.id == id)
        const zoomToFit = bounds => {
            if(bounds == undefined){ // zoom to fit all current markers
                let markers = getUniqueMarkers()
                bounds = markers.map(marker=>marker.getLatLng());
            }
            if(bounds.length < 1){
                console.log("Can't zoom to fit with no markers");
            }
            map.fitBounds(new L.LatLngBounds(bounds));
        }
    
        const Clustering = (() => {
            const MAX_CHILDREN_TO_ALWAYS_SHOW_TOOLTIP = 10;
            let baseTooltipOptions = {
                permanent:true,
                direction:"bottom",
                pane:"shadowPane"
            }
            let activeIDs;
            let onlineIDs;
    
    
            const customIconCreateFunction = cluster => {
                var childCount = cluster.getChildCount();
        
                var c = ' marker-cluster-';
                if (childCount < 10000) { // Let's keep them all green
                    c += 'small';
                } else if (childCount < 100) {
                    c += 'medium';
                } else {
                    c += 'large';
                }
    
                let radius = 40;
        
                return new L.DivIcon({
                    html: '<div><span>' + childCount + '</span></div>',
                    className: 'marker-cluster' + c,
                    iconSize: new L.Point(radius,radius)
                });
            }
    
            const setup = () => {
                activeIDs = Util.Set();
                onlineIDs = Util.Set();
                activeIDs.onChange(refreshTooltips);
                onlineIDs.onChange(refreshTooltips);
                const clusterOptions = {
                    maxClusterRadius:40, // px, defaults to 80. radius of circle within which items will cluster. smaller # means more smaller clusters
                    iconCreateFunction: customIconCreateFunction
                }
                clusterMarkers = L.markerClusterGroup(clusterOptions);
                map.addLayer(clusterMarkers);
                zoomObserver.on(()=>setTimeout(establishTooltips)); // delayed slightly so that the animation is actually done
                // clusterMarkers.on("animationend",establishTooltips);
    
                clusterMarkers.on("spiderfied",e=>{
                    console.log("spiderfied",e);
                    e.cluster.closeTooltip();
                })
                clusterMarkers.on("unspiderfied",e=>{
                    console.log("unspiderfied");
                    e.cluster.openTooltip();
                })
                /* Normal popups stay open until you mouse over another popup. This makes clusters behave in the same way
                where hovering over a cluster closes other popups */
                clusterMarkers.on('clustermouseover', ()=>{
                    map.closePopup();
                })
            }
    
            /* For creating the initial tooltip for a new cluster.
            Should be called when we zoom or add a new tracked client
            as either of these cases could create a new cluster */
            const establishTooltips = () => {
                console.log("establish tooltips");
                clusterMarkers._featureGroup.eachLayer(layer=>{
                    if(layer instanceof L.MarkerCluster ){
                        if(!layer.getTooltip()){
                            console.log("establishing...");
                            layer.bindTooltip(getTooltipHTML(layer),baseTooltipOptions);
                            /* implement hiding tooltip when the list of clients is too long */
                        }
                    }
                })
                refreshTooltips();
            }
    
            const getTooltipHTML = layer => {
                let markers = layer.getAllChildMarkers();
                let htmlElements = markers.map(m=>{
                    let classStr = '';
                    if(activeIDs.has(m.data.id)){
                        classStr += 'clusterTooltipActive '
                    }
                    else{
                        classStr += 'clusterTooltipInactive '
                    }
                    if(onlineIDs.has(m.data.id)){
                        classStr += 'clusterTooltipOnline';
                    }
                    else{
                        classStr += 'clusterTooltipOffline';
                    }
    
                    return "<span class='"+classStr+"'><span class='clusterTooltipIndicator'></span>"+m.data.label.LABEL_NAME+"</span>";
                });
    
                /* If the cluster is too big to display every child, then cap the list and add 'more...' to the end */
                if(htmlElements.length > MAX_CHILDREN_TO_ALWAYS_SHOW_TOOLTIP){
                    htmlElements = htmlElements.slice(0,MAX_CHILDREN_TO_ALWAYS_SHOW_TOOLTIP);
                    htmlElements.push("<span style='float:right'>more...</span>")
                }
                let html = htmlElements.join("<br>");
                return html;
            }
        
            /* Update the appropriate HTML for any existing tooltips
            Should be called whenever talk activity or online activity may be changed */
            const refreshTooltips = () => {
                clusterMarkers._featureGroup.eachLayer(function(layer) {
                    if (layer instanceof L.MarkerCluster) {
                        layer.openTooltip();
                        layer.setTooltipContent(getTooltipHTML(layer));
                    }
                })
                
            }
    
            const clusterWithID = id => {
                let foundLayer;
                clusterMarkers._featureGroup.eachLayer(function(layer) {
                    if (layer instanceof L.MarkerCluster) {
                        let markers = layer.getAllChildMarkers();
                        // console.log("looking for id",id,markers);
                        let found = markers.find(m=>{
                            return m.data.id == id
                        });
                        if(found)foundLayer=layer;
                    }
                })
                return foundLayer;
            }
            /* Input an array of marker IDs (specifically numbers, not strings).
            Then only the markers with those ids will be marked as active (within clusters) */
            const setActive = (newOnlineIDs,newActiveIDs) => {
                onlineIDs.set(newOnlineIDs);
                activeIDs.set(newActiveIDs);
            }
        
            return {
                refreshTooltips,
                establishTooltips,
                setup,
                setActive
            }
        })();
    
        /* Used in saveMode to save tiles to your downloads folder */
        const saveTile = (tileLoadEvent) => {
            let e = tileLoadEvent;
            let loadUrl = e.tile.currentSrc;
            let xMod = e.target._wrapX[1];
            let xCoord = Util.myMod(e.coords.x,xMod);
            let saveUrl = "image/"+e.coords.z+"/"+xCoord+"/"+e.coords.y+".png";
            // console.log("trying to save",saveUrl);
    
            if(savedFiles.includes(saveUrl)){
                // console.log("not saved",savedFiles);
                return;
            }
            console.log("saving",saveUrl);
            savedFiles.push(saveUrl);
    
            var xhr = new XMLHttpRequest();
            xhr.open('GET', loadUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = function() {
                if (this.status == 200) {
                    var blob = this.response;
                    Util.storeBlob(saveUrl,blob);
                }
            };
    
            xhr.send();
        }
    
        /* 5 decimal places gives precision of 1.1 meters */
        const trimPrecision = measurement => {
            return measurement.toFixed(5);
        }
        const setMarkerOpacity = (id,opacity) => {
            getMarkersByID(id).forEach(copy=>{
                copy.setOpacity(opacity);
            })
        }
        const setMarkersOnlineAndActive = (onlineIDs,activeIDs) => {
            activeIDs.forEach(id=>setMarkerOpacity(id,1));
            $("#"+config.mapID+" .soloTooltip").addClass("offline"); // sets all tooltips that aren't clusters to offline
            onlineIDs.forEach(id=>{
                $("#"+config.mapID+" .soloTooltipID"+id).removeClass("offline")
            }); // set the ones that are online to online
            Clustering.setActive(onlineIDs,activeIDs);
        }
        const setMarkerInactive = id => setMarkerOpacity(id,0.25);
    
        /* Markers don't automatically exist on all wrapping copies of the map, so we'll help them along */
        const addMarker = (point,data) => {
            // start from the centermost map
            let normalizedLon = Geo.normalizeLongitude(point.lon);
            let leftmost = -copyMarkersToTheLeft; // add markers to copied maps to the left
            let rightmost = copyMarkersToTheRight; // and to the right
            if(data.id == undefined) data.id = Math.random();
            for(let i = leftmost; i <= rightmost; ++i){
                let offset = i*360;
                let p = Geo.pointFromLatLon(point.lat,normalizedLon + offset);
                let dataCopy = angular.copy(data);
                dataCopy.wrapOffset = i;
                addMarkerHelper(p,dataCopy);
            }
            Clustering.establishTooltips();
            // Clustering.refreshTooltips();
        }
        const addMarkerHelper = (point,data) => {
            /* because of the trickery with creating 3 markers, one to the left and one to the right,
            we don't want the fake longitude ( < -180 or > 180 ) to be displayed */
            let normalizedLon = Geo.normalizeLongitude(point.lon);
            let latRounded = trimPrecision(point.lat);
            let lonRounded = trimPrecision(normalizedLon);
            /* The markup below combined with css of 'latlngPopup' class and with the precision trim above
            result in monospace coordinates that are aligned at the decimal with 5 digits after it */
            let marker = L.marker([point.lat,point.lon],{icon: defaultIcon});
            allMarkers.push(marker);
            let popup = L.popup.angular({
                template:`
                <table>
                    <tr>
                        <td><b>{{popup.labelName}}</b></td>
                    </tr>
                    <tr>
                        <td><b>Lat:</b></td>
                        <td class="latlngPopup">` + latRounded +`</td>
                    </tr>
                    <tr>
                        <td><b>Lng:</b></td>
                        <td class="latlngPopup">`+ lonRounded + `</td>
                    </tr>
                    <tr ng-if="false">
                        <td>
                            <button ng-click='popup.onClickTalk()' class="btn-control talk">Talk</button>
                            <button ng-click='popup.onClickListen()' class="btn-control listen">Listen</button>
                        </td>
                    </tr>
                </table>`
            ,
            controllerAs: 'popup',
            controller: ['$map', function($map) {
                var that = this;
    
                this.onClickListen = data.onClickListen;
                this.onClickTalk = data.onClickTalk;
                this.labelName = data.label.LABEL_NAME;
    
                // this.zoomIn = function() {
                //     $map.zoomIn();
                //     that.zoom = $map.getZoom();
                // };
    
                // this.zoomOut = function() {
                //     $map.zoomOut();
                //     that.zoom = $map.getZoom();
                // };
            }]})
            marker.bindPopup(popup)
            marker.on('mouseover', function (e) {
                console.log("mouseover",e);
                this.openPopup();
            });
            marker.data = data;
            /* Add a label as well! */
            marker.bindTooltip(data.label.LABEL_NAME, {
                permanent: true,
                direction:"bottom",
                className:' soloTooltip soloTooltipID'+data.label.ID, // adding the id in a class allows us to find these with jquery
                pane:'shadowPane' // attempt to get this to show up behind markers
            });
    
            // marker.addTo(map);
            clusterMarkers.addLayer(marker);
        }
        const removeMarker = id => {
            getMarkersByID(id).forEach(marker=>clusterMarkers.removeLayer(marker));
        }
        return {
            addMarker:addMarker,
            removeMarker,
            getAllMarkers:getAllMarkers,
            getUniqueMarkers:getUniqueMarkers,
            getMarkersByID:getMarkersByID,
            setMarkerInactive:setMarkerInactive,
            setMarkersOnlineAndActive:setMarkersOnlineAndActive,
            onClick:f=>map.on("click",f),
            zoomToFit:zoomToFit,
            onZoom:f=>zoomObserver.on(f),
            init:init
        }
    
    }

    return {
        create
    }
})
//# sourceMappingURL=bundle-ae2fd06d4e.js.map
