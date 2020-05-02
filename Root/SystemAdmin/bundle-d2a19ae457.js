window.vcomBuildVersion = '0.2594352528550252';
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
























const CustomFilters = (()=>{
    function getCustomSetFilterComponent (set){
        /* Store any previously selected entity */
        let selected; 
        function CustomSetFilter() {
        }

        const constructElement = selected => {
            /* There is a previously selected entity, so create an element that reflects that */
            if(selected !== undefined){
                return `
                <select>
                    <option selected></option>`
                    + set.map(v=>{
                        /* Somewhere in Ag Grid, values like 'SIP' get turned into 'sip'.
                        So we can do a case-insensitive comparison */
                        if(selected.toLowerCase() == v.toLowerCase()){
                            return "<option selected='selected' value='"+v+"'>"+v+"</option>"
                        }
                        else{
                            return "<option value='"+v+"'>"+v+"</option>"
                        }
                    }).join('')
                    + `
                </select>`
            }
            /* There is no previously selected entity */
            else{
                return `
                <select>
                    <option selected></option>`
                    + set.map(v=>"<option value='"+v+"'>"+v+"</option>").join('')
                    + `
                </select>`
            }
        }

        /* This gets called by some internal Ag Grid code, and it gets called each time we refresh
        a grid with setrows and even ways to try to sneak around that. */
        CustomSetFilter.prototype.init = function (params) {
            this.onFloatingFilterChanged = params.onFloatingFilterChanged;
            this.eGui = document.createElement('div');

            /* Construct the appropriate <select> element */
            this.eGui.innerHTML = constructElement(selected);
            
            this.currentValue = null;
            this.eFilterInput = this.eGui.querySelector('select');
        this.eFilterInput.style.color = params.color;
            var that = this;
            function onInputBoxChanged(){
                if (that.eFilterInput.value === '') {
                    //Remove the filter
                    that.onFloatingFilterChanged(null);
                    return;
                }

                // that.currentValue = Number(that.eFilterInput.value);
                that.currentValue = that.eFilterInput.value; // not a number
            that.onFloatingFilterChanged({model:{
                //In this example we are only interested in filtering by greaterThan
                type:'contains',
                filter:that.currentValue
            }});
            }
            this.eFilterInput.addEventListener('input', onInputBoxChanged);
        };

        CustomSetFilter.prototype.onParentModelChanged = function (parentModel) {
            // When the filter is empty we will receive a null message her
            if (!parentModel) {
                this.eFilterInput.value = '';
            this.currentValue = null;
            } else {
                // this.eFilterInput.value = parentModel.filter + ''; // This was preventing the text of the filter from showing up
            this.currentValue = parentModel.filter;
            selected = this.currentValue;
            console.log("selected now equal to",selected);
            }
        };

        CustomSetFilter.prototype.getGui = function () {
            return this.eGui;
        };

        return CustomSetFilter;
    }

    return {
        getSetFilter:set=>getCustomSetFilterComponent(set)
    }
})();
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
const Resource = (($scope,params)=>{
    const defaultName = "UnnamedResource";
    if(!params.name)params.name = defaultName;

    const defaultDisplayer = () => $scope[params.name] = params.value;
    const defaultPullErrorMessage = "Failed to load " + params.name + " from the server.";
    const defaultPushErrorMessage = "Failed to send " + params.name + " to the server.";
    const defaultOnPullError = () => fail(params.pullErrorMessage);
    const defaultOnPushError = () => fail(params.pushErrorMessage);

    const setValue = v => {
        params.value = v;
        display();
    }
    const display = () => {
        console.log("displaying",params.name,"with value",params.value);
        // if(value in params && params.displayer){
            params.displayer(params.value);
        // }
    }
    const pend = () => {
        if(params.loader){
            params.loader.pend();
        }
    }
    const success = msg => {
        if(params.loader){
            params.loader.success(msg);
        }
    }
    const fail = msg => {
        if(params.loader){
            params.loader.fail(msg)
        }
    }
    const pull = () => {
        if(params.getter){
            pend();
            return params.getter().then(result=>{
                setValue(result.data);
                if(params.onPullSuccess){
                    params.onPullSuccess(result);
                }
                success();
            })
            .catch(reason=>{
                if(params.onPullError){
                    params.onPullError(reason);
                }
                fail(params.pullErrorMessage);
                console.warn("failed to load resource",name,reason);
                throw(reason); // let this continue as a rejection
            })
        }
        throw("Cannot pull " + params.name + " property. No getter");
    }
    const push = () => {
        if(params.setter){
            return params.setter(params.value).then(result=>{
                if(params.onPushSuccess){
                    params.onPushSuccess(result)
                }
                success();
            })
            .catch(reason=>{
                if(params.onPushError){
                    params.onPushError(reason);
                }
                fail(params.pushErrorMessage);
                console.warn("failed to push resource",name,reason);
                throw(reason); // let this continue as a rejection
            })
        }
        throw("Cannot push " + params.name + " property. No setter");
    }
    const init = () => {
        if(!params.displayer)params.displayer = defaultDisplayer;
        if(!params.onPullError)params.onPullError = defaultOnPullError;
        if(!params.onPushError)params.onPushError = defaultOnPushError;
        if(!params.pushErrorMessage)params.pushErrorMessage = defaultPushErrorMessage;
        if(!params.pullErrorMessage)params.pullErrorMessage = defaultPullErrorMessage;
        if(!params.loader)params.loader = Loader($scope,params.name);
    }
    init();

    return {
        pull:pull,
        push:push,
        success:success,
        fail:fail,
        setValue:setValue,
        params:params,
    }
})
agGrid.initialiseAgGridWithAngular1(angular);
var app = angular.module("app", ['ui.router', 'ui.bootstrap', 'ui.select', 'vr.directives.slider', 'minicolors', 'ui.toggleSwitch','ngFileUpload', 'agGrid']);

app.config(['$stateProvider', '$urlRouterProvider', '$provide', '$httpProvider', function($stateProvider, $urlRouteProvider, $provide, $httpProvider) {
	$urlRouteProvider.otherwise('/');

	$stateProvider.state('logon',{
		url: '/',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'LogonController',
				templateUrl : 'views/LogonMain.html'
			}
		}
	});

    $stateProvider.state('home', {
		UIname: "System Status",
		url : '/home',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'SystemStatusController',
				templateUrl : 'views/systemStatus.html'
			}
		}
	});
    
	$stateProvider.state('systemStatus', {
		UIname: "System Status",
		url : '/systemStatus',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'SystemStatusController',
				templateUrl : 'views/systemStatus.html'
			}
		}
	});
    
    $stateProvider.state('clientStatistics', {
		UIname: "Client Statistics",
		url : '/clientStatistics',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'ClientStatisticsController',
				templateUrl : 'views/clientStatistics.html'
			}
		}
	});
    
    $stateProvider.state('sipRegistrations', {
		UIname: "SIP Registrations",
		url : '/sipRegistrations',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'SIPRegistrationsController',
				templateUrl : 'views/sipRegistrations.html'
			}
		}
	});
    
    $stateProvider.state('activityLog', {
		UIname: "Activity Log",
		url : '/activityLogFile',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'ActivityLogController',
				templateUrl : 'views/activityLog.html'
			}
		}
	});
    
    $stateProvider.state('debugLog', {
		UIname: "Debug Log",
		url : '/debugLogFile',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'DebugLogController',
				templateUrl : 'views/debugLog.html'
			}
		}
	});
    
    $stateProvider.state('systemSettings', {
		UIname: "System Settings",
		url : '/systemSettings',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'SystemSettingsController',
				templateUrl : 'views/systemSettings.html'
			}
		}
	});
    
    $stateProvider.state('clientConfigurationList', {
		UIname: "Client Configuration",
		url : '/clientConfigurationList',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'ClientConfigurationListController',
				templateUrl : 'ClientConfiguration/views/clientConfigurationList.html'
			}
		}
	});
    
    $stateProvider.state('clientSelectorAssignments', {
		UIname: "Client Selector Assignments",
		url : '/clientSelectorAssignments',
        params: {
            'clientid': null  
        },
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'ClientSelectorAssignmentsController',
				templateUrl : 'views/clientSelectorAssignments.html'
			}
		}
	});
    
    $stateProvider.state('groupConfigurationList', {
		UIname: "Group Configuration",
		url : '/groupConfigurationList',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'GroupConfigurationListController',
				templateUrl : 'views/groupConfigurationList.html'
			}
		}
	});
    
    $stateProvider.state('groupMembership', {
		UIname: "Group Membership",
		url : '/groupMembership',
        params: {
            'group': null
        },
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'GroupMembershipController',
				templateUrl : 'views/groupMembership.html'
			}
		}
	});
    
    $stateProvider.state('remoteConfigurationList', {
		UIname: "Remote Configuration List",
		url : '/remoteConfigurationList',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'RemoteConfigurationListController',
				templateUrl : 'views/remoteConfigurationList.html'
			}
		}
	});

	$stateProvider.state('virtualRealityConfiguration', {
		UIname: "Virtual Reality Configuration",
		url: '/VirtualRealityConfiguration',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'VirtualRealityConfigurationController',
				templateUrl : 'views/virtualRealityConfiguration.html'
			}
		}
	});
	
	$stateProvider.state('telephoneInterface', {
		UIname: "Telephone Interface",
		url: '/TelephoneInterface',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'TIFMainController',
				templateUrl : 'TIF/views/main.html'
			},
			'phoneBank@telephoneInterface': { 
				templateUrl: 'TIF/views/phoneBank.html'
			},
			'details@telephoneInterface': {
				templateUrl: 'TIF/views/details.html',
				controller: 'TIFDetailsController'
			},
			'dialer@telephoneInterface': {
				templateUrl: 'TIF/views/dialer.html',
				controller: 'TIFDialerController'
			},
			'configuration@telephoneInterface':{
				templateUrl: 'TIF/views/configuration.html',
				controller: 'TIFConfigurationController'
			},
			'levels@telephoneInterface':{
				templateUrl: 'TIF/views/levels.html',
				controller: 'TIFLevelsController'
			},
			'sysConfig@telephoneInterface':{
				templateUrl: 'TIF/views/sysConfig.html',
				controller: 'TIFSysConfigController'
			},
			'sysStatus@telephoneInterface':{
				templateUrl: 'TIF/views/sysStatus.html',
				controller: 'TIFSysStatusController'
			},
			'sysDialPlan@telephoneInterface':{
				templateUrl: 'TIF/views/sysDialPlan.html',
				controller: 'TIFDialPlanController'
			}
		}
	})

	$stateProvider.state('geo', {
		UIname: "Geo Positioning",
		url: '/GeoPositioning',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'views/header.html'
			},
			'middle' : {
				controller : 'GeoMainController',
				templateUrl : '../Geo/views/main.html'
			}
			// 'geoSubstate@geo': { 
			// 	templateUrl: 'Geo/views/phoneBank.html'
			// },
			
		}
	})
//    $httpProvider.defaults.headers.common = {};
//    $httpProvider.defaults.headers.post = {};
//    $httpProvider.defaults.headers.put = {};
//    $httpProvider.defaults.headers.patch = {};
}]);


/**
 * Notification Directive
 */
app.directive('notification', [function () {
    return {
        restrict: 'E',
        template:
		"<div class='alert alert-{{alertData.type}}' ng-show='alertData.show' role='alert' data-notification='{{alertData.status}}'>{{alertData.message}}<span class='glyphicon glyphicon-remove pull-right clickable' ng-click='clearFunction()'></span></div>",
        scope:{
            'alertData': "=", // has properties: type, show, status, and message
            'clearFunction': '&' // function to clear notifications
        }
    };
}]);    


/**
 * Prevent default action on elements
 */
app.directive('preventDefault', function () {
	var linkFn = function (scope, element, attrs) {
        $(element).on("click", function (event){
            event.preventDefault();
        });
    };

    return {
        restrict: 'A',
        link: linkFn
    }
});

/*
 * Accept positive number only
 */
app.directive('positiveNumber', function() {
    return {
        restrict: 'A',
        scope: {
            ngModel:'='
        },
        link: function(scope, elem, attrs, ctrl) {
            elem.bind('keyup', function() {
                var origVal = scope.ngModel;
                if(origVal != '') {
                    if(isNaN(origVal)) {
                        scope.ngModel = undefined;
                    } else {
                        var newVal = Math.abs(origVal);
                        scope.ngModel = newVal;
                    }
                }
                scope.$apply();
            });
        }
    };
});

/******************************************************************************/


/**
 * AngularJS default filter with the following expression:
 * "person in people | filter: {name: $select.search, age: $select.search}"
 * performs a AND between 'name: $select.search' and 'age: $select.search'.
 * We want to perform a OR.
 */
app.filter('propsFilter', function() {
  return function(items, props) {
    var out = [];

    if (angular.isArray(items)) {
      items.forEach(function(item) {
        var itemMatches = false;

        var keys = Object.keys(props);
        for (var i = 0; i < keys.length; i++) {
          var prop = keys[i];
          var text = props[prop].toLowerCase();
          if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
            itemMatches = true;
            break;
          }
        }

        if (itemMatches) {
          out.push(item);
        }
      });
    } else {
      // Let the output be the input untouched
      out = items;
    }

    return out;
  };
});
/******************************************************************************/

/* These are the functions that will be called once we are logged in */
app.run(function( EventService, VSABackgroundProcessService,
	FailoverService,  SystemStatusService,
	$uibModal,  NotificationService,  SystemSettingsService){
	/* License Checking */
	const openLicenseDialogIfNecessary = () => {
		console.log("Checking license...");
		const openLicenseDialog = () => {
			$uibModal.open({
				controller: 'LicenseController',
				templateUrl: 'views/license-dialog.html',
				backdrop: 'static'
			});
		}
		SystemStatusService.getOrPull().then(systemStatus=>{
			const numberOfConnections = systemStatus.LICENSED_CONNECTIONS.TEXT;
			const status = systemStatus.LICENSE_EXPIRATION.STATUS;
			if(numberOfConnections == 2 || status == "ERROR"){
				openLicenseDialog();
			}
		})
	}

	/* Handle Login and Logout events */
	EventService.on("loggedIn",() => {
		NotificationService.clear();
		openLicenseDialogIfNecessary();
		SystemSettingsService.pull(); // load this in anticipation of needing it
		VSABackgroundProcessService.startAll();
		FailoverService.updateSecondaryIsActive();
	});
	EventService.on("disconnected",()=>{
		VSABackgroundProcessService.stopAll();
	})
});

/* React when the origin changes */
app.run(function(EventService,OriginService,NotificationService,EnvService,BrandingService){
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
	OriginService.init();
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
app.run(function( $rootScope,  AuthenticationService, ConnectionService, EnvService, QueryStringService,  $state,  $q){
	/* Checks the URL for query string parameters that can log us in.
	   Returns a promise that resolves if we get logged in,
	   and rejects if we don't */
	const attemptQueryStringLogin = () => {
		const name = QueryStringService.getProperty("name");
		/* accept either 'pass' or 'password' in query string, but if both are missing, set it to empty string instead of undefined */
		const pass = QueryStringService.findOneOf(["pass","password"]) || "";

		/* We can allow the user to log in with no password, but they need to have a name */
		if(name){
			console.log("Logging in with name \""+name+"\" and password \""+pass+"\"");
			return ConnectionService.loginManual(name,pass);
		}
		else{
			/* we can't log in without a username */
			return $q.reject();
		}
	}

	/* Quick and dirty way to determine where to send users after they login through QSP */
	const getNameOfHomeState = () => {
		if(AuthenticationService.getUserInfo("systemSupport","supportsTelexTelephoneInterface")){
			return 'telephoneInterface';
		}
		else{
			return 'systemStatus';
		}
	}


	/* Intercept state changes (including one at the very beginning from no state to the first state).
	   Let them go through if we are logged in, but if we aren't then look for QSP
	   and change the destination if necessary */
	$rootScope.$on('$stateChangeStart', function(event,toState,toParams,fromState,fromParams) {
		/* This flag allows us to bypass our checks, preventing infinite loops */
		if(fromParams.alreadyCheckedQueryString){
			return;
		}

		/* This function works like $state.go, but also sets the flag,
		so subsequent state changes will not be intercepted */
		const continueTo = stateName => {
			fromParams.alreadyCheckedQueryString = true;
			$state.go(stateName,toParams);
		}

		var destination = toState.name;
		
		/* Only redirect if we aren't logged in */
		if(!ConnectionService.isLoggedIn() && EnvService.requireAuthorization()){
			event.preventDefault();
			attemptQueryStringLogin()
				.then(()=>{
					// We logged in!
					if(destination == 'logon'){ // Don't send a logged-in user to the login page
						destination = getNameOfHomeState();
					}
					continueTo(destination);
				})
				.catch(()=>{
					continueTo('logon');
				})
			return;
		}
		else{
			// Don't send a logged-in user to the login page
			// if(destination == 'logon'){
			// 	event.preventDefault();
			// 	destination = getNameOfHomeState();
			// 	continueTo(destination);
			// }
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

/* Attempt a logout before leaving the page (or when the user refreshes) */
app.run(function(ConnectionService, AuthenticatorService){
    const handleLeavePage = () => {
        if(ConnectionService.isLoggedIn()){
            console.log("attempting to logout before we leave the page...");
            AuthenticatorService.logout();
        }
    }
	window.addEventListener("beforeunload", function (e) {
		handleLeavePage();
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
app.run(function($rootScope,QueryStringService,DebugService){
	if(QueryStringService.getProperty("debug")){
		DebugService.enable();
	}
	
	const toggleDebugWhenUserTypesCode = code => {
		let remains = code;
		const reset = () => remains = code;
		$(document).on("keydown",event=>{
			if(event.which == remains.charCodeAt(0)-32){
				// console.log("match!");
				remains = remains.slice(1);
				if(remains.length == 0){
					console.log("toggled");
					DebugService.toggle();
					reset();
				}
			}
			else{
				console.log(event.which,"does not match",remains.charCodeAt(0)-32);
				reset();
			}
			console.log("remains",event.which,remains);
		});
	}
})

app.run(function(WhichPageService){
	WhichPageService.set("System Admin"); // note that we are on System Admin ...
})
/* global app Grid Util $ */
app.controller('ActivityLogController',
    function($scope, ClipboardService, $timeout, LogFileService) {

    /* The server holds a long log file and will only give us chunks of ~5000 bytes.
    So we need to make multiple requests to slowly build up the log. The server tries to give
    the chunk that you ask for, and responds with info like this
        "REQUESTED_START_POSITION":2,         // a start of 2 refers to the first/oldest line in the log
        "RETRIEVED_START_POSITION":56793946,  // the start of the portion that we've gotten so far (almost 30% done!)
        "RETRIEVED_END_POSITION":75043946,    // the end of the portion we've gotten so far
        "SEGMENT_START_POSITION":56793946,    // this individual API call's start ( same as the overall retrieved start )
        "SEGMENT_END_POSITION":56803946       // this individual API call's end (10,000 more than the segment start)
    and 5000 bytes of the log. This means we don't get clean line boundaries, and one API call
    will have partial lines at the beginning and end, with the first or second half of a message chopped off.
    Also worth noting, we're getting 5,000 bytes, but according to the server's numbers shown above, we are supposed
    to get 10,000 of something, so I'm thinking the server's units are in half-bytes (nibbles).
    
    This controller seeks to grow (in both directions in time) a model of the log (in memory)
    to be viewed in a grid.
    */
    
    /* Parameters */
    const autoRefreshDefault = 'ON';
    const INITIAL_LATEST_END_POSITION = 0;
    const backwardsInTimeDigestRate = 3000; // ms (digest means grid visual updates, but api calls are made more rapidly)
    const forwardsInTimeRefreshRate = 1000; // ms
    const digestScrollDelay         = 1000; // ms (digest will interrupt the user if they are dragging the scrollbar, so we wait until the user hasn't scrolled for this long before digest)
    const SIZE_OF_SINGLE_RESPONSE = 10000; // not sure of the unit. 4-bit Nibbles?

    /* Variables */
    $scope.autoRefresh = autoRefreshDefault;
    let grid = Grid($scope);
    let latestEndPosition = INITIAL_LATEST_END_POSITION; // the most forward-in-time nibble# we've seen
    let fitUpdateRepeater;

    /* Functions */
    const showSpinner = () => $scope.showSpinner = true;
    const hideSpinner = () => $scope.showSpinner = false;

    const init = () => {
        setupGrid();
        backwardsInTimeLoader.start();
        fitUpdateRepeater = Util.repeater(forwardsInTimeLoader.update,forwardsInTimeRefreshRate);
        fitUpdateRepeater.start();
        /* Stop these intervals if we navigate away */
        $scope.$on("$destroy",()=>{
            fitUpdateRepeater.stop();
            backwardsInTimeLoader.pause();
        })
        /* Watch the autorefresh toggle switch */
        $scope.$watch('getAutoRefresh()', function(newValue) {
            if(newValue == 0){ // Refresh in both directions
                backwardsInTimeLoader.start();
                fitUpdateRepeater.start();
            }
            else if(newValue == 1){ // Just Forwards in time
                backwardsInTimeLoader.pause();
                fitUpdateRepeater.start();
            }
            else if(newValue == 2){ // Just Backwards in time
                backwardsInTimeLoader.start();
                fitUpdateRepeater.stop();
            }
            else if(newValue == 3){ // No Refreshing
                fitUpdateRepeater.stop();
                backwardsInTimeLoader.pause();
            }
        });
    }

    const setupGrid = () => {
        let options = grid.getOptions();
        options.enableAutoVerticalResize = true;
        options.suppressScrollOnNewData = true; // otherwise, by default, the grid would scroll to the top when new row data is provided
        options.enableAutoSizeColumnsToFit = true;
        options.enableMaintainCurrentScroll = true; // keep scrolled down if we're already at the bottom
        options.rowSelection = "multiple";
        /* Column Definition */
        options.columnDefs = [
            {headerName: "Date/Time",  field: "dateTime", width:250, comparator:Sorting.dateComparator},
            {headerName: "Message", field: "msg", width:1000, suppressSorting:true}
        ];
        options.rowData = []; // We will populate later
        grid.attachToElement($("#activityLogGrid")[0]);
        $scope.search = () => grid.search($scope.searchText);
    }

    $scope.copy = () => {
        let str = grid.getSelectedRows().map(row=>{
            return row.dateTime+" - " + row.msg;
        }).join("\n");
        ClipboardService.copy(str);
    }

    const startsWithDate = text => {
        let regex = /\d{2}\/\d{2}\/\d{2}/; //like 01/13/17
        let match = regex.exec(text);
        return match != null && match.index == 0;
    }    
 
    /* Normally, prepending rows would cause the grid to jump up.
    We have to measure how far we are from the bottom of the grid, then after the rows are prepended
    we set the grid to scroll to the same distance from the bottom (the distance from the top has changed).
    In addition, we have to momentarily disable scrolling. Otherwise, if we are scrolling while this happens
    then the grid will jump up. Apparently scroll events (mouse wheel) function something like sending 
    10 events spaced out that result in calls like setScroll(x), setScroll(x+2), setScroll(x+4), ...
    So even though we keep the scroll where it needs to be, the unfinished scrolling events override it.
    So we just try to disable scrolling so that the user won't be scrolling when this happens.
    Also we can't cancel scroll events which would have been useful */
    const prependRows = rows => {
        grid.disableScrolling();
        $timeout(()=>{
            let before = grid.getScrollFromBottom();
            grid.addRows(rows,0);
            grid.setScrollFromBottom(before);
            grid.enableScrolling();
        },50)
    }
    const appendRows = rows => {
        grid.addRows(rows);
    }
    
    const convertLogToRow = line => {
        let hyphenIndex = line.indexOf("-");
        if(hyphenIndex != -1) return{
            "dateTime":line.slice(0,hyphenIndex-1),
            "msg":     line.slice(hyphenIndex + 1)
        }
        else{
            return {
                "msg":line
            }
        }
    }

    /* This handles getting log data from the server that has been recorded AFTER the user first opened this page.
    It periodically asks for information that occurred right after the last-known events, walking forwards in time... */
    const forwardsInTimeLoader = (()=>{
        const digest = logArray => {
            appendRows(logArray.map(convertLogToRow));
        }
        const update = () => {
            /* Don't look for updates until we get our first response from the backwards in time loader */
            if(latestEndPosition == 0) return;
            showSpinner();
            LogFileService.getActivityLogFile(latestEndPosition, latestEndPosition+SIZE_OF_SINGLE_RESPONSE)
            .then(function(result) {
                hideSpinner();

                let activityLogParameters = $.parseJSON(Util.getMultipartContent(result,'application/json'))[0];
                let log = Util.getMultipartContent(result,'text/plain');
                let ret_end_position = parseInt(activityLogParameters.RETRIEVED_END_POSITION);
                // The activityLogParameters may be using nibbles as the unit (4 bits AKA half a byte)

                if(ret_end_position > latestEndPosition){
                    let numNewNibbles = ret_end_position - latestEndPosition; // how much of the returned log is new?
                    let numNewCharacters = numNewNibbles / 2; // two nibbles per (1 btye) character?
                    latestEndPosition = ret_end_position;
                    log = log.slice(-numNewCharacters);
                    let logArray = log.split("\n").filter(logLine=>logLine.length > 0);
                    digest(logArray);
                }
            });
        }
        return {
            update:update
        }
    })()

    /* This handles loading the portion of the log that is OLDER than the time when the Activity Log page was opened.
    It starts by getting up-to-date data, then walks backwards in time...
    Since there may be a huge backlog of data, we get the results back from several 
    API requests before we try to update the grid visually, since updating the grid visually interrupts scrolling*/
    const backwardsInTimeLoader = (()=>{
        let req_start_position;
        let ret_start_position;
        let req_end_position;
        let ret_end_position;

        let paused = true;
        let partialMessage;
        let logBuffer = []; // stores log lines until they are digested (added to the grid)
        let digestRepeater;

        const init = () => {
            digestRepeater = Util.repeaterWithHold(digest,backwardsInTimeDigestRate);
            /* Pause the digest from occuring when the user scrolls */
            grid.getOptions().onBodyScroll = ()=>{
                if(!paused)digestRepeater.holdFor(digestScrollDelay);
            }
        }
        const digest = () => {
            prependRows(logBuffer.map(convertLogToRow));
            logBuffer = [];
        }

        const start = ()=>{
            if(paused){
                paused = false;
                update();
                digestRepeater.start();
            }
        };
        const pause = () => {
            paused = true;
            digestRepeater.stop();
        }

        let autoRefreshState = Util.nStateCycler(4);
        $scope.incrementAutoRefresh = autoRefreshState.inc;
        $scope.getAutoRefresh = autoRefreshState.get;

        const update = () => {
            showSpinner();
            LogFileService.getActivityLogFile(req_start_position, req_end_position, ret_start_position, ret_end_position)
            .then(function(result) {
                hideSpinner();
                let activityLogParameters = $.parseJSON(Util.getMultipartContent(result,'application/json'))[0];
                let log = Util.getMultipartContent(result,'text/plain');
                /* filter out any log lines that have no printable characters */
                let logArray = log.split("\n").filter(item=>Util.withoutUnprintables(item).length > 0);

                /* Most responses have an incomplete first message and an incomplete last message.
                Each message is in chronological order, but the sequence of messages is in reverse-chronological order.
                So the first partial message in the first response is the second half of the last partial message in the 
                second response. So we store the partial messages and combine them when we can.
                
                FIRST RESPONSE:
                02/18 16:34:38 - [slove]: Listen deactivated for NYPD
                ... many more lines ...
                05/02/18 17:25:16 - [slove]: Administrator logout


                SECOND RESPONSE:
                ctivated for NYPD
                ... many more lines ...
                05/
                */
                if(partialMessage){
                    let combined = logArray[logArray.length-1] + partialMessage;
                    combined = Util.replaceUnprintableWith(combined,"");
                    logArray[logArray.length-1] = combined
                    partialMessage = undefined;
                }
                if(!startsWithDate(logArray[0])){
                    partialMessage = logArray[0];
                    logArray.splice(0,1);
                }

                /* We're prepending the new lines to the buffer */
                logBuffer = logArray.concat(logBuffer);

                /* Keep track of what segment of the log we are requesting
                (the server helpfully sends us what we should send back for the next bit) */
                req_start_position = parseInt(activityLogParameters.REQUESTED_START_POSITION);
                ret_start_position = parseInt(activityLogParameters.RETRIEVED_START_POSITION);
                req_end_position =   parseInt(activityLogParameters.REQUESTED_END_POSITION);
                ret_end_position =   parseInt(activityLogParameters.RETRIEVED_END_POSITION);

                /* Initialize the latestEndPosition */
                if(latestEndPosition == INITIAL_LATEST_END_POSITION){
                    // This should only happen the first time we make a request
                    latestEndPosition = ret_end_position;
                    digest();
                }

                if(paused){
                    // paused, don't queue up another request
                }
                else{
                    if(req_start_position != ret_start_position) {
                        // not done yet, queue up another request
                        update();
                    } else {
                        // done
                    }
                }
            });
        }
        init();
        return {
            start:start,
            pause:pause,
            digest:digest
        }
    })()

    
    init();
});
/* global app Util Grid $ */
app.controller('ClientSelectorAssignmentsController', function(
    $scope, $state, $stateParams, AuthenticationService, ProgressBarService, SelectorDescriberService,
    $uibModal, ClientConfigurationService, LabelStorageService, DebugService) {

    $scope.clientid = $stateParams.clientid;
    $scope.client = {};
    const leftGrid = Grid($scope);
    const rightGrid = Grid($scope);

    const getLeftSelected = () => leftGrid.getSelectedRows()[0];
    const getRightSelected = () => rightGrid.getSelectedRows()[0];
    const getSelectorByRandID = randID => $scope.client.SELECTORS.find(s=>s.randID == randID);

    const decorateSelector = selector => {
        selector.randID = Util.generateUUID();
        selector.HOTKEY_STRING = SelectorDescriberService.getHotkeyString(selector);
        selector.HUMAN_FRIENDLY_TYPE = SelectorDescriberService.getSelectorType(selector);
        if(selector.ID != undefined){ // not a spacer, get the name
            LabelStorageService.getLabel(selector.ID).then(label=>{
                if(label == undefined){
                    // this label has been deleted from the system, but the selector assignment remains...
                    // We should do a global removal of assignments when deleting a selector
                    // but until then, just don't show the ghost selector
                    selector.hasBeenRemoved = true;
                    console.log(selector.ID,"is a ghost ... ")
                    return;
                }
                decorateWithCorrectName(selector,label);
                selector.ALIAS = label.ALIAS;
            })
        }
        else{ // it is a spacer, just call it by its type
            selector.LABEL_NAME = "";
            selector.HUMAN_FRIENDLY_TYPE = "<"+selector.TYPE+">";
        }
    }
    /* If the selector has a Listen Only Name and is Listen Only, then use that name */
    const decorateWithCorrectName = (selector,label) => {
        let listenOnlyName = label.SELECTOR_NAME_LISTEN_ONLY;
        let normalName = label.LABEL_NAME;
        if(selector.TYPE == "SELECTOR_LISTEN" && Util.isNonEmptyString(listenOnlyName)){
            selector.LABEL_NAME = listenOnlyName;
        }
        else{
            selector.LABEL_NAME = normalName;
        }
    }

    /* Adds a selector to the assigned selectors list. */
    const assignSelector = preview => {
        decorateSelector(preview);
        // latch disable should only be applied if this is the when the selector is being created (not loaded)
        // which is why it can't be lumped in with the rest of 'decorateSelector'
        if($scope.client.DEFAULT_SELECTOR_ASSIGNMENTS_TO_LATCH_DISABLE == 'ON'){ // implement latch disable
            preview.LATCH_DISABLE = "ON";
        }
        insertSelector(preview);

    }
    const insertSelector = selector => {
        let index = rightGrid.getFirstSelectedIndex();
        if(index != undefined){ // insert at the selected index
            $scope.client.SELECTORS.splice(index,0,selector);
        }
        else{ // push to the end of the list
            $scope.client.SELECTORS.push(selector);
        }
    }
    /* Implementing the button functionalities */
    const addSpacerObject = type => {
        assignSelector({TYPE:type})
    }
    const addNonAssignedSelector = type => {
        assignSelector({ID:getLeftSelected().ID,TYPE:type});
        leftGrid.selectNextRow(); // Increment selected non-assigned selector after we make an assignment like this.
    }
    const removeSelectors = randIDs => {
        $scope.client.SELECTORS = $scope.client.SELECTORS.filter(selector=>{
            return !randIDs.includes(selector.randID);
        })
    }
    const removeSelector = () => {
        removeSelectors([getRightSelected().randID]);
    }
    const duplicate = () => {
        let promise = LabelStorageService.refreshFullDetailLabels([getLeftSelected().ID]).then(labels=>{
            let newSelectors = labels[0].SELECTORS || [];
            newSelectors.forEach(decorateSelector);
            $scope.client.SELECTORS = newSelectors.slice(0); // a copy
            $scope.client.SELECTORS_PER_ROW = labels[0].SELECTORS_PER_ROW;
            // we should also copy the Selectors To Display Per Row from the duplicated selector ...
        })
        ProgressBarService.track(promise);
    }
    const clearAllSelectors = () => $scope.client.SELECTORS = [];

    /* updates the grid to look just like the $scope.client.SELECTORS array */
    const syncWithSELECTORS = () => {
        let index = rightGrid.getFirstSelectedIndex(); // should return -1 for failure, but returns undefined instead
        let randID;
        if(index!=undefined)randID = getRightSelected().randID;

        $scope.client.SELECTORS = $scope.client.SELECTORS.filter(s=>!s.hasBeenRemoved); // don't show ghost selectors
        rightGrid.setRows($scope.client.SELECTORS);

        if(index!=undefined){ // something was selected
            if(getSelectorByRandID(randID) != undefined){ // and it is still in the list
                rightGrid.selectByFunction(data=>data.randID == randID); // reselect it
            }
            else{
                rightGrid.selectByIndex(index); // if its gone, reselect by index
            }
        }
    }
    
    const defaultClient = {
        SELECTOR_ACTIVATION:"ON_THIS_CLIENT_CONNECT",
        SELECTORS:[],
    }
    const loadAllLabels = () => LabelStorageService.refreshAllLabels();
    const loadMainLabel = () => LabelStorageService.refreshFullDetailLabels([$scope.clientid]).then(labels=>labels[0]);
    const shouldLeave = () => $scope.clientid === undefined || $scope.clientid == null || $scope.clientid === '';
    const init = () => {
        /* return to client configuration list if we didn't get a client id input */
        if(shouldLeave())leave();
        /* We load all labels and THEN the main label, because otherwise the high-detail version 
        that we need of mainLabel would be overwritten by the med-detail version of allLabels */
        let promise = loadAllLabels().then(loadMainLabel);
        ProgressBarService.track(promise);
        promise.then(mainLabel=>{
            setupAgGrids();
            mainLabel = Object.assign({},defaultClient,mainLabel); // apply defaults)
            mainLabel.SELECTORS.forEach(decorateSelector); // add randomIDs, label names, hotkey strings
            $scope.client = mainLabel;
            exposeVarsToScope();
        })
    }

    const exposeVarsToScope = () => {
        /* for determining which buttons are enabled/disabled */
        $scope.hasUnassignedSelected = () => leftGrid.hasOneSelected();
        $scope.hasAssignedSelected = () => rightGrid.hasOneSelected();
        /* button implementations */
        $scope.addNonAssignedSelector = addNonAssignedSelector;
        $scope.removeSelector = removeSelector;
        $scope.duplicate = duplicate;
        $scope.addSpacerObject = addSpacerObject;
        $scope.clearAllSelectors = clearAllSelectors;
        /* helpers for checking client type */
        const isVCP = () => $scope.client.LABEL_TYPE_PREFIX == "VCP";
        const isSIP = () => $scope.client.LABEL_TYPE_PREFIX == "SIP";
        const isVDI = () => $scope.client.LABEL_TYPE_PREFIX == "VDI";
        /* Extra controls below right grid */
        $scope.showSelectorsToDisplayPerRow =           () => isVCP();
        $scope.showDefaultAssignmentsToNonLatchable =   () => isVCP();
        $scope.showActivationMethod =                   () => isSIP() || isVDI()
        $scope.disableSelectorsPerRow = false;
        $scope.disableDefaultToNonLatchable = false;
        $scope.activationMethodDropdown = [
            {value:"ON_THIS_CLIENT_CONNECT",        label:"On This Client Connect"},
            {value:"ON_OTHER_CLIENT_DISCONNECT",    label:"On Other Client Disconnect", disabled:true},
            {value:"ON_VOICE_ACTIVITY_DETECTION",   label:"On Voice Activity Detection"},
            {value:"ON_LOGIC_INPUT_ACTIVATION",     label:"On Logic Input Activation"},
            {value:"ON_DTMF_TONE_DETECTION",        label:"On DTMF Tone Detection"}
        ];
    }
    
    const setupAgGrids = () => {
        setupLeftGrid();
        setupRightGrid();
    }
    const setupLeftGrid = () => {
        if(AuthenticationService.hasTrunking())leftGrid.showSystemName();
        let options = leftGrid.getOptions();
        options.deselectWithoutCtrl = true;
        options.hideEmptyColumns = true;
        /* Column Definition */
        options.columnDefs = [
            {headerName: "",                width: 55,  field: "LABEL_TYPE_PREFIX",     tooltipField: "LABEL_TYPE_PREFIX"},
            {headerName: "Selector Name",   width: 140, field: "LABEL_NAME",            tooltipField: "LABEL_NAME"},
            {headerName: "Listen Only Name",width: 140, field: "SELECTOR_NAME_LISTEN_ONLY",      },
            {headerName: "Description",     width: 200, field: "DESCRIPTION",           tooltipField: "DESCRIPTION"},
            {headerName: "Type",            width: 140, field: "LABEL_TYPE_SUFFIX",     tooltipField: "LABEL_TYPE_SUFFIX"}
        ];
        /* Rows */
        LabelStorageService.getAllLabels().then(labels=>{
            // filter out RTS trunks, unless we're in debug mode
            if(!DebugService.isEnabled())labels = labels.filter(label=>!label.IS_RTS_TRUNK);
            leftGrid.setRows(labels);
            $scope.leftSearch(); // update # of rows found
        })
        leftGrid.attachToElement($("#leftGrid")[0]);
        $scope.leftGridCount = leftGrid.search("");
        $scope.leftSearch = () => $scope.leftGridCount = leftGrid.search($scope.leftSearchText);
    }

    const setupRightGrid = () => {
        const options = rightGrid.getOptions();
        options.headerHeight = 60; // the 'Always On Visible' header name takes up 3 lines, so make it taller
        options.enableSorting = false;
        options.deselectWithoutCtrl = true;
        options.getRowNodeId=function(data) { return data.randID; }; // Allows us to get the node with api.getRowNode(randID)
        const checkboxFields = ["LATCH_DISABLE","IFB_DESTINATION","ISO_DESTINATION","SPEAKER_DIM","ALWAYS_ON_VISIBLE","ALWAYS_ON_INVISIBLE"];
        options.columnDefs = [
            {headerName: "Name",                  width:100,field: "LABEL_NAME",    },
            {headerName: "Type",                  width:155,field: "HUMAN_FRIENDLY_TYPE",},
            {headerName: "Latch Disable",         width:70, field: "LATCH_DISABLE",         cellRenderer: Grid.checkboxRenderer},
            {headerName: "IFB",                   width:70, field: "IFB_DESTINATION",       cellRenderer: Grid.checkboxRenderer},
            {headerName: "ISO",                   width:70, field: "ISO_DESTINATION",       cellRenderer: Grid.checkboxRenderer},
            {headerName: "Spkr Dim",              width:70, field: "SPEAKER_DIM",           cellRenderer: Grid.checkboxRenderer},
            {headerName: "Always On Visible",     width:70, field: "ALWAYS_ON_VISIBLE",     cellRenderer: Grid.checkboxRenderer},
            {headerName: "Always On Invisible",   width:70, field: "ALWAYS_ON_INVISIBLE",   cellRenderer: Grid.checkboxRenderer},
            {headerName: "HotKey",                width:300,field: "HOTKEY_STRING"}
        ]

        /* Set the value of a checkbox and handle any additional steps required */
        const updateCheckbox = (data,propertyName,newValue) => {
            console.log("update checkbox data",data);
            /* prevent ALWAYS_ON_VISIBLE and ALWAYS_ON_INVISIBLE from being checked at the same time */
            if(propertyName == "ALWAYS_ON_VISIBLE" && newValue == "ON"){
                updateCheckboxHelper(data,"ALWAYS_ON_INVISIBLE",undefined);
            }
            if(propertyName == "ALWAYS_ON_INVISIBLE" && newValue == "ON"){
                updateCheckboxHelper(data,"ALWAYS_ON_VISIBLE",undefined);
            }
            updateCheckboxHelper(data,propertyName,newValue); // set the actual value
            // options.api.refreshCells(); // update grid visually
        }
        const updateCheckboxHelper = (rowData,propertyName,newValue) => {
            let selector = getSelectorByRandID(rowData.randID);
            selector[propertyName] = newValue;
            syncWithSELECTORS();
        }

        /* If we click on a checkbox cell, flip it */
        rightGrid.getOptions().onCellClicked = event=>{
            console.log("cell clicked",event);
            const type = event.colDef.field;
            const data = event.data; //rowdata
            if(checkboxFields.includes(type)){
                const newValue = event.value ? undefined:"ON"; // toggle the value
                updateCheckbox(data,type,newValue);
            }
        };
        rightGrid.attachToElement($("#rightGrid")[0]);
        $scope.rightGridCount = rightGrid.search("");
        $scope.rightSearch = () => $scope.rightGridCount = rightGrid.search($scope.rightSearchText);
        /* Whenever the SELECTORS array changes, we should update the grid */
        $scope.$watchCollection("client.SELECTORS",()=>{
            syncWithSELECTORS();
            $scope.rightSearch(); // update count shown
        })
    }
    
    /*
     * Hot Key Dialog Functions
     */
    $scope.hotKey = function() {
        if(rightGrid.hasOneSelected()) {
            let selectorID = getRightSelected().randID;
            let modalInstance = $uibModal.open({
                controller: 'ClientSelectorsHotKeyController',
                templateUrl: 'views/clientSelectorsHotKey-dialog.html',
                backdrop: 'static',
                size: 'sm',
                resolve: {
                    clientid: () => $scope.clientid, // id of client, not selector
                    inputHotkey: () => getRightSelected().HOT_KEY
                }
            });
            modalInstance.result.then(hotKey=>{
                let selector = getSelectorByRandID(selectorID);
                selector.HOT_KEY = hotKey;
                selector.HOTKEY_STRING = SelectorDescriberService.getHotkeyString(selector);
                syncWithSELECTORS(); // since we are just modifying properties on a selector.
            }) 
        }
    };
    
    $scope.save = function() {
        var client = Object.assign({},$scope.client); // copy
        console.log("saving",client);
        let promise = ClientConfigurationService.putClient(client)
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then(leave);
    };
    const leave = () => $state.go('clientConfigurationList');

    $scope.cancel = leave
    init();
});
/* global app angular Util */
app.controller('ClientSelectorsHotKeyController',
    function($scope, $uibModalInstance, $sce, clientid, ProgressBarService, inputHotkey, ClientConfigurationService) {


    console.log("input hotkey", inputHotkey);
    let hotKey = {
        KEY:Util.getPropertySafe(inputHotkey,"KEY") || undefined, // "KEY_PAGE_DOWN" or similar
        MODIFIER:Util.getPropertySafe(inputHotkey,"MODIFIER") || "none" //"none", or "ALT", or "ALT+CTRL", or "ALT+CTRL+SHIFT" or similar
    }
    console.log("after input",hotKey);
    $scope.clientid = clientid;
    $scope.hotKey = hotKey;

    const init = () => {
        console.log("hotkey initialized as ",hotKey);
        initializeModifierCheckboxes();
        watchForCheckboxChanges();
        loadListOfPossibleKeys();
    }
    
    const watchForCheckboxChanges = () => {
        $scope.$watch('[ALT, CTRL, SHIFT]', ()=>{ // $scope.ALT, $scope.CTRL, $scope.SHIFT are models
            let modifications = [];
            ["ALT","CTRL","SHIFT"].forEach(modName=>{
                if($scope[modName]===true) modifications.push(modName);
            });
            if(modifications.length > 0){
                hotKey.MODIFIER = modifications.join("+");
            }
            else{
                hotKey.MODIFIER = "none";
            }
        });
    }

    const initializeModifierCheckboxes = () => {
        /* Set $scope.CTRL, $scope.ALT, $scope.SHIFT to true (if they should be) */
        console.log("modifier",hotKey.MODIFIER);
        ["ALT","CTRL","SHIFT"].forEach(modName=>{
            if(hotKey.MODIFIER.indexOf(modName)!=-1){
                console.log(modName,"found");
                $scope[modName] = true;
            }
        })
    }
    
    function loadListOfPossibleKeys() {
        let promise = ClientConfigurationService.getClientSelectorsHotKeys($scope.clientid);
        promise.then(function(result) {
            $scope.keys = Util.objectToArray(result.data['SELECTORS|HOT_KEY|KEY']);
        });
        ProgressBarService.track(promise);
        return promise;
    }
    
    // // convert for dropdown
    // const parseSelectorValues = function() {
    //     /* Make hotkey a value/label pair instead of just a value (for <ui-select>) */
    //     if(hotKey.KEY){
    //         let valueLabelPair = Util.findElementWithProperty($scope.keys,"value",hotKey.KEY)
    //         hotKey.KEY = valueLabelPair;
    //     }
        
        
    // };
    
    $scope.ok = function() {
        // Get/Set some values
        let copy = angular.copy(hotKey);
        // copy.KEY = copy.KEY.value;
        
        console.log("hotKey",copy);
        // Close modal and send the HOT_KEY
        $uibModalInstance.close(copy);
    }

	$scope.cancel = $uibModalInstance.dismiss;
        
    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
    };
    init();
});


/* global app Grid $ Util*/
app.controller('ClientStatisticsController',
    function($scope, $interval,
        $uibModal, ClientConfigurationService, ProgressBarService,
        ClientStatisticsService, AuthenticationService) {

    /* retrieve client configurations once, then repeatedly retrieve client statistics */
    /* client statistics look like this
        [
            {
                "ID":10001,
                "ALIAS":"101235_61795687",
                "CONNECTION_STATE":"Off-Line",
                "ROOT_CLIENT_TYPE":"SIP",
                "CLIENT_ID":"IFB #02",
                "CLIENT_NUMBER":2,
                "CONNECTION_STATE_DURATION":"21h, 0m",
                "DISCONNECT_EVENT_COUNT":"1",
                "DISCONNECT_STATE_CUMULATIVE_DURATION":"21h, 0m",
                "SOFTWARE_VERSION":"n/a",
                "DISPLAY_COLOR":"RED"
            },
            .
            .
            .
        ]
    */
    let grid = Grid($scope);
    // let rows = [];
    // let intervalHandle;
    let clients; // will be retrieved from client configuration api call. Seem to only be used for getting descriptions
    let refresher;

    // Init filters
    $scope.showUnusedClients = 'OFF';
    $scope.showControlPanels = 'ON';
    $scope.showDeviceInterfaces = 'ON';
    $scope.showSIPDevices = 'ON';

    const init = () => {
        setupGrid();
        let promise = ClientConfigurationService.getClientConfigurationList();
        ProgressBarService.track(promise);
        refresher = Util.repeater(refreshData,Util.getClientStatisticsRefreshInterval());
        promise.then(result=>{
            clients = result.data;
            refreshData();
            refresher.start();
        })
        $scope.$on('$destroy', refresher.stop); // triggers if we navigate to another page
    }
    const refreshData = () => {
        // $scope.showSpinner = true;
        let promise = ClientStatisticsService.getClientStatistics({
            showUnusedClients:      $scope.showUnusedClients,
            showControlPanels:      $scope.showControlPanels,
            showDeviceInterfaces:   $scope.showDeviceInterfaces,
            showSIPDevices:         $scope.showSIPDevices
        });
        // ProgressBarService.trackSpinner(promise);
        promise.then(function(result) {
            // $scope.showSpinner = false;
            let stats = result.data;
            if(Util.isNonEmptyArray(stats)){
                // It would be nice to *update* the grid rather than entirely resetting it.
                let newRows = convertToRows(stats);
                // sort rows so online clients show up at the top
                newRows.sort(Sorting.clientStatisticsRowComparator);
                grid.setRows(newRows);
                grid.treatPropertyAsClass("colorClass");
            }
            else{
                // we got back a null from the server
                grid.clearRows();
            }
        });
    }
    const addFakeRow = rows => {
        let randomRow = angular.copy(rows[Math.floor(Math.random()*rows.length)]);
        randomRow.name = "modified " + randomRow.name;
        randomRow.duration += "10s";
        randomRow.ip = Util.generateUUID();
        randomRow.saplsl = Math.random()*1000;
        rows.push(randomRow);
    }

    /* Special case so RTSP/P2P clients show up as 'VIDEO' instead */
    const getBaseTypeName = stat => {
        let t = stat.ROOT_CLIENT_TYPE;
        if(t == "RTSP" || t == "P2P"){
            return "VIDEO";
        }
        return t;
    }

    const convertToRows = clientStats => {
        return clientStats.map(stats=>{
            return{
                /* misc */
                id:         stats.ID,
                baseType:   getBaseTypeName(stats),
                name:       stats.CLIENT_ID,
                state:      stats.CONNECTION_STATE,
                duration:   stats.CONNECTION_STATE_DURATION,
                dec:        stats.DISCONNECT_EVENT_COUNT,
                dscd:       stats.DISCONNECT_STATE_CUMULATIVE_DURATION,
                ip:         stats.IP_ADDRESS,
                version:    stats.SOFTWARE_VERSION,
                cpu:        stats.CPU_STRING, // calculated earlier by the ClientStatisticsService
                desc:       findMatchingDescription(stats),
                clientNo:   stats.CLIENT_NUMBER,
                colorClass: getColorClass(stats.DISPLAY_COLOR,stats.ROOT_CLIENT_TYPE),
                /* sending */
                sarae:      stats.CLIENT_SEND_AUDIO_RATE_AFTER_ENCODING,
                saplls:     stats.CLIENT_SEND_AUDIO_PACKET_LOSS_LAST_SEC,
                sapllm:     stats.CLIENT_SEND_AUDIO_PACKET_LOSS_LAST_MIN,
                saplsl:     stats.CLIENT_SEND_AUDIO_PACKET_LOSS_SINCE_LOGIN,
                saJitter:   stats.CLIENT_AUDIO_SEND_PACKET_JITTER_BUFFER_SIZE_IN_MS,
                /* receiving */
                rarbd:      stats.CLIENT_RECEIVE_AUDIO_RATE_BEFORE_DECODING,
                raplls:     stats.CLIENT_RECEIVE_AUDIO_PACKET_LOSS_LAST_SEC,
                rapllm:     stats.CLIENT_RECEIVE_AUDIO_PACKET_LOSS_LAST_MIN,
                raplsl:     stats.CLIENT_RECEIVE_AUDIO_PACKET_LOSS_SINCE_LOGIN,
                raJitter:   stats.CLIENT_AUDIO_RECEIVE_PACKET_JITTER_BUFFER_SIZE_IN_MS
            }
        })
    }
    const setupGrid = () => {
        let options = grid.getOptions();
        options.enableAutoVerticalResize = true;
        options.suppressScrollOnNewData = true;
        options.getRowNodeId = function(data) {
            return data.id;
        },
        // options.enableMaintainSelection = true;
        options.deselectWithoutCtrl = true;
        options.deltaRowDataMode=true;
        // options.deltaRowDataModel = true;
        /* Column Definition */
        options.columnDefs = [
            { field:'baseType', headerName:'',              width:50  },
            { field:'name',     headerName:'Client',        width:125 },
            { field:'state',    headerName:'State',         width:75  },
            { field:'duration', headerName:'Duration',      width:125, comparator:Sorting.durationComparator  },
            { field:'dec',      headerName:'DEC',           width:40  },
            { field:'dscd',     headerName:'DSCD',          width:80,  comparator:Sorting.durationComparator  },
            { field:'ip',       headerName:'IP Address',    width:110, comparator:Sorting.ipAddressComparator },
            { field:'version',  headerName:'Version',       width:175, comparator:Sorting.versionComparator },
            { field:'sarae',    headerName:'SARAE',         width:55  },
            { field:'saplls',   headerName:'SAPLLS',        width:60  },
            { field:'sapllm',   headerName:'SAPLLM',        width:60  },
            { field:'saplsl',   headerName:'SAPLSL',        width:60  },
            { field:'saJitter', headerName:'SA Jitter',     width:60  },
            { field:'rarbd',    headerName:'RARBD',         width:60  },
            { field:'raplls',   headerName:'RAPLLS',        width:60  },
            { field:'rapllm',   headerName:'RAPLLM',        width:60  },
            { field:'raplsl',   headerName:'RAPLSL',        width:60  },
            { field:'raJitter', headerName:'RA Jitter',     width:60  },
            { field:'cpu',      headerName:'CPU',           width:60,  comparator:Sorting.cpuComparator  },
            { field:'desc',     headerName:'Description',   width:250 }
        ];
        options.columnDefs.forEach(colDef=>{
            colDef.enableCellChangeFlash=true;
        })
        if(AuthenticationService.hasTrunking()){
            options.columnDefs.push(
                { field:'clientNo', headerName:'Client Number', width:60 }
            )
        }
        grid.attachToElement($("#clientStatisticsGrid")[0]);
    }

    /* Helpers */
    /* look through client configurations for one with matching ID, and get its DESCRIPTION */
    const findMatchingDescription = stats => {
        return Util.findElementWithProperty(clients,"ID",stats.ID).DESCRIPTION;
    }
    // /* Get the CPU value to display on screen */
    // const getCPUDisplay = function(stat) {
    //     const systemCPU = Util.getPropertySafe(stat,"SYSTEM_CPU_USAGE");
    //     const processCPU = Util.getPropertySafe(stat,"PROCESS_CPU_USAGE");
    //     let displayText = "";
    //     if(systemCPU){
    //         displayText += systemCPU+"%";
    //     }
    //     if(processCPU){
    //         displayText += ' ('+processCPU+"%)";
    //     }
    //     displayText = displayText.trim(); // remove extra space before processCPU if no systemCPU
    //     return displayText
    // };
    const colorMap = {
        "GREEN":    "text-success",
        "YELLOW":   "text-warning",
        "RED":      "text-danger"
    }
    const typeMap = {
        "VCP": "clientStatistics-vcp",
        "VDI": "clientStatistics-vdi",
        "SIP": "clientStatistics-sip",
        "RTSP": "clientStatistics-rtsp"
    }
    const getColorClass = (displayColor,type) => {
        let colorClass = colorMap[displayColor] || ""; // return empty string instead of undefined
        let typeClass = typeMap[type] || "";
        return colorClass + " " + typeClass
    }
    
    /* Controls */
    $scope.showLegend = function() {
        $uibModal.open({
			controller: function($scope,$uibModalInstance){
                $scope.close = $uibModalInstance.dismiss;
            },
			templateUrl: 'views/clientStatisticsLegend-dialog.html',
			backdrop: 'static'
		});
    };
    $scope.resetStatistics = function() {
        let promise;
        if(grid.hasOneSelected()){
            console.log("selected",grid.getSelectedRows());
            promise = ClientStatisticsService.resetStatisticsForClient(grid.getSelectedRows()[0].id);
        }
        else{
            promise = ClientStatisticsService.resetStatisticsForAll()
        }
        ProgressBarService.track(promise,{showSuccess:true});
    };

    init();
});
/* global app Grid*/
app.controller('ClientTemplatesController',
    function($scope, $uibModalInstance, $q, ProgressBarService,
        LabelStorageService, SelectorDescriberService, ClientConfigurationService) {

    /* Parameters */
    const TYPES = ["SELECTOR_ASSIGNMENTS","AUDIO_SETTINGS","OPTIONS"];

    /* Variables */
    let grid = Grid($scope);
    let allClients;
    let changedClientIDMap = {}; // keep track of which clients should be PUT to the server

    /* Functions */
    const init = () => {
        $q.all([
            setupGrid(),
            loadClients()
        ]).then(results=>{
            let clients = results[1];
            allClients = clients;
            grid.setRows(clients);
        });
    }
    const setupGrid = () => {
        /* Options */
        let options = grid.getOptions();
        options.rowSelection = "multiple";
        options.enableOrderedSelection = true;
        /* Column Definition */
        options.columnDefs = [
            { field: 'LABEL_BASE_TYPE_NAME',                headerName: '',             width:50, },
            { field: 'LABEL_TYPE_SUFFIX',                   headerName: 'Type',         width:126 },
            { field: 'LABEL_NAME',                          headerName: 'Name',         width:126 },
            { field: 'DESCRIPTION',                         headerName: 'Description',  width:168 },
            { field: 'SELECTOR_ASSIGNMENTS_TEMPLATE_NAME',  headerName: 'Selector Assignment Template', width:115 },
            { field: 'AUDIO_SETTINGS_TEMPLATE_NAME',        headerName: 'Audio Settings Template',      width:115 },
            { field: 'OPTIONS_TEMPLATE_NAME',               headerName: 'Options Template',             width:115 }
        ];
        return grid.attachToElementBySelector("#clientTemplatesGrid");
    }
    const loadClients = () => {
        let promise = LabelStorageService.refreshAllClients();
        ProgressBarService.track(promise);
        return promise;
    }


    /* The client's label has a property called "TEMPLATES" that looks like this...
    "TEMPLATES":
        [{
        "TYPE":"SELECTOR_ASSIGNMENTS",
        "ID":10004
        },{
        "TYPE":"AUDIO_SETTINGS",
        "ID":10004
        },{
        "TYPE":"OPTIONS",
        "ID":10004
        }]
    */
   /* Call this in order to decorate the clients and update the grid when making changes
   (like linking or unlinking a template) */
    const registerChangeInClient = client => {
        // Since we're relying on decorated properties like SELECTOR_ASSIGNMENT_TEMPLATE_NAME
        // we need to recalculate those decorated properties
        SelectorDescriberService.decorateClients(allClients);
        // this just tells the grid that it needs to re-sync with our data ( specifically the changed client )
        grid.updateRow(client);
        changedClientIDMap[client.ID] = true;
    }
    /* removes one template type from a client */
    const removeTemplate = (client,type) => {
        console.log("removing template",client,type);
        if(client.TEMPLATES){
            let templateIndex = client.TEMPLATES.findIndex(t=>t.TYPE==type);
            if(templateIndex != -1){
                console.log("matching template found");
                client.TEMPLATES.splice(templateIndex,1);
                registerChangeInClient(client);
            }
            console.log("templates after removal",client.TEMPLATES);
        }
    }
    /* gets a template type from a client. Annoying to do this otherwise since you have to search */
    const getTemplate = (client,type) => {
        if(client.TEMPLATES){
            return client.TEMPLATES.find(t=>t.TYPE==type && t.ID != undefined);
        }
        return undefined;
    }
    /* sets one template type on a client */
    const setTemplate = (client,type,id) => {
        if(!client.TEMPLATES){
            client.TEMPLATES = [];
        }
        else{
            removeTemplate(client,type); // just in case it already exists
        }
        client.TEMPLATES.push({
            TYPE:type,
            ID: id
            // the server gives us NAME
        })
        registerChangeInClient(client);
        console.log("client after template set",client);
    }

    //  *  1) Must select two or more clients to link
    //  *  2) If no clients have a TYPE template, then use the first client selected as the "base" template
    //  *  3) Else if only 1 client has a TYPE template, set template for the other selected client(s)
    //  *  4) If multiple clients have the same template, we can use that
    //  *  5) If multiple clients have different templates, then we can't know what to do
    /* Returns an object like {rule:x,template:{ID:y,TYPE:z}} */
    const determineBaseTemplate = (clients,type) => {
        // return not only the template, but which of the above 5 rules we encountered
        if(clients.length < 2) return {rule:1}
        let templates = clients.map(client=>getTemplate(client,type)).filter(template=>template!=undefined);
        if(templates.length == 0) return {rule:2,template:{TYPE:type,ID:clients[0].ID}} // rule 2
        if(templates.length == 1) return {rule:3,template:templates[0]}; // rule 3
        if(templates.length >= 2) {
            let firstID = templates[0].ID;
            let matches = templates.filter(template=>template.ID == firstID).length;
            // if they're all the same, we're good
            if(matches == templates.length){
                return {rule:4,template:templates[0]};
            }
            else{ // otherwise, there's a problem
                return {rule:5}
            }
        }
    }
    const getSelectedData = () => grid.getOrderedSelection().map(node=>node.data);
    
    const linkClients = (clients,type) => {
        let t = determineBaseTemplate(clients,type).template;
        clients.forEach(client=>setTemplate(client,t.TYPE,t.ID));
    }

    const unlinkTemplates = (clients,type) => {
        clients.forEach(client=>removeTemplate(client,type));
    }

    const highlightBaseTemplate = type => {
        let baseTemplateInfo = determineBaseTemplate(getSelectedData(),type);
        let rule = baseTemplateInfo.rule;
        let template = baseTemplateInfo.template;
        let index;
        if(template){ // Rule 2, 3, or 4
            if(rule == 2){ // Rule 2: no existing templates so we use first selected client as the new template
                index = grid.getOrderedSelection()[0].childIndex;
            }
            else{ // Rule 3 or 4:  use an existing template found on one or more of selected clients
                index = grid.getOrderedSelection().find(node=>{
                    return getTemplate(node.data,type); // find a node that has a template
                }).childIndex;
            }
            grid.highlightRowByIndex(index);
        }
    }

    /* If the TEMPLATES array just has an item removed, the server won't change anything.
        So instead we need to have an item of the removed type, but with no ID */
    const helpServerNoticeTemplateRemovals = client => {
        TYPES.forEach(type => {
            if(!getTemplate(client,type)){
                client.TEMPLATES.push({TYPE:type});
            }
        })
    }

    const save = () => {
        let changedClientIDs = Object.keys(changedClientIDMap); // convert from map to array
        let changedClients = changedClientIDs.map(id=>allClients.find(client=>client.ID==id));
        changedClients.forEach(helpServerNoticeTemplateRemovals); // make some changes we need for saving
        let promises = changedClients.map(ClientConfigurationService.putClient);
        let promise = $q.all(promises);
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then($uibModalInstance.close);
    }

    init();

    $scope.linkTemplate = type => linkClients(getSelectedData(),type);
    $scope.unlinkTemplates = type => unlinkTemplates(getSelectedData(),type);
    $scope.isDisabled = type => !determineBaseTemplate(getSelectedData(),type).template;
    $scope.allLinksDisabled = () => TYPES.every($scope.isDisabled);
    $scope.hoverIn = highlightBaseTemplate;
    $scope.hoverOut = () => grid.highlightRowByIndex(-1);
    $scope.save = save;
    $scope.cancel = $uibModalInstance.dismiss;
});
/* global Grid app $*/
app.controller('DebugLogController',
    function($scope, $interval, $timeout, LogFileService) {
    /* The debug log is too big to transmit in one API call, so it is split up into many chunks (5.5KB each)
    */

    /* Parameters */
    const autoRefreshByDefault = true;
    /* Variables */
    $scope.autoRefresh = autoRefreshByDefault?'ON':'OFF' // ui switch
    let halfFinishedText; // stores partial log lines until we get the remainder of the line
    let grid = Grid($scope);

    /* params for requesting a chunk of the debug log */
    let req_start_position;
    let ret_start_position;
    let req_end_position;
    let ret_end_position;
    

    const init = () => {
        setupGrid();
        monitorAutoRefreshSwitch();
        loadNextChunk();
    }

    const setupGrid = () => {
        let options = grid.getOptions();
        /* Column Definition */
        options.columnDefs = [
            {headerName: "Date",  field: "date", width:110},
            {headerName: "Time", field: "time", width: 110},
            {headerName: "System",field:"system",width:110},
            {headerName: "Message", field: "msg", width:1000}
        ];
        options.suppressScrollOnNewData = true; // otherwise, by default, the grid would scroll to the top when new row data is provided
        grid.attachToElement($("#debugLogGrid")[0]);
        $scope.search = () => grid.search($scope.searchText);
    }
    const convertTextToRow = text => {
        let start;
        let end;
        start = 0;
        end = text.indexOf(" ");
        let date = text.substring(start,end);
        start = end + 1;
        end = text.indexOf("-",start);
        let time = text.substring(start,end);
        start = end + 1;
        end = text.indexOf(":",start);
        let system = text.substring(start,end);
        start = end + 1;
        let msg = text.substring(start);

        return {
            date:date,
            time:time,
            system:system,
            msg:msg
        }
    }
    const startsWithDate = text => {
        let regex = /\d{2}\/\d{2}\/\d{4}/; //like 01/13/2017
        let match = regex.exec(text);
        // console.log(match,"match with date for ",text);
        return match != null && match.index == 0;
    }

    const monitorAutoRefreshSwitch = () => {
        $scope.$watch('autoRefresh', function(newValue, oldValue) {
            if(newValue === 'ON' && oldValue === 'OFF') {
                onAutoRefreshTurnedOn();
            }
        });
    }
    
    const convertToRows = str => {
        let texts = str.split("\n");
        texts.shift();
        texts.shift();
        texts.pop();
        if(halfFinishedText != undefined){
            let firstHalf = texts[texts.length-1];
            let joined = firstHalf + halfFinishedText;
            joined = joined.replace(/[\r\n]/g,""); // replace any \r or \n with "";
            texts[texts.length-1] = joined;
            console.log("just added text","\""+joined+"\"");
        }
        if(!startsWithDate(texts[0])){
            // console.log("doesnt start with date",texts[0]);
            halfFinishedText = texts[0];
            texts.shift();
        }
        else{
            halfFinishedText = undefined;
        }
        // let newInfoRows = texts.reverse().map(convertTextToRow);
        return texts.map(convertTextToRow);
    }

    /* Parses the HTTP result and its headers to get the body as well as the start/end position parameters */
    const parseResult = result => {
        let data = result.data;
        var contentTypeArray = result.headers('Content-Type').split(';');
        var boundary = contentTypeArray[1].split('=')[1];
        
        if(data == undefined || data == '') return undefined;
        // Parse out data to get the JSON section
        var dataArray = data.split(boundary);
        
        var json = dataArray[1].substring(dataArray[1].indexOf('['), dataArray[1].indexOf(']')+1);
        var debugLogParameters = $.parseJSON(json);
        
        // Parse log file
        var s1 = 'Content-Type: text/plain;charset=utf-8';
        let newInfo = dataArray[2].substring( (dataArray[2].indexOf(s1)+s1.length+1), dataArray[2].length );
        return {body:newInfo,params:debugLogParameters}
    }
    const isLoadingComplete = () => req_start_position == ret_start_position;
    const isAutoRefreshing = () => $scope.autoRefresh == 'ON';
    const onAutoRefreshTurnedOn = () => {
        loadNextChunk();
    }
    const loadNextChunk = () => {
        LogFileService.getDebugLogFile(req_start_position, req_end_position, ret_start_position, ret_end_position)
        .then(function(result) {
            let parsed = parseResult(result);
            let body = parsed.body;
            if(!body) return;
            let rows = convertToRows(body);
            grid.addRows(rows.reverse()); // Rows come in from the server in chronological order, we want them in reverse chron order

            req_start_position = parseInt(parsed.params[0].REQUESTED_START_POSITION);
            ret_start_position = parseInt(parsed.params[0].RETRIEVED_START_POSITION);
            req_end_position =   parseInt(parsed.params[0].REQUESTED_END_POSITION);
            ret_end_position =   parseInt(parsed.params[0].RETRIEVED_END_POSITION);

            if(!isLoadingComplete() && isAutoRefreshing()) {
                loadNextChunk();
            }
        })
    }

    init();
});

/* global app Util $ Form angular */
app.controller('EditClientController', 
function($scope, $timeout, $uibModalInstance, $sce, ClientConfigurationService, BrowserStorageService,
    LabelsService, clientid, mode, $anchorScroll, $location, $q, AuthenticationService,
    ProgressBarService) {
        
    $scope.isTIForHasTrunking = AuthenticationService.isTIF() || AuthenticationService.hasTrunking();

    $scope.client = {};
    $scope.myFormModels = {};
    // $scope.optionsFormModels = {};
    $scope.clientTypeFormModels = {};
    // clientid and mode are variables input to this controller
    
    let storedLoginName; // helps us disable login name and undisable it and still have the old login name there.

    const defaultMode = 'add';
    const screenTitles = {
        'add': "Add Client",
        'edit': "Edit Client",
        'duplicate': "Duplicate Client"
    }

    const init = () => {
        console.log("EDIT CLIENT CONTROLLER INIT");
        if(mode == undefined || mode == '') mode = defaultMode;
        $scope.screenTitle = screenTitles[mode];
        let promise = loadClientTypesList().then(()=>loadClient().then(setupClientTypeForm));
        ProgressBarService.track(promise);
        // setupClientTypeForm();
        $scope.$watch("clientTypeFormModels.LABEL_TYPE",setupFormsForCurrentClientType); // Whenever user chooses the LABEL TYPE, update the form
    }


    $scope.clientTypes = [];
    $scope.selectedClientType = {};

    const PRIVILEGES = {
        NONE: {
            'label': 'None',
            'value': 'NO_PRIVILEGES'
        },
        STANDARD: {
            'label': 'Standard',
            'value': 'STANDARD_PRIVILEGES'
        },
        MASTER: {
            'label': 'Master',
            'value': 'MASTER_PRIVILEGES'
        }
    }
    const privilegesDropdownOptions = [
        PRIVILEGES.NONE,
        PRIVILEGES.STANDARD,
        PRIVILEGES.MASTER
    ]
    $scope.privilegesDropdownOptions = privilegesDropdownOptions;
    const defaultPrivilegeValue = PRIVILEGES.NONE.value;

    /*
     * Some complications arise as a result of needing to represent data slightly differently
     * when it is stored on the server and when a user is interacting with it on this page.
     * A common occurrence is that we use a ui-select element (dropdown list), like the one
     * used to select the client type, or the privileges.  When using ng-model, the ui-select
     * element sets the ng-model to be an object {label:xxx,value:xxx}.  I haven't found another
     * way to display human friendly text to the user instead of the all-caps names that we use
     * behind the scenes.  But on the server, the value is just stored as a string like
     * "VCP_DESKTOP_PANEL".  So when loading we convert from that string to an object with
     * label and value properties, and when saving we convert back to that string.
     */
    const convertClientAfterLoading = client => {
        // Convert loaded client properties to their dropdown equivalents
        client.SYSTEM_ADMINISTRATION_PRIVILEGES = Util.findElementWithProperty(privilegesDropdownOptions,"value",client.SYSTEM_ADMINISTRATION_PRIVILEGES);
        return client;
    }
    const convertClientForSaving = client => {
        const copy = angular.copy(client); // make a copy since we're going to have to modify this to save it
        Object.assign(copy,$scope.myFormModels); // get info from the automatically generated <myform>
        Object.assign(copy,$scope.clientTypeFormModels);
        // Convert dropdown-style objects to simple strings
        ["SYSTEM_ADMINISTRATION_PRIVILEGES"].forEach(fieldName=>{
            if(copy[fieldName] && copy[fieldName].value){
                copy[fieldName] = copy[fieldName].value;
            }
        })
        if(copy.IMAGE){
            let filename = Util.getPropertySafe(copy,"IMAGE","value");
            copy.IMAGE = filename; // like 'cat.png'
        }

        /* When POSTing a new client, ensure that we send certain fields with their default values
        instead of leaving them unset.
        Note that this will not overwrite a field set to undefined, because we use hasOwnProperty! */
        if(willPOST()){
            const defaultFieldNames = ["LOGIN_PASSWORD"];
            const defaultFieldValues = [""];
            Util.setFieldsIfUnset(copy,defaultFieldNames,defaultFieldValues);
        }
        return copy;
    }
    const loadClientTypesList = () => {
        let promise = LabelsService.getLabel(clientid, 'VCOM_CLIENT_LABEL_TYPE_VERBOSE');
        return promise.then(function (result) {
            var typeObj = result.data.VCOM_CLIENT_LABEL_TYPE;
            $scope.clientTypes = Util.objectToArray(typeObj); // convert from {key:value,key:value} to //[{label:label,value:value},{label:label,value:value}]
            return $scope.clientTypes;
        });
    }

    const loadClient = () => {
        let promise;
        if(mode == 'add'){
            promise = $q.resolve({
                SYSTEM_ADMINISTRATION_PRIVILEGES: defaultPrivilegeValue,
                LABEL_CATEGORY: "VCOM_CLIENT"
            })
        }
        else{ // mode == edit or duplicate
            // promise = LabelStorageService.refreshFullDetailLabels([clientid]).then(result=>{
            promise = ClientConfigurationService.getClient(clientid).then(result=>{                      
                let client = result.data[0];
                if(mode == 'edit'){
                    return client;
                }
                else if(mode == 'duplicate'){ // to duplicate, copy the client and remove the ID
                    client = angular.copy(client); 
                    client.ID = undefined;
                    return client;
                }  
            })
        }
        promise.then(client=>{
            $scope.client = convertClientAfterLoading(client);
            console.log("loaded client",$scope.client);
            storedLoginName = $scope.client.LOGIN_NAME;
            return true;
        });
        return promise
    }
    


    const highlightErrors = () => {
        // scroll to missing inputs
        $location.hash('topAnchor')
        $anchorScroll();
        // make them flash red
        var elements;
        $timeout(()=>{
            elements = $(".has-error");
        },100)
        $timeout(()=>{elements.removeClass("has-error");},200);
        $timeout(()=>{elements.addClass("has-error");},400);
    }

    const willPOST = () => mode == 'add' || mode == 'duplicate';
    const willPUT = () => mode =='edit';
    const getAppropriateAPICall = () => {
        if(willPOST()) return ClientConfigurationService.postClient;
        if(willPUT()) return ClientConfigurationService.putClient;
        console.warn ("edit client controller > could not get appropriate api call. mode=",mode);
    }
    
    /*
     * Save client settings to server
     */
    $scope.save = function() {
        // Apply conversions to get ready to save
        console.log("before conversion",$scope.client);
        const convertedClient = convertClientForSaving($scope.client);
        console.log("after conversion",convertedClient);
        const submitForm = () => {
            const apiCall = getAppropriateAPICall();
            let promise = apiCall(convertedClient);
            ProgressBarService.track(promise,{showSuccess:true});
            promise.then(()=>{
                $uibModalInstance.close(convertedClient);
            });
        }

        if($scope.EditForm.$valid){
            submitForm();
        }
        else{
            highlightErrors();
        }
    }
    $scope.cancel = function() {
        $uibModalInstance.dismiss();  
    };

    function updateAllowAnonymousLogin(){
        if($scope.myFormData){
            let field = $scope.myFormData.getByModelName("LOGIN_NAME");
            if($scope.myFormModels.ALLOW_ANONYMOUS_LOGIN == "ON"){
                storedLoginName = $scope.myFormModels.LOGIN_NAME;
                $scope.myFormModels.LOGIN_NAME = "";
                field.placeholder = 'Anonymous login';
                field.required = false;
                field.disabled = true;
            }
            else{
                field.required = true;
                field.disabled = false;
                field.placeholder = '';
                $scope.myFormModels.LOGIN_NAME = storedLoginName;
            }
        } 
    }

    const getType = () => Util.getPropertySafe($scope,"clientTypeFormModels","LABEL_TYPE");
    const isP2P = () => getType() == "VIDEO_STREAMING_URI";
    const isRTSP = () => Util.startsWith(getType(),"RTSP");
    const showMyForm = () => isP2P();

    $scope.showOptions = () => !showMyForm();
    $scope.showRestrictions = () => !showMyForm();
    $scope.showMyForm = () => showMyForm();

    const setupClientTypeForm = () => {
        let form = Form(); // if we assigned $scope.clientTypeForm = Form() and then added the fields, initialValue initialization wouldn't happen
        loadClientTypesList().then(types=>{
            // LABEL_TYPE determined as follows
            // first check if we're loading a client and use its LABEL_TYPE. Then check if we stored the most recently used type. Then use the first value of the dropdown
            let initialLabelType = $scope.client.LABEL_TYPE || BrowserStorageService.get("addClientLabelType") || types[0].value;
            let fields = [{
                label:"Client Type",
                modelName:"LABEL_TYPE",
                type:"select",
                selectOptions:types,
                initialValue:initialLabelType,
                localStorage:"addClientLabelType" // save our chosen value whenever we modify this dropdown
            }]
            fields.forEach((f,i)=>{
                Object.assign(form.get(i),f);
            })
            $scope.clientTypeForm = form;
        })
    }



    function setupFormsForCurrentClientType(){
        setupMyForm();
        // $scope.optionsForm = Form();
        // getOptionsFields().forEach((f,i)=>{
        //     Object.assign($scope.optionsForm.get(i),f);
        // })
    }

    const setupMyForm = () => {
        if(!getType()) return; // client not yet loaded
        let fields = [];
        $scope.myFormData = Form();
        if(isP2P()){
            fields = [{
                label:"URI",
                modelName:"RTSP_URI",
                initialValue:$scope.client.RTSP_URI,
                required:true
            },{
                label:"Selector Talk/Listen Name",
                modelName:"SELECTOR_NAME",
                initialValue:$scope.client.SELECTOR_NAME,
                required:true
            }]
        }
        else{
            fields = [{
                    label:"Client Description",
                    modelName:"DESCRIPTION",
                    initialValue:$scope.client.DESCRIPTION
                },{
                    label:"Login Name",
                    modelName:"LOGIN_NAME",
                    initialValue:$scope.client.LOGIN_NAME
                },{
                    label:"Login Password",
                    modelName:"LOGIN_PASSWORD",
                    initialValue:$scope.client.LOGIN_PASSWORD,
                    type:AuthenticationService.getUserInfo("auths","allowPasswordDisplay")?"text":"password"
                },{
                    label:"Allow Anonymous Login",
                    type:"toggleSwitch",
                    modelName:"ALLOW_ANONYMOUS_LOGIN",
                    initialValue:$scope.client.ALLOW_ANONYMOUS_LOGIN
                },{
                    label:"Use Domain Authentication",
                    type:"toggleSwitch",
                    modelName:"USE_DOMAIN_AUTHENTICATION",
                    initialValue:$scope.client.USE_DOMAIN_AUTHENTICATION
                },{
                    label:"Selector Talk/Listen Name",
                    modelName:"SELECTOR_NAME",
                    initialValue:$scope.client.SELECTOR_NAME,
                    required:true // Note this field is required!
                },{
                    label:"Selector Listen Only Name",
                    modelName:"SELECTOR_NAME_LISTEN_ONLY",
                    initialValue:$scope.client.SELECTOR_NAME_LISTEN_ONLY
                },{
                    label:"Selector Image",
                    modelName:"IMAGE",
                    type:"imagefile",
                    initialValue:$scope.client.IMAGE
                }
            ];
            if(isRTSP()){
                fields.splice(2,0,{
                    label:"URI",
                    modelName:"RTSP_URI",
                    initialValue:$scope.client.RTSP_URI,
                    required:true
                })
            }
            if($scope.isTIForHasTrunking){
                fields.push({
                    label:"External Alpha (8U Characters)",
                    modelName:"EXTERNAL_NAME_LONG",
                    initialValue:$scope.client.EXTERNAL_NAME_LONG
                })
                fields.push({
                    label:"External Alpha (4 Characters)",
                    modelName:"EXTERNAL_NAME_SHORT",
                    initialValue:$scope.client.EXTERNAL_NAME_SHORT
                })
            }
        }
        fields.forEach((f,i)=>{
            Object.assign($scope.myFormData.get(i),f);
        })

        /* Keep track of whether login name is required or disabled, due to setting of Allow Anonymous Login */
        updateAllowAnonymousLogin();
        $scope.$watch('myFormModels.ALLOW_ANONYMOUS_LOGIN', () => {
            updateAllowAnonymousLogin();
        })
    }

    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
    };

    init();
});
/* global app Util */
app.controller('EditGroupController', 
function($scope, $uibModalInstance, ProgressBarService, BrowserStorageService, AuthenticationService,
    NotificationService, GroupConfigurationService, group, mode) {
    const DEFAULT_MODE = 'add';
    const MODES = ['add','edit'];
    const ALWAYS_SHOW_EXTERNAL_NAME_FIELDS = false;
    const DEFAULT_LABEL_TYPE = "FIXED_GROUP";
    const TITLES = {
        'add':'Add Group',
        'edit':'Edit Group'
    }
    const TYPES = [
        {
            label:"Fixed Group",
            value:"FIXED_GROUP"
        },
        {   
            label:"Party Line",
            value:"PARTY_LINE"
        }
    ]

    let disableTypeDropdown = false;

    const init = () => {
        if(!MODES.includes(mode))mode=DEFAULT_MODE;
        if(mode == 'add'){
            group = {};
        }
        else if(mode == 'edit'){
            disableTypeDropdown = true; // disallow changing of the type dropdown
            // group is supplied through dependency injection
        }

        $scope.screenTitle = TITLES[mode];
        $scope.group = group; // keep group and $scope.group in sync as they point to the same object

        console.log("GROUP",group);
        setupForm();
    }


    function showExternalNameFields(){return ALWAYS_SHOW_EXTERNAL_NAME_FIELDS || AuthenticationService.hasTrunking()};
    function highlightErrors(){NotificationService.add({message:"Please complete the form in its entirety",type:"warning"});}
    $scope.save = function() {
        if(!$scope.EditForm.$valid){
            highlightErrors();
            return;
        }

        Object.assign($scope.group,$scope.myFormModels); // get info from the automatically generated <myform>

        
        // Set the Client Type
        let apiCall;
        
        if(mode == 'add'){
            $scope.group.LABEL_CATEGORY = 'VCOM_' + group.LABEL_TYPE;//getType(); // VCOM_PARTY_LINE or VCOM_FIXED_GROUP
            // $scope.group.LABEL_IS_FG = getType() == "FIXED_GROUP";
            // $scope.group.LABEL_IS_PL = getType() == "PARTY_LINE";
            apiCall = GroupConfigurationService.postGroup;
        }
        else if(mode == 'edit'){
            apiCall = GroupConfigurationService.putGroup;
            /* The group was a medium-detail label gotten from LabelStorageService.getAllGroups
            The server returns the group without its MEMBERS array and we initialize it to [].
            If we PUT it back to the server we will delete all the members. */
            delete group.MEMBERS; 
        }
        let promise = apiCall(group);
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then(result=>{
            let id = Util.getPropertySafe(result,"data","ID"); // if we POSTed, we receive an object in return with an ID
            $uibModalInstance.close(id);
        });
    }
    $scope.cancel = $uibModalInstance.dismiss;


    function setupForm(){
        let fields = [];
        $scope.myFormData = Form();
        $scope.myFormModels = {};
        let initialGroupType = $scope.group.LABEL_TYPE || BrowserStorageService.get("addGroupLabelType") || DEFAULT_LABEL_TYPE;
        fields = [
            {
                label:"Group Type",
                modelName:"LABEL_TYPE",
                type:"select",
                selectOptions:TYPES,
                disabled:disableTypeDropdown,
                initialValue:initialGroupType,
                localStorage:"addGroupLabelType"
            },
            {
                label:"Description",
                modelName:"DESCRIPTION",
                initialValue:$scope.group.DESCRIPTION
            },
            {
                label:"Selector Talk/Listen",
                modelName:"SELECTOR_NAME",
                initialValue:$scope.group.SELECTOR_NAME
            }
        ]

        if(showExternalNameFields()){
            fields.push({
                label:"External Alpha (8U Characters)",
                modelName:"EXTERNAL_NAME_LONG",
                initialValue:$scope.group.EXTERNAL_NAME_LONG
            })
            fields.push({
                label:"External Alpha (4 Characters)",
                modelName:"EXTERNAL_NAME_SHORT",
                initialValue:$scope.group.EXTERNAL_NAME_SHORT
            })
        }

        fields.forEach((f,i)=>{
            Object.assign($scope.myFormData.get(i),f);
        })
    }
    init();
});

/* global app Util */
app.controller('EditRemoteConfigurationController',
function($scope, $uibModalInstance, $sce, LabelsService, label, ProgressBarService) {
    
    $scope.label = label;
    
    $scope.labelTypes= Util.buildLabelTypes();
    $scope.selectedLabelType = undefined;

    const init = () => {
        let labelCategory = Util.getPropertySafe(label,"LABEL_CATEGORY");
        $scope.selectedLabelType = Util.findElementWithProperty($scope.labelTypes,"value",labelCategory);
    }
    
    $scope.save = function() {
        let promise = LabelsService.putLabel($scope.label);
        ProgressBarService.track(promise,{showSuccess:true})
        promise.then(()=>$uibModalInstance.close(label)); // close the modal, and send the edited label to the other controller
    };
    
    $scope.cancel = $uibModalInstance.dismiss;
    
    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
    };
    
    init();
    
});


/* global app Grid*/
app.controller('GroupConfigurationListController',
    function($scope, $state, $uibModal, $q, SelectorDescriberService,
        ModalConfirmer, GroupConfigurationService,
        LabelStorageService, ProgressBarService, NotificationService) {
  
    /* Variables */
    let grid = Grid($scope);
    let rightGrid = Grid($scope);
    let rightOptions;
    let allGroups;
    /* Functions */
    const init = () => {
        let promise = $q.all([
            setupGrid(),
            LabelStorageService.refreshAllClients(),
            /* For the time being, making these calls sequentially in order to avoid thread-unsafe behavior */
            loadGroups()
        ]);
        ProgressBarService.track(promise);
        promise.then(()=>{
            console.log("all promises resolved",allGroups);
            setupPreviews();
            grid.setRows(allGroups);
        })
    }
    const refresh = () => {
        /* If we have a currently selected group, then reselect it when refreshing.
        This is different than grid.enableMaintainSelection because it works off of the ID of the group
        rather than the index in the grid. */
        let selectedIDs = grid.getSelectedRows().map(row=>row.ID);
        let promise = loadGroups();
        ProgressBarService.track(promise);
        promise.then(()=>{
            grid.setRows(allGroups);
            grid.selectByIDs(selectedIDs);
        })
        return promise;
    }
    const setupGrid = () => {
        console.log("setting up grid")
        let options = grid.getOptions();
        options.rowSelection = "multiple";
        options.enableAutoVerticalResize = true;
        options.enableAutoSizeColumnsToFit = true;
        options.columnDefs = [
            {field:'LABEL_TYPE_SUFFIX',     headerName:'Group Type',        width:130},
            {field:'LABEL_NAME',            headerName:'Talk/Listen Name',  width:150},
            {field:'DESCRIPTION',           headerName:'Description',       width:200},
            {field:'LATCHABLE_DISPLAY',     headerName:'Latchable',         width:75},
        ]
        let lPromise = grid.attachToElementBySelector("#groupConfigurationGrid")

        rightOptions = rightGrid.getOptions();
        rightOptions.rowSelection="none";
        rightOptions.enableAutoVerticalResize = true;
        rightOptions.enableAutoSizeColumnsToFit = true;
        rightOptions.columnStateFG = [
            {colId:"name"}
        ]
        rightOptions.columnStatePL = [
            {colId:"name"},
            {colId:"mode"}
        ]
        rightOptions.columnDefs = [
            {colId: "name", field: 'SELECTOR_NAME',       headerName: 'Name'},
            {colId: "mode", field: 'HUMAN_FRIENDLY_MODE', headerName: 'Mode'}
        ]
        let rPromise = rightGrid.attachToElementBySelector("#groupMembersGrid");

        return $q.all([lPromise,rPromise]);
    }
    const setupPreviews = () => {
        /* using onSelectionChange instead of grid.onRowSelected might cause bugs as it triggers twice on a normal selection
        triggering on the deselect of the previous row and the select of the new row. */
        grid.onSelectionChange(rows=>{
            console.log("selection changed",rows);
            if(rows.length == 1){
                // preview
                let selected = rows[0];
                showMembersPreview(selected.ID);
                
            }
            else{
                clearPreview();
            }
        })
    }
    const clearPreview = () => rightGrid.clearRows();
    const setRightState = state => {
        rightOptions.columnApi.setColumnState(state);
        rightGrid.sizeColumnsToFit();
    }
    const previewFG = () => setRightState(rightOptions.columnStateFG);
    const previewPL = () => setRightState(rightOptions.columnStatePL);
    const labelToPreviewRows = label => {

        if(label.LABEL_IS_FG)previewFG();
        else if(label.LABEL_IS_PL)previewPL();

        let members = label.MEMBERS; // {ID,ALIAS,TYPE}
        console.log("members",members);
        if(Array.isArray(members) && members.length > 0 ){ // Some members
            return members.map(member=>{
                return{
                    MODE:member.TYPE,
                    HUMAN_FRIENDLY_MODE:SelectorDescriberService.getSelectorType(member),
                    SELECTOR_NAME:LabelStorageService.getLabelName(member.ID)
                }
            });
        }
        else{ // No members
            return [];
        }
    }
    const showMembersPreview = id => {
        let promise = LabelStorageService.refreshFullDetailLabels([id]).then(labels=>{
            let label = labels[0];
            let previewRows = labelToPreviewRows(label);
            rightGrid.setRows(previewRows);
        })
        ProgressBarService.track(promise);
        return promise;
    }
    const loadGroups = () => {
        return LabelStorageService.refreshAllGroups().then(groups=>{
            allGroups = groups;
        })
    }

    const addGroup = () => {
        let modalInstance = $uibModal.open({
			controller: 'EditGroupController',
			templateUrl: 'views/editGroup-dialog.html',
			backdrop: 'static',
            resolve: {
                mode: () => 'add',
                group: () => undefined
            }
        });
        /* After adding, we get the ID of the new group from the API's response.
        We refresh the grid to see the new group, and then select it based on that ID.
        */
		modalInstance.result.then(id=>{
            refresh().then(()=>{
                grid.deselectAll();
                grid.selectByIDs([id]);
            })
        });
    }

    const getSelectedGroup = () => grid.getSelectedRows()[0]

    const editSelectedGroup = () => {
        let selectedGroup = getSelectedGroup();
        let modalInstance = $uibModal.open({
			controller: 'EditGroupController',
			templateUrl: 'views/editGroup-dialog.html',
			backdrop: 'static',
            resolve: {
                mode: () => 'edit',
                group: () => selectedGroup
            }
        });
		modalInstance.result.then(refresh);
    }

    const deleteSelectedGroups = () => {
        let selected = grid.getSelectedRows();
        let length = selected.length;
        let message = length == 1? "Are you sure you want to delete this group?" : 
                                   "Are you sure you want to delete these " + selected.length + " groups?";
        const onConfirm = () => {
            let promises = [];
            selected.forEach(group=>{
                promises.push(GroupConfigurationService.deleteGroup(group));
            })
            $q.all(promises)
            .then(onSuccessDeleting)
            .catch(onFailureDeleting);
        }
        const onSuccessDeleting = ()=>{
            grid.deselectAll(); // Don't select anything after deleting. This is the same behavior as the Windows System Admin
            refresh();
        };
        const onFailureDeleting = () => {
            NotificationService.add({message:"Failed to perform the desired deletions",type:"danger"});
        }

        ModalConfirmer.prompt({
            title:"Confirm Deletion",
            message:message,
            okayLabel:"Delete"
        }).then(onConfirm);
    }
    const showMembershipOfSelectedGroup = () => $state.go('groupMembership', { 'group' : getSelectedGroup() });

    /* Functions exposed to $scope */
    $scope.hasOneSelected =     grid.hasOneSelected;
    $scope.hasNoneSelected =    grid.hasNoneSelected;
    $scope.showMembership =     showMembershipOfSelectedGroup;
    $scope.add =                addGroup;
    $scope.delete =             deleteSelectedGroups;
    $scope.edit =               editSelectedGroup;
    $scope.refresh =            refresh;
    $scope.getPreviewGridTitle = () => {
        if(grid.getSelectedRows().length != 1){
            return "Members of selected group";
        }
        else{
            return "Members of "+getSelectedGroup().SELECTOR_NAME;
        }
    }

    SelectorDescriberService.waitUntilReady().then(()=>{
        init();
    });
});
/* global app Grid Util */
app.controller('GroupMembershipController',
function($scope, $state, $stateParams, GroupConfigurationService, $q,
    ProgressBarService, SelectorDescriberService, LabelStorageService) {
    
    /* Parameters */

    /* Variables */
    let group; // the group whose members we are adding/removing
    let allClients;
    let leftGrid = Grid($scope);
    let rightGrid = Grid($scope);

    /* Functions */
    const init = () => {
        retreatIfGroupUndefined();
        $scope.group=$stateParams.group; // good for displaying the name of the group before we've fully loaded it
        loadEverything().then(()=>{
            setupGrids().then(populateGrids);
        });
    }
    const loadFullDetailGroup = () => {
        return LabelStorageService.refreshFullDetailLabels([$stateParams.group.ID]).then(labels=>{
            group = labels[0];
            if(!group.MEMBERS) group.MEMBERS = [];
            $scope.group = group;
            $scope.isFG = group.LABEL_TYPE_PREFIX === "FG";
        })
    }
    const loadAllClients = () => {
        return LabelStorageService.refreshAllClients().then(clients=>{
            allClients = clients;
        })
    }
    const loadEverything = () => {
        let promise = $q.all([
            loadFullDetailGroup(),
            loadAllClients()
        ]);
        ProgressBarService.track(promise);
        return promise;
    }

    const retreatIfGroupUndefined = () => {
        let g = $stateParams.group;
        if(g == undefined || g == null || g == ""){
            leave();
        }
    };

    const setupGrids = () => {
        return $q.all([
            setupLeftGrid(),
            setupRightGrid()
        ])
    }
    /* Unassigned group members */
    const setupLeftGrid = () => {
        let options = leftGrid.getOptions();
        options.enableAutoSizeColumnsToFit = true;
        options.columnDefs = [
            {field:"LABEL_TYPE_FULL_DETAIL",headerName:"Client Type",   width:200},
            {field:"LABEL_NAME",            headerName:"Name",          width:120},
            {field:"DESCRIPTION",           headerName:"Description",   width:150}
        ]
        return leftGrid.attachToElementBySelector("#leftGrid").then(()=>{
            leftGrid.trackSelectionOnScope("leftSelected"); // keeps $scope.leftSelected updated
        })
        
    }
    /* Assigned group members */
    const setupRightGrid = () => {
        let options = rightGrid.getOptions();
        options.enableMaintainSelection = true; // when grid refreshes, we won't lose which is selected
        options.enableAutoSizeColumnsToFit = true;
        options.columnDefs = [
            {field:"SELECTOR_NAME",            headerName:"Name",          width:100},
            {field:"MODE",                     headerName:"Mode",          width:100}
        ]
        /* Fixed Groups don't have the notion of 'mode' so let's remove this */
        if($scope.isFG){
            options.columnDefs = options.columnDefs.filter(colDef=>{
                return colDef.field !== "MODE"
            })
        }
        return rightGrid.attachToElementBySelector("#rightGrid").then(()=>{
            rightGrid.trackSelectionOnScope("rightSelected");
        })
    }
    
    /* Keep members decorated with MODE property */
    const updateRightGrid = () => {
        let members = group.MEMBERS;
        console.log("updating right grid",members);
        members.forEach(member=>{
            member.MODE = SelectorDescriberService.getSelectorType(member);
            member.SELECTOR_NAME = Util.findElementWithProperty(allClients,"ID",member.ID).SELECTOR_NAME
        })
        rightGrid.setRows(members);
    }
    $scope.$watchCollection("group.MEMBERS",()=>{
        if(group && group.MEMBERS && rightGrid.getOptions().api && allClients){
            updateRightGrid();
        }
    })

    const addNonAssignedSelector = type => {
        let selector = {
            TYPE:type,
            ID:$scope.leftSelected.ID,
            SELECTOR_NAME:$scope.leftSelected.SELECTOR_NAME
        }
        group.MEMBERS.push(selector);
        leftGrid.selectNextRow();
        console.log("adding",selector)
    }

    const removeSelector = () => {
        let index = rightGrid.getFirstSelectedIndex();
        group.MEMBERS.splice(index,1);
    }

    /* Unsure of the origin of this logic, but apparently the only unassigned groups we want to show are ...
    any client (not group) (if this group is a fixed group)
    VDI, SIP, RTSP (if this group is a party line) */
    const isGroupSuitableForLeftGrid = label => {
        let groupType = group.LABEL_TYPE;
        let labelType = label.LABEL_TYPE_PREFIX;
        let case1 = group.LABEL_IS_FG && ['VCP','VDI','SIP','RTSP'].includes(labelType);
        let case2 = group.LABEL_IS_PL && ['VDI','SIP','RTSP'].includes(labelType);
        return case1 || case2;
    }
    const populateGrids = () => {
        populateLeftGrid();
        updateRightGrid();
    }
    const populateLeftGrid = () => {
        leftGrid.setRows(allClients.filter(isGroupSuitableForLeftGrid));
    }
   
    const clear = () => {
        group.MEMBERS = [];
        rightGrid.deselectAll();
    }
    
    const save = () => {
        console.log("putting group",group);
        group.MEMBERS.forEach(member=>member.SELECTOR_TYPE=member.TYPE);
        let promise = GroupConfigurationService.putGroup(group);
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then(leave);
    }
    const leave = () => $state.go("groupConfigurationList");
    
    /* Expose variables to $scope */
    $scope.addNonAssignedSelector = addNonAssignedSelector;
    $scope.removeSelector = removeSelector;
    $scope.clearAllSelectors = clear;
    $scope.save = save;
    $scope.cancel = () => leave();
    
    init();
    
});
/* global app Util $*/
app.controller('HeaderController',
function( $scope,  $state, RestartSystemService, EnvService, ConnectionService, ConnectionStatusService,LogoService, BrandingService,
    $uibModal,  $interval, AuthenticationService, ModalConfirmer, ForcedFailoverService,
    NotificationService,  TestingService, DebugService, ProgressBarService, EnabledService) {

    /* Expose to Scope */
    $scope.userName =               userInfo("userName");
    $scope.getCurrentState =        () => $state.current.UIname;
    $scope.BrandingService =        BrandingService;
    $scope.getLogoSrc =             LogoService.getSrc;
    $scope.logout =                 ConnectionService.logoutManual;
    $scope.testFunctions =          Util.objectToArray(TestingService);
    $scope.restartSystem =          promptRestartSystem;
    $scope.forcedFailover =         promptForcedFailover;
    $scope.userInterfaceSettings =  openUserInterfaceSettings;
    $scope.ssl =                    openSSL;
    $scope.license =                openLicense;
    /* Expose to scope functions to go to all of these locations */
    let locations = [
        "systemStatus", // $scope.systemStatus = () => $state.go('systemStatus'); 
        "systemSettings", // $scope.systemSettings = () => $state.go('systemSettings');
        "clientConfigurationList", // ...
        "groupConfigurationList",
        "remoteConfigurationList",
        "clientStatistics",
        "sipRegistrations",
        "activityLog",
        "debugLog",
        "virtualRealityConfiguration",
        "telephoneInterface",
        "geo"
    ];
    locations.forEach(location=>{
        $scope[location] = () => $state.go(location);
    })

    /* Implementations */
    function promptRestartSystem(){
        ModalConfirmer.prompt({
            title: "Restart System",
            messageClass: "alert alert-warning",
            message:"WARNING: This will result in a server restart and will temporarily render the system inoperable. Do you wish to proceed?",
            okayLabel:"Restart",
            focusOkay: false
        })
        .then(RestartSystemService.restartSystem)
	}
    function promptForcedFailover(){
        ModalConfirmer.prompt({
            title: "Force Failover",
            messageClass: "alert alert-warning",
            message:"WARNING: This will result in a forced failover and result in the momentary disconnection of all clients. Do you wish to proceed?",
            okayLabel:"Force Failover",
            focusOkay: false
        })
        .then(ForcedFailoverService.forcedFailover)
    }
    function openUserInterfaceSettings(){
		$uibModal.open({
			controller: 'UserInterfaceSettingsController',
			templateUrl: 'views/userInterfaceSettings-dialog.html',
			backdrop: 'static'
		});
	}
    function openLicense(){
		$uibModal.open({
			controller: 'LicenseController',
			templateUrl: 'views/license-dialog.html'
		});
    }
    function openSSL(){
        $uibModal.open({
			controller: 'SSLController',
			templateUrl: 'views/ssl-dialog.html',
			backdrop: 'static'
		});
    }

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
    function userInfo(){ return AuthenticationService.getUserInfo(...arguments); }
    const systemSupport = prop => userInfo('systemSupport',prop);
    const isMasterSystemAdministrator = () => {
        return userInfo('auths','accessLevel') == 0;
    }
    let isLoggedIn =        () => ConnectionService.isLoggedIn();
    let isTIF =             () => AuthenticationService.isTIF();
    let hasTrunking =       () => AuthenticationService.hasTrunking();
    let isNotTIF =          () => !isTIF();
    let isSimpleTIF =       () => isTIF() && simpleMenu;
    let isNotSimpleTIF =    () => !isSimpleTIF();
    let showHeader =        () => isLoggedIn() || DebugService.isEnabled()
    
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
    $scope.showSystemSettings =                 () => EnabledService.systemSettings();
    $scope.showClientConfigurationList =        () => true;
    $scope.showGroupConfigurationList =         () => true;
    $scope.showRemoteConfiguration =            () => hasTrunking();
    $scope.showUserInterfaceSettings =          () => systemSupport('supportsUserInterfaceSettings');
    $scope.showVirtualRealityConfiguration =    () => EnabledService.vr360Config();

    /* System Information */
    $scope.showSystemInformation =  () => isNotSimpleTIF() // parent of the items below
    $scope.showSystemStatus =       () => true; // for Mobile and TIF
    $scope.showClientStatistics =   () => true;
    $scope.showSipRegistrations =   () => true;
    $scope.showGeolocation =        () => EnabledService.geoOnVSA();
    $scope.showActivityLog =        () => true;
    $scope.showDebugLog =           () => userInfo('debug') == true;

});
/* global app */
app.controller('LicenseController',
    function( $scope, $timeout, $state, $uibModal, ModalConfirmer,BrandingService,
    $uibModalInstance, AuthenticationService, LicenseService, ProgressBarService) {

    $scope.systemIdentificationCode = '';
    $scope.licenseFile = undefined;
    
    loadControllerData();
    
    function loadControllerData() {
        LicenseService.getSystemIdentificationCode()
        .then(function(result) {
            $scope.systemIdentificationCode = result.data.SYSTEM_IDENTIFICATION_CODE;
        });
    }
    
    const updatePermissions = newPermissions => {
         AuthenticationService.updateSystemSupportPermissions(newPermissions);
         $timeout(()=>{
             if(AuthenticationService.isTIF()){
                 $state.go('telephoneInterface')
             }
             else{
                 $state.go('home');
             }
             $scope.close();
         },1500)
    }
    
    $scope.upload = function(file) {
        const onSuccess = result => {
            const newPermissions = result.data;
            updatePermissions(newPermissions);
        }
        let promise = LicenseService.uploadLicense(file);
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then(onSuccess);
    };
    
    $scope.invalidateLicense = function() {
        let onConfirm = () => {
            let promise = LicenseService.invalidateLicense();
            ProgressBarService.track(promise);
        }
        var warningText = 'WARNING: This will invalidate any existing license (after the next OS reboot) by changing the System Identification Code.  This step is ONLY required if this server is being decommissioned in order to allow a replacement license to be generated.  Are you sure you wish to proceed?';
        ModalConfirmer.prompt({
            title: "Confirm Invalidate License",
            okayLabel:"Invalidate",
            cancelLabel:"Cancel",
            message:warningText,
            messageClass:"alert alert-danger"

        }).then(onConfirm);
    };
    
    $scope.productName = BrandingService.getProductName();
    
    $scope.close = function() {
        $uibModalInstance.close();
    };
	
});

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
    
    
/* global app Grid */
app.controller('RemoteConfigurationListController',
 function($scope, $state, $uibModal, LabelStorageService,ProgressBarService,SelectorDescriberService) {
    /* Variables */
    let grid = Grid($scope);
    /* Functions */
    const init = () => {
        setupGrid();
        loadTelexLabels();
    }
    const setupGrid = () => {
        let options = grid.getOptions();
        options.enableAutoVerticalResize = true;
        options.hideEmptyColumns = true;
        options.columnDefs = [
            {field:'LABEL_SYSTEM_NAME',     headerName:'System Name',       width:130}, // these widths arrived at empirically
            {field:'SYSTEM_NUMBER',         headerName:'#',                 width:75}, 
            {field:'LABEL_TYPE_FULL_DETAIL',headerName:'Label Type',        width:130},
            {field:'LABEL_NAME',            headerName:'Talk/Listen Name',  width:150},
            {field:'DESCRIPTION',           headerName:'Description',       width:130},
            {field:'EXTERNAL_NAME_LONG',    headerName:'Ext Alpha (8U)',    width:130},
            {field:'EXTERNAL_NAME_SHORT',   headerName:'Ext Alpha (4)',     width:130},
            {field:'RESTRICTIONS_DISPLAY',  headerName:'Restrict',          width:75}, 
            {field:'PORT',                  headerName:'Port',              width:75},
        ]
        grid.attachToElementBySelector("#remoteConfigurationGrid")
    }
    /* Get labels that have SYSTEM_TYPE == 'TELEX' */
    const loadTelexLabels = () => {
        let promise = LabelStorageService.refreshAllLabels();
        ProgressBarService.track(promise);
        promise.then(labels=>{
            let telexLabels = labels.filter(label=>label.SYSTEM_TYPE == "TELEX");
            grid.setRows(telexLabels);
        })
    }
    const editSelectedLabel = () => {
        let label = grid.getSelectedRows()[0];
        let modalInstance = $uibModal.open({
			controller: 'EditRemoteConfigurationController',
			templateUrl: 'views/editRemoteConfiguration-dialog.html',
			backdrop: 'static',
            resolve: {
                label: ()=> label
            }
		});
		modalInstance.result.then(label => {
            // update the appropriate row
            grid.updateRow(label);
        });
    }
    const openDeletePrompt = () => {
        let modalInstance = $uibModal.open({
			controller: 'RemoteConfigurationListDeleteController',
            templateUrl: 'views/remoteConfigurationListDelete.html',
            size:"lg"
		});
		modalInstance.result.then(loadTelexLabels);
    }
    /* Functions exposed to $scope */
    $scope.disableEditButton = () => !grid.hasOneSelected();
    $scope.editSelectedLabel = editSelectedLabel;
    $scope.openDeletePrompt = openDeletePrompt;

    SelectorDescriberService.waitUntilReady().then(init);
    // init();
});
/* global app Util Loader Grid*/
app.controller(
    'RemoteConfigurationListDeleteController',
    ( $scope,  $uibModalInstance, ModalConfirmer, SystemListService, LabelsService, $q) => {

    
    const changingSelectedSystemsClearsPreview = true;
    const changingRemovalModeClearsPreview = true;

    let grid;
    let previewGrid;
    let selectedIndices = [];
    let systems;
    const deleteLoader = Loader($scope,"delete");
    const previewLoader = Loader($scope,"preview");
    const getSystemList = SystemListService.getSystemList;
    // let getSystemList = () => {
    //     return $q.resolve({data:[
    //         {
    //           "SYSTEM_INDEX":0,
    //           "SYSTEM_ID":256,
    //           "SYSTEM_TYPE":"TELEX",
    //           "SYSTEM_NAME":"WNBC"
    //         },
    //         {
    //           "SYSTEM_INDEX":1,
    //           "SYSTEM_ID":257,
    //           "SYSTEM_TYPE":"TELEX",
    //           "SYSTEM_NAME":"CHI"
    //         }
    //     ]});            
    // }

    /* the currently selected Systems */
    let targetSystems = [];
    const setTargets = newTargets => {
        targetSystems = newTargets;
        if(changingSelectedSystemsClearsPreview)clearPreview();
    }
    
    $scope.removalMode = "normal"; // the alternative is "assignmentRestricted"
    $scope.$watch("removalMode",()=>{
        if(changingRemovalModeClearsPreview)clearPreview();
    })


    /* show results of our delete operation */
    $scope.numPanelsWithDeletions = 0;
    $scope.numPanelsWithErrorsDeleting = 0;
    $scope.numKeysDeleted = 0;
    $scope.numKeysWithErrorsDeleting = 0;
    $scope.numToDelete = 0;                 // count of selectors in the deletion preview
    $scope.showDeletionResults = false;
    $scope.previewComplete = false;
    // $scope.ableToPreview = 
    $scope.ableToDelete = false;
    

    const clearResults = () => {
        $scope.numPanelsWithDeletions = 0;
        $scope.numPanelsWithErrorsDeleting = 0;
        $scope.numKeysDeleted = 0;
        $scope.numKeysWithErrorsDeleting = 0;
        $scope.numToDelete = 0;
        $scope.showDeletionResults = false;
        deleteLoader.hide();
        previewLoader.hide();
    }
    const clearPreview = () => {
        if(previewGrid.isInitialized())previewGrid.clearRows(); // empty the grid
        $scope.ableToDelete = false; // disable delete button
        $scope.previewComplete = false; // fade out preview area
        clearResults();
    }

    const init = () => {
        initializeIntercomList();
        initializePreviewGrid();
    }
    // $scope.$watch("removalMode",()=>{
    //     $scope.previewComplete = false;
    // })
    // $scope.$watch("target",()=>{
    //     $scope.previewComplete = false;
    // })
    
    

    /* Configure the Grid that lists the Intercoms to be selected */
    const initializeIntercomList = () => {
        grid = Grid($scope);
        getSystemList().then(result=>{
            systems = result.data;
            systems.sort(Sorting.getComparatorByProperty("SYSTEM_NAME"));
            // Util.sortOnProperties(systems,["SYSTEM_NAME"]);
            const options = grid.getOptions();
            /* customize the grid */
            options.rowDeselection = false;
            options.rowSelection = 'multiple';
            options.enableAutoSizeAllColumns = true;
            /* grid columns */
            options.columnDefs = [
                {headerName: "System Name", minWidth: 327, field: "SYSTEM_NAME", tooltipField:"SYSTEM_NAME"},
            ]
            /* grid rows */
            options.rowData = systems;
            /* Because this is a modal, we have to wait a small amount of time before our div exists */
            Util.waitForElement("#mygrid").then($grid=>{
                grid.attachToElement($grid[0]);
                /* on click row */
                grid.onSelectionChange(data => {
                    console.log("selection changed",data);
                    if(data.length > 0){
                        setTargets(data);
                        selectedIndices = data.map(intercom=>intercom.SYSTEM_INDEX);
                    }
                    else{
                        setTargets([]);
                    }
                });
            })
        });
    }

    const initializePreviewGrid = () => {
        previewGrid = Grid($scope);
        previewGrid.getOptions().enableColResize = true;
        previewGrid.getOptions().suppressRowClickSelection = true;
        previewGrid.getOptions().enableAutoSizeAllColumns = true;
        previewGrid.getOptions().columnDefs = [
            {headerName:"Selector Name",field:"selectorName",       minWidth:200},
            {headerName:"System Name",  field:"systemName",         minWidth:155},
            {headerName:"Selector Type",field:"selectorType",       minWidth:150},
            {headerName:"Client",       field:"labelDescription",   minWidth:150}
        ]
        Util.waitForElement("#previewGrid").then($grid=>{
            previewGrid.attachToElement($grid[0]);
            /* on click row */
        })
    }

    

    const SelectorAnalyzer = (() => {
        let allAssignedSelectorIDs = {}; // ids
        let allLabels = []; // mid detail labels
        let allControlPanels = []; // full detail labels
        let affectedLabels = [];

        const getControlPanels = () => {
            const isControlPanel = label => {
                return (typeof label.LABEL_TYPE === "string")  && label.LABEL_TYPE.includes("VCP");
            }
            return LabelsService.getAllLabels().then(result=>{
                allLabels = result.data;
                console.log("allLabels",allLabels);
                let controlPanelIDS = allLabels.filter(isControlPanel).map(label=>label.ID);
                return LabelsService.getLabels(controlPanelIDS).then(result=>{
                    allControlPanels = result.data;
                    console.log(allControlPanels,"allControlPanels");
                })
            });
        }

        const meetsDeletionCriteria = (()=>{
            const isInRemoteIntercom = selector => {
                return selector.SYSTEM_INDEX != undefined;
            }
            const isScrollDisabled = selector => {
                return selector.NO_LOCAL_ASSIGNMENT_BY_ADMINISTRATOR == 'ON' && selector.NO_LOCAL_ASSIGNMENT_BY_USER == 'ON'
            }
            const isInSelectedIntercoms = selector => {
                /* i had no clue that the expression "undefined && true" would return "undefined" rather than "false"... */
                return isInRemoteIntercom(selector) && selectedIndices.includes(selector.SYSTEM_INDEX);
            }
            const meetsDeletionCriteria = selector => {
                let criteria = [];
                if($scope.removalMode == "assignmentRestricted"){
                    criteria.push(isScrollDisabled(selector));
                }
                criteria.push(isInSelectedIntercoms(selector));
                return !criteria.includes(false);
            }
    
            return meetsDeletionCriteria;
        })();

        const assignedSelectorsIdentificationPassover = () => {
            allControlPanels.forEach(cp=>{
                if(cp.SELECTORS){
                    cp.SELECTORS.forEach(selector=>{
                        if(selector.ID){ // otherwise we could match with SPACERs and such
                            allAssignedSelectorIDs[selector.ID] = false;
                        }
                    })
                }
            })
        }
        const whichSelectorsMeetDeletionCriteriaPassover = () => {
            // find mid-level details
            Object.keys(allAssignedSelectorIDs).forEach(id=>{
                let label = allLabels.find(label=>label.ID == id);
                if(!label){
                    console.error("couldn't find label with id",id,"in all labels...",allLabels);
                }
                allAssignedSelectorIDs[id] = meetsDeletionCriteria(label);
            })
        }
        const findDeletionsPassover = () => {
            const hasDeletions = label => {
                return label.SELECTORS && label.SELECTORS.some(selector => allAssignedSelectorIDs[selector.ID]);
            }
            affectedLabels = allControlPanels.filter(hasDeletions);
            return affectedLabels;
        }

        const performDeletion = () => {
            if(affectedLabels.length < 1){
                console.error("preview deletion before trying to perform it!");
            }

            let updateLabelPromises = [];
            affectedLabels.forEach(label=>{
                /* Alter our local copy of the label */
                let numToDelete = 0;

                /* convert all of the assignments to be replaced with spacers */
                label.SELECTORS.forEach((selector,index)=>{
                    if(allAssignedSelectorIDs[selector.ID]){
                        /* replace this selector with a spacer */
                        label.SELECTORS[index] = {TYPE:"SPACER"}
                        ++numToDelete;
                    }
                })
                /* PUT the altered copy to the server */
                let promise = $q.when(LabelsService.putLabel(label))
                promise = promise.then(()=>{
                    $scope.numPanelsWithDeletions += 1;
                    $scope.numKeysDeleted += numToDelete;
                })
                /* handle errors PUTting an updated label */
                .catch(()=>{
                    $scope.numPanelsWithErrorsDeleting +=1;
                    $scope.numKeysWithErrorsDeleting += numToDelete;
                    // return $q.resolve(); // let's consider this a success ...
                })
                updateLabelPromises.push(promise);
            })
            /* resolve when all the PUTs are complete */
            if(updateLabelPromises.length > 0){
                return $q.all(updateLabelPromises)
            }
            else{
                /* no labels to update; we consider this successful */
                return $q.resolve();
            }
        }

        /* returns a promise that resolves with an array of labels
        each label is going to have one or more of its selectors removed */
        const findAffectedLabels = () => {
            return getControlPanels().then(()=>{
                assignedSelectorsIdentificationPassover(); // allAssignedSelectorIDs populated, all false
                console.log("should be all false",allAssignedSelectorIDs);
                whichSelectorsMeetDeletionCriteriaPassover(); // now set the ones to be deleted with True
                console.log("should be some true",allAssignedSelectorIDs);
                
                return findDeletionsPassover();
            })
        }

        /* returns a promise that resolves with an array of objects with the following properties...
            l: the label that is going to have a selector removed
            s: the selector to be removed
        */
        const recordDesiredDeletions = () => {
            let deletionsRecord = [];
            return findAffectedLabels().then(labels=>{
                labels.forEach(label=>{
                    let toBeRemoved = label.SELECTORS.filter(selector=>allAssignedSelectorIDs[selector.ID]);
                    toBeRemoved.forEach(tbr=>{
                        // get the mid-detail info
                        let selector = allLabels.find(label=>label.ID==tbr.ID)
                        selector.TYPE = tbr.TYPE; // TYPE info only availble from the SELECTORS array
                        /* decorate with name */
                        selector.NAME = selector.SELECTOR_NAME || selector.EXTERNAL_NAME_LONG || selector.EXTERNAL_NAME_SHORT || "";
                        deletionsRecord.push({l:label,s:selector})
                    })
                })
                return deletionsRecord;
            })
        }
        // this logic can be replaced by selectordescriberservice when we merge with that branch.
        const getSystemName = label => {
            let index = label.SYSTEM_INDEX;
            if(index == undefined){
                return "INTRACOM";
            }
            else{
                let sys = systems.find(item=>item.SYSTEM_INDEX == index);
                if(sys){
                    return sys.SYSTEM_NAME;
                }
                else{
                    return "";
                }
            }
        }
        let typeMap = {"SELECTOR":"Talk/Listen","SELECTOR_TALK":"Talk","SELECTOR_LISTEN":"Listen"}
        const previewDeletion = () => {
            return recordDesiredDeletions().then(record=>{
                console.log("desired deletions:",record.length,record);
                /* decorate selectors with name */
                
                /* sort deletion records.  Group by selector rather than by label */
                record.sort((a,b)=>{
                    let l = a.s.NAME; // name of one selector
                    let r = b.s.NAME; // name of other selector
                    if(l == undefined && r == undefined) return 0;
                    if(l<r || r == undefined) return -1;
                    if(l>r || l == undefined) return 1;
                    return 0;
                })

                previewGrid.setRows(record.map(r=>{
                    let s = r.s; // the selector
                    let l = r.l; // the label
                    // we can replace this logic by using the SelectorDescriberService once we merge with that branch
                    return {
                        labelDescription:   l.DESCRIPTION || l.ALIAS,
                        systemName:         getSystemName(s), // name of selector's system name
                        selectorType:       typeMap[s.TYPE],
                        selectorName:       s.NAME
                    }
                }))
                // previewGrid.resize();
                // previewGrid.sizeColumnsToFit();
                $scope.numToDelete = record.length;
            })
        }

        return{
            previewDeletion:previewDeletion,
            performDeletion:performDeletion
        }
    })();

    /* helps display text to user */
    const getSelectedIntercomsString = () => {
        if(grid){
            return grid.getSelectedRows().map(data=>data.SYSTEM_NAME).join(", ");
        }
        return "";
    }
            
    /* pop up a modal to confirm that the user wants to delete stuff */
    $scope.confirmDelete = () => {
        let modeString = ($scope.removalMode == "normal")?"all Selectors":"Scroll Restricted Selectors";
        let targetString = "the selected Intercoms ("+getSelectedIntercomsString()+")";
        let message = "Are you sure you want to delete " + modeString + " in " + targetString + "?";
        

        /* actually do the deletion */
        const onConfirm = () => {
            deleteLoader.pend();
            $scope.showDeletionResults = true;
            SelectorAnalyzer.performDeletion().then(()=>{
                $scope.ableToDelete = false;
                if($scope.numPanelsWithErrorsDeleting){
                    deleteLoader.fail("Some deletions failed.");
                }
                else{
                    deleteLoader.success();
                }
            })
        }
        const onCancel = () => console.log("cancelled.");
        ModalConfirmer.prompt({
            title:"Confirm Deletion",
            okayLabel:"Delete",
            message:message
        }).then(onConfirm).catch(onCancel);
    }

    $scope.previewDeletion = ()=>{
        clearResults();
        previewLoader.pend();
        SelectorAnalyzer.previewDeletion().then(()=>{
            previewLoader.success();
            $scope.ableToDelete = true;
            $scope.previewComplete = true;
            setTimeout(()=>{
                Util.scrollTo("#previewGrid",".modal")
                previewGrid.autoSizeAllColumns();
            }
            ,500);
        })
    }

    init();
    $scope.close = $uibModalInstance.close;
    $scope.getSelectedIntercomsString = getSelectedIntercomsString;
    $scope.noTarget = () => !targetSystems.length > 0

});
/* global app Grid Util*/
app.controller('SIPRegistrationsController', 
    function($scope, $interval, SIPRegistrationsService) {

    /* Constants */
    const updateInterval = Util.getSIPRegistrationsInterval();
    const showExternalOnlyDefault = true;
    /* Variables */
    let showExternalOnly = showExternalOnlyDefault;
    let grid = Grid($scope);
    let intervalHandle;
    /* Functions */
    const init = () => {
        setupGrid();
        intervalHandle = $interval(update,updateInterval);
        $scope.$on('$destroy',()=>$interval.cancel(intervalHandle));
        $scope.showExternalOnly = showExternalOnly?'ON':'OFF';
        $scope.$watch('showExternalOnly',()=>{
            console.log('show external only',$scope.showExternalOnly);
            showExternalOnly = $scope.showExternalOnly == 'ON'?true:false;
        })
    }

    const setupGrid = () => {
        let options = grid.getOptions();
        options.enableAutoVerticalResize = true;
        options.columnDefs = [
            {headerName:'User Name',        field:'SIP_USER_NAME'},
            {headerName:'Address of Record',field:'SIP_AOR'},
            {headerName:'Contact Detail',   field:'SIP_CONTACT',        width:450},
            {headerName:'Expiration Time',  field:'SIP_EXPIRATION_TIME'}
        ]
        grid.attachToElementBySelector("#sipRegistrationsGrid");
    }

    const update = () => {
        console.log("updating");
        let call = SIPRegistrationsService.getSIPRegistrations;
        if(showExternalOnly)call = SIPRegistrationsService.getExternalSIPRegistrations;
        call().then(function(result) {
            let data = result.data;
            console.log("data",data);
            grid.setRows(data);
        });
    }


    init();
});
/* global app Resource Util Form */
app.controller('SSLController',function($scope, $uibModalInstance,SSLService,DownloadService,
    FormModalService, ModalConfirmer, SystemSettingsService,ProgressBarService) {

    // const makeResource = params => Resource($scope,params); // Helper just to allow us to not have to type in $scope repeatedly
    const disconnectWarningMessage = "This will temporarily disconnect all connected users, including you.";
    function track(promise){
        ProgressBarService.track(promise,{showSuccess:true,showFailure:true})
    }

    // /* CSR */
    // const csr = makeResource({
    //     name:"csr", // $scope.csr will be set to the value of this resource
    //     getter:SSLService.getCSR,
    //     pullErrorMessage:"Failed to load CSR. Try generating one first.",
    // });
    // $scope.getCSR = csr.pull;
    // $scope.generateCSR = promptToGenerateCSR;


    // /* CRT */
    // const crt = makeResource({
    //     name:"crt",
    //     getter:SSLService.getCRT,
    //     setter:SSLService.installCRT,
    // });
    // $scope.getCRT = crt.pull;
    // const generateCRT = () => {
    //     SSLService.generateCRT()
    //     .then(crt.success)
    //     .catch(()=>crt.fail("Failed to generate CRT. Try generating a CSR first."));
    // }
    // $scope.promptToGenerateCRT = ()=>{
    //     const msg = "Are you sure you would like to generate a self-signed CRT? " + disconnectWarningMessage;
    //     ModalConfirmer.prompt({
    //         message:msg,
    //         okayLabel:"Generate"
    //     }).then(generateCRT);
    // }
    // const installCRT = () => {
    //     crt.setValue($scope.crt); // get text from textbox
    //     crt.push()
    //     .then(crt.success)
    //     .catch(()=>crt.fail("Failed to install CRT. Make sure to include a signed certificate from a CA in the text box."))
    // }
    // $scope.promptToInstallCRT = () => {
    //     const msg = "Are you sure you would like to install this CRT? " + disconnectWarningMessage;
    //     ModalConfirmer.prompt({
    //         message:msg,
    //         okayLabel:"Install"
    //     }).then(installCRT);
    // }

    // /* Private Key */
    // const privateKey = makeResource({
    //     name:"privateKey",
    //     getter:SSLService.getPrivateKey,
    // });
    // $scope.getPrivateKey = privateKey.pull;

    // const init = () => {
    //     /* pull in all the resources from the server */
    //     [crt,csr,privateKey].forEach(resource=>{
    //         resource.pull().finally(()=>{
    //             resource.params.loader.hide(); // Show neither success nor failure for initial load
    //         })
    //     })
    // }
    // init();




    function generateCRT(){
        track(SSLService.generateCRT());
    }

    function generateCSR(params){
        track(
            SSLService.generateCSR(params)
            .then(displayCSR)
            // .catch(()=>csr.fail("Failed to generate CSR with the following properties. \n" + Util.objToMultilineString(params)))
        )
    }


    function promptToGenerateCRT(){
        const msg = "Are you sure you would like to generate a self-signed CRT? " + disconnectWarningMessage;
        ModalConfirmer.prompt({
            message:msg,
            okayLabel:"Generate"
        }).then(generateCRT);
    }

    function promptToGenerateCSR(defaults){
        /* generate form */
        const fieldLabels = ["Domain Name Server(s)","Organization Name","Country Name (2 letter code)","State/Province (full name)"];
        const fieldModelNames =["DOMAIN_NAME_SERVERS","ORGANIZATION","COUNTRY","STATE_REGION"];
        const formdata = Form(4);
        const fields = formdata.get();
        fields.forEach((field,i)=>{
            field.label=fieldLabels[i];
            field.modelName=fieldModelNames[i];
            field.spellcheck = false;
            if(defaults && defaults[field.modelName]){
                field.initialValue=defaults[field.modelName];
            }
        });
        /* open modal ... */
        FormModalService.open({
            title:'Generate Certificate Signing Request',
            form:formdata,
            submit:submitted=>{
                /* The user never needs to see or think about the private key so rather than showing it in the dialog
                we will just submit some default value as the private key */
                if(!submitted.PASSWORD){
                    submitted.PASSWORD = DEFAULT_CSR.PASSWORD;
                }
                generateCSR(submitted);
            },
        });
    }
    function promptToInstallCRT(){
        let oldPrivateKey = ""; // if no private key exists we will show this empty string
        SSLService.getPrivateKey().then(privateKey=>{       
            oldPrivateKey = privateKey; // show the old private key if it existed
        }).finally(()=>{ // do this regardless of whether the private key existed or not
            const formdata = Form();
            let field = formdata.get(0);
            field.label="Certificate Authority (CA) Signed Certificate";
            field.modelName = "crt";
            field.type="textarea";
            field.cols="70";
            field.rows="6";
            field.spellcheck=false;
            field = formdata.get(1);
            field.label="Private Key";
            field.modelName = "privateKey";
            field.type="textarea";
            field.cols="70";
            field.rows="6";
            field.spellcheck = false;
            field.initialValue = oldPrivateKey;

            FormModalService.open({
                title:'Install Certificate Authority (CA) Certificate',
                form:formdata,
                submit:submitted=>{
                    let crt = submitted.crt;
                    let newPrivateKey = submitted.privateKey;
                    if(newPrivateKey !== oldPrivateKey){
                        console.log("installing new private key");
                        track(SSLService.installPrivateKey(newPrivateKey).then(()=>{
                            return SSLService.installCRT(crt);
                        }))
                    }
                    else{
                        track(SSLService.installCRT(crt));
                    }
                },
            });
        });
    }

    function updateCSR(){
        return SSLService.getCSR().then(csr=>{
            $scope.csr = csr;
        });
    }
    function updatePrivateKey(){
        return SSLService.getPrivateKey().then(key=>{
            $scope.privateKey = key;
        })
    }
    function updateCRT(){
        return SSLService.getCRT().then(crt=>{
            $scope.crt = crt;
        })
    }




    
    function getDefaultCSR(){
        let dnsBase = SystemSettingsService.get().SIP_DOMAIN_NAME;
        let dns = ["www."+dnsBase,dnsBase].join(", ");
        return {
            "PASSWORD":"intracom",
            "DOMAIN_NAME_SERVERS":dns,
            "ORGANIZATION":"Intracom Systems, LLC",
            "COUNTRY":"US",
            "STATE_REGION":"California"
        }
    }
    const DEFAULT_CSR = getDefaultCSR();
    $scope.generateDefaultCSR = () => {
        const formdata = Form();
        let field = formdata.get(0);
        field.label="Domain Name";
        field.modelName = "dn";
        field.type="text";
        field.initialValue = getDefaultCSR().DOMAIN_NAME_SERVERS;
        field.spellcheck = false;
        FormModalService.open({
            title:'Generate CSR',
            form:formdata,
            submit:submitted=>{
                let csr = getDefaultCSR();
                csr.DOMAIN_NAME_SERVERS = submitted.dn;
                generateCSR(csr);
            },
        });
    }
    $scope.generateCustomCSR = () => {
       promptToGenerateCSR(getDefaultCSR());
    }
    $scope.download = () => {
        track(SSLService.getCRT().then(crt=>{
            DownloadService.download({
                filename:"server.crt",
                text:crt
            })
        }))
    }
    function displayCSR(){
        return updateCSR().then(()=>{
            const formdata = Form();
            let field = formdata.get(0);
            field.label="CSR";
            field.modelName = "csr";
            field.type="textarea";
            field.cols="70";
            field.rows="6";
            field.spellcheck=false;
            field.initialValue = $scope.csr;
            FormModalService.open({
                title:'Certificate Signing Request',
                hasSubmit:false,
                form:formdata,
                submit:submitted=>{
                },
            });
        })
    }
    $scope.displayPrivates = () => {
        track(updateCSR().then(updatePrivateKey).then(updateCRT).then(()=>{
            const formdata = Form();
            let field = formdata.get(0);
            field.label="Certificate Signing Request";
            field.modelName = "csr";
            field.type="textarea";
            field.cols="70";
            field.rows="6";
            field.spellcheck=false;
            field.initialValue = $scope.csr;
            field = formdata.get(1);
            field.label="Private Key";
            field.modelName = "privateKey";
            field.type="textarea";
            field.cols="70";
            field.rows="6";
            field.spellcheck = false;
            field.initialValue = $scope.privateKey;
            field = formdata.get(2);
            field.label="Certificate";
            field.modelName = "crt";
            field.type="textarea";
            field.cols="70";
            field.rows="6";
            field.spellcheck=false;
            field.initialValue=$scope.crt;
            FormModalService.open({
                title:'Current Certificate',
                hasSubmit:false,
                form:formdata,
                submit:submitted=>{
                },
            });
        }))
    }

    $scope.promptInstallCACertificate = promptToInstallCRT;
    $scope.installSelfSignedCertificate = promptToGenerateCRT;

    $scope.close = $uibModalInstance.close;
    $scope.showOldDialog = 'OFF';
	
});
/* global app Util angular */
app.controller('SystemSettingsController',
    function($scope, $sce,BrandingService,
        ProgressBarService, AuthenticationService,
        SystemSettingsService,FailoverService) {

    const init = () => {
        exposeUserInfo();
        loadControllerData();
    }
    const exposeUserInfo = () => {
        let userInfo = AuthenticationService.getUserInfo();
        $scope.userUnauthorizedToChangeSettings = !userInfo.auths.allowSystemSettingsChanges;
        $scope.showPassword =       AuthenticationService.allowsPasswordDisplay();
        $scope.supportsFailover =   AuthenticationService.supportsFailover();
        $scope.hasTrunking =        AuthenticationService.hasTrunking();
        $scope.isTIF =              AuthenticationService.isTIF();
        
    }
    
    $scope.systemSettings = {};
    $scope.selectedSampleRate = {};
    $scope.VOICE_ACTIVITY_INDICATION = {
        'TEXT_COLOR' : '',
        'BACKGROUND_COLOR' : ''
    };
    $scope.disableDomainAuthentication = 'OFF';
    $scope.useOnly4CharAlphas = 'OFF';
    
    $scope.selectedAutoFailback = undefined;
    
    /*
     * Valid IP Addresses retrieved from API
     * Used for: 
     *  'Primary Server Network Settings'
     *  'Secondary Server Network Settings'
     *  'Telephone Interface Network Settings'
     *  'Trunking Network Settings'
     */
    $scope.validIpAddresses = [];
    
    $scope.minicolorsCustomSettings = {
        control: 'brightness',
        theme: 'bootstrap',
        position: 'top left'
    };
    
    $scope.$watch('disableDomainAuthentication', function(newValue, oldValue) {
        if(newValue != oldValue) {
            if(newValue === 'ON' ) {
                $scope.systemSettings.SIP_DOMAIN_AUTHENTICATION = 'OFF';
            } else {
                $scope.systemSettings.SIP_DOMAIN_AUTHENTICATION = 'ON';
            }
        }
    });
    
    $scope.$watch('useOnly4CharAlphas', function(newValue, oldValue) {
        if(newValue != oldValue) {
            if(newValue === 'ON' ) {
                $scope.systemSettings.IGNORE_8_CHARACTER_UNICODE_ALPHAS = 'ON';
            } else {
                $scope.systemSettings.IGNORE_8_CHARACTER_UNICODE_ALPHAS = 'OFF';
            }
        }
    });
    
    $scope.$watch('selectedSampleRate', function(newValue, oldValue) {
        // When the sample rate is changed on screen, update the systemSettings object
        $scope.systemSettings.AUDIO_MIX_SAMPLE_RATE_IN_HZ = $scope.selectedSampleRate.val;
    });
    
    $scope.$watchCollection('VOICE_ACTIVITY_INDICATION', function(newValue, oldValue) {
        // When the voice activity object changes, update the systemSettings object
        $scope.systemSettings.VOICE_ACTIVITY_INDICATION_TEXT_COLOR = '0x00' + newValue.TEXT_COLOR.replace(/#/gi, '');
        $scope.systemSettings.VOICE_ACTIVITY_INDICATION_BACKGROUND_COLOR = '0x00' + newValue.BACKGROUND_COLOR.replace(/#/gi, '');
    });

    $scope.$watch('selectedAutoFailback', function(newValue, oldValue) {
        if(newValue != undefined && (newValue != oldValue)) {
            $scope.systemSettings.FAILOVER_AUTOMATIC_FAILBACK_TYPE = $scope.selectedAutoFailback.value;
        };
    });
    
    $scope.$watch('systemSettings.IP_PORT_FOR_PRIMARY_SERVER_DATA', function(newValue, oldValue) {
        //console.log('Port value (new): ' + $scope.systemSettings.IP_PORT_FOR_PRIMARY_SERVER_DATA);
    });
    
    function loadControllerData() {
        // Call SystemSettings service to get the IP list first
        SystemSettingsService.getList('NETWORK_INTERFACE_IP_ADDRESS')
        .then(function(result) {
            $scope.validIpAddresses = result.data.NETWORK_INTERFACE_IP_ADDRESS;
        });

        $scope.systemSettings = SystemSettingsService.get(); // use already gotten system settings
        // Set the domain authentication
        if($scope.systemSettings.SIP_DOMAIN_AUTHENTICATION != undefined && $scope.systemSettings.SIP_DOMAIN_AUTHENTICATION == 'ON') {
            $scope.disableDomainAuthentication = 'OFF';
        } else {
            $scope.disableDomainAuthentication = 'ON';
        }

        // Set the useOnly4CharAlphas variable
        if($scope.systemSettings.IGNORE_8_CHARACTER_UNICODE_ALPHAS != undefined && $scope.systemSettings.IGNORE_8_CHARACTER_UNICODE_ALPHAS == 'ON') {
            $scope.useOnly4CharAlphas = 'ON';
        } else {
            $scope.useOnly4CharAlphas = 'OFF';
        }

        /* Only show media server settings if the SUPPORTS_VCP4WEBRTC_VIDEO flag is enabled */
        $scope.showMediaServerSettings = AuthenticationService.getUserInfo('systemSupport','supportsMediaServerSettings')

        // Set the selected sample rate
        setSelectedSampleRate($scope.systemSettings.AUDIO_MIX_SAMPLE_RATE_IN_HZ);

        // Set the selected voice activity indication colors
        $scope.VOICE_ACTIVITY_INDICATION.TEXT_COLOR = '#' + $scope.systemSettings.VOICE_ACTIVITY_INDICATION_TEXT_COLOR.replace(/0x00/gi, '');
        $scope.VOICE_ACTIVITY_INDICATION.BACKGROUND_COLOR = '#' + $scope.systemSettings.VOICE_ACTIVITY_INDICATION_BACKGROUND_COLOR.replace(/0x00/gi, '');

        /*
            * Per John, AUDIO_OUTPUT_LEVEL_GAIN_STEP should return values of 0, 1, 2, 3
            * with a floor of 0 and ceiling of 16 (set in the html)
            * Here we'll multiple the value by 6 before displaying on screen
            */
        if($scope.systemSettings.AUDIO_OUTPUT_LEVEL_GAIN_STEP > 0)
            $scope.systemSettings.AUDIO_OUTPUT_LEVEL_GAIN_STEP = $scope.systemSettings.AUDIO_OUTPUT_LEVEL_GAIN_STEP * 6;

        $scope.selectedAutoFailback = $scope.getFailbackOption();
    }
    
    /*$scope.failbackOptions = [
        'Enabled',
        'Disabled'
    ];*/
    $scope.failbackOptions = Util.autoFailBackOptions();
    $scope.getFailbackOption = function() {
        var option = undefined;
        angular.forEach($scope.failbackOptions, function(value, key) {
            if(value.value == $scope.systemSettings.FAILOVER_AUTOMATIC_FAILBACK_TYPE) {
                option = value;
            }
        });
        
        return option;
    };
    
    $scope.audioMixSampleRateOptions = [
        { 
            'label': 'Narrowband( 8 KHz )',
            'val' : 8000
        },
        {
            'label' : 'Wideband ( 16 KHz )',
            'val' : 16000
        },
        {
            'label' : 'Ultra Wideband( 32 KHz )',
            'val' : 32000
        },
        {
            'label' : 'Full Band (48 KHz)',
            'val' : 48000
        }
    ];
    
    /*
     * Set the selected Sample Rate object
     */
    function setSelectedSampleRate(sampleRate) {
        angular.forEach($scope.audioMixSampleRateOptions, function(value, key) {
            if(value.val == sampleRate) {
                $scope.selectedSampleRate = value;
            }
        });
    }
    
    /*
     * Save settings to server with PUT
     */
    $scope.save = function() {
        //delete $scope.systemSettings.IP_ADDRESS_FOR_TELEX_TRUNK_MASTER;
        /*
         * Per John, AUDIO_OUTPUT_LEVEL_GAIN_STEP should return values of 0, 1, 2, 3
         * with a floor of 0 and ceiling of 16 (set in the html)
         * Here we'll divide the value by 6 before sending to server
         */
        if($scope.systemSettings.AUDIO_OUTPUT_LEVEL_GAIN_STEP > 0)
            $scope.systemSettings.AUDIO_OUTPUT_LEVEL_GAIN_STEP = $scope.systemSettings.AUDIO_OUTPUT_LEVEL_GAIN_STEP / 6;
        
        /* failover activation delay was not being parsed by the server when it was a string */
        $scope.systemSettings.FAILOVER_ACTIVATION_DELAY = parseInt($scope.systemSettings.FAILOVER_ACTIVATION_DELAY);
        
        let promise = SystemSettingsService.pushAndPull($scope.systemSettings)
        ProgressBarService.track(promise,{showSuccess:true});

        promise.then(loadControllerData);
    };

    $scope.isFailedOver = () => {
        return FailoverService.secondaryIsActive();
    }

    $scope.productName = BrandingService.getProductName();
    
    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
    };
    
    init();
});
/* global app */
app.controller('SystemStatusController',
function($scope, SystemStatusService, AuthenticationService) {

    $scope.systemStatus = [];

    const init = () => {
        /* Get some info from userInfo */
        $scope.isTIF = AuthenticationService.isTIF();
        $scope.hasTrunking = AuthenticationService.hasTrunking();
        $scope.supportsFailover = AuthenticationService.supportsFailover();
        SystemStatusService.obs.pullSuccess.on(systemStatus=>{
            $scope.systemStatus = systemStatus;
            $scope.TIF = $scope.systemStatus.TELEPHONE_INTERFACE_STATUS;
        })
    }
    init();
    
});
var UIColorSchemes = {
    getDefaultColorScheme: function() {
        return {
            'name': 'Default (Blue Scheme)',
            'UI_TOP_BORDER_BACKGROUND_COLOR': '#400000',
            'UI_BOTTOM_BORDER_BACKGROUND_COLOR': '#400000',
            'UI_SELECTOR_WINDOW_BACKGROUND_COLOR': '#000000',
            'UI_SELECTOR_NORMAL_TEXT_FOREGROUND_COLOR': '#000000',
            'UI_SELECTOR_NORMAL_TEXT_BACKGROUND_COLOR': '#000000',
            'UI_SELECTOR_ILLUMINATED_TEXT_FOREGROUND_COLOR': '#000000',
            'UI_SELECTOR_ILLUMINATED_TEXT_BACKGROUND_COLOR': '#FFFFFF',
            'UI_SELECTOR_DISABLED_TEXT_FOREGROUND_COLOR': '#AAAAAA',
            'UI_SELECTOR_DISABLED_TEXT_BACKGROUND_COLOR': '#000000',
            'UI_SELECTOR_VERTICAL_SPACING': 4,
            'UI_SELECTOR_HORTIZONTAL_SPACING': 4
        };
    },
    getColorSchemesList: function() {
        return [
            {
                'name': 'Gray Scheme',
                'UI_TOP_BORDER_BACKGROUND_COLOR': '#3c3c3c',
                'UI_BOTTOM_BORDER_BACKGROUND_COLOR': '#3c3c3c',
                'UI_SELECTOR_WINDOW_BACKGROUND_COLOR': '#f8f8f8',
                'UI_SELECTOR_NORMAL_TEXT_FOREGROUND_COLOR': '#000000',
                'UI_SELECTOR_NORMAL_TEXT_BACKGROUND_COLOR': '#d6d6d6',
                'UI_SELECTOR_ILLUMINATED_TEXT_FOREGROUND_COLOR': '#000000',
                'UI_SELECTOR_ILLUMINATED_TEXT_BACKGROUND_COLOR': '#ffffff',
                'UI_SELECTOR_DISABLED_TEXT_FOREGROUND_COLOR': '#aaaaaa',
                'UI_SELECTOR_DISABLED_TEXT_BACKGROUND_COLOR': '#ebebeb',
                'UI_SELECTOR_VERTICAL_SPACING': 10,
                'UI_SELECTOR_HORTIZONTAL_SPACING': 12
                
            },
            {
                'name': 'Dark Blue Scheme',
                'UI_TOP_BORDER_BACKGROUND_COLOR': '#2b1500',
                'UI_BOTTOM_BORDER_BACKGROUND_COLOR': '#000000',
                'UI_SELECTOR_WINDOW_BACKGROUND_COLOR': '#2b1500',
                'UI_SELECTOR_NORMAL_TEXT_FOREGROUND_COLOR': '#00ffff',
                'UI_SELECTOR_NORMAL_TEXT_BACKGROUND_COLOR': '#2b1500',
                'UI_SELECTOR_ILLUMINATED_TEXT_FOREGROUND_COLOR': '#000000',
                'UI_SELECTOR_ILLUMINATED_TEXT_BACKGROUND_COLOR': '#ffffff',
                'UI_SELECTOR_DISABLED_TEXT_FOREGROUND_COLOR': '#aaaaaa',
                'UI_SELECTOR_DISABLED_TEXT_BACKGROUND_COLOR': '#000000',
                'UI_SELECTOR_VERTICAL_SPACING': 4,
                'UI_SELECTOR_HORTIZONTAL_SPACING': 4
            }
        ];
    }
}
/* global app Util UIColorSchemes */
app.controller('UserInterfaceSettingsController',
function($scope, $uibModalInstance, UserInterfaceSettingsService, ProgressBarService,LogoService) {
    
    $scope.userInterfaceSettings = {};
    $scope.colorSchemes = UIColorSchemes.getColorSchemesList();
    const defaultColorScheme = UIColorSchemes.getDefaultColorScheme();
    
    $scope.minicolorsCustomSettings = {
        control: 'brightness',
        theme: 'bootstrap',
        position: 'top left'
    };
    
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

    const init = () => {
        loadSettings()
    }

    let loadSettings = () => {
        let promise = UserInterfaceSettingsService.get();
        promise.then(settings=>{
            colorProperties.forEach(prop=>{
                settings[prop] = convertColorFromServer(settings[prop]);
            })
            $scope.userInterfaceSettings = settings;
        });
        ProgressBarService.track(promise);
        return promise;
    }
    
    $scope.$watch('selectedColorScheme', function(newValue) {
        if(newValue == undefined) {
            applyColorScheme(defaultColorScheme);
        }
        else{
            applyColorScheme(newValue);
        }
    });

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
    /* convert from #BBGGRR to #RRGGBB */
    const convertColorFromPresets = color => {
        let b = color.substring(1,3);
        let g = color.substring(3,5);
        let r = color.substring(5,7);
        return ["#",r,g,b].join(""); // join with no delimiter
    }
    
    /*
     * Apply pre-configured color scheme when selected from dropdown
     */
    function applyColorScheme(colorScheme) {
        colorProperties.forEach(prop=>{
            $scope.userInterfaceSettings[prop] = convertColorFromPresets(colorScheme[prop]);
        })
        $scope.userInterfaceSettings.UI_SELECTOR_VERTICAL_SPACING = colorScheme.UI_SELECTOR_VERTICAL_SPACING;
        $scope.userInterfaceSettings.UI_SELECTOR_HORTIZONTAL_SPACING = colorScheme.UI_SELECTOR_HORTIZONTAL_SPACING;
    }

    $scope.uploadLogoImage = LogoService.put
    $scope.onSuccessUploadLogoImage = filename => {
        console.log("saved file",filename);
    }

    $scope.getLogoSrc = LogoService.getSrc;
    $scope.onFailureUploadLogoImage = () => {

    }
    $scope.restoreDefaultLogo = () => {
        LogoService.restoreDefault();
    }
    
    /*
     * Save User Interface Settings
     */
    $scope.save = function() {

        let copy = Object.assign({},$scope.userInterfaceSettings);
        /* Convert colors to the format that our server wants (AABBGGRR) */
        Object.keys(copy).forEach(key=>{
            let val = copy[key];
            if(Util.startsWithPound(val)){ // This means that it is in our internal format (#RRGGBB) rather than server format
                copy[key] = convertColorToServer(val); 
            }
        })
        let promise = UserInterfaceSettingsService.put(copy);
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then($uibModalInstance.close());
    };
    
    $scope.cancel = $uibModalInstance.dismiss;

    init();
});
/* global app Util $ */
app.controller('VirtualRealityConfigurationController',
function($scope, VirtualRealityConfigurationService,ProgressBarService) {

    /* 
    This controller allows the user to load, modify, then save a configuration for virtual reality.
    The configuration looks something like this...
    {
        "videoFeedSky": "test", 
        "videoFeeds": [
             {
                "uid": "Yankee",
                "name": "Yankee Sports Network",
                "url": "https://youtu.be/2iJSEV7WAUc"
            },
            .
            .
            .
        ],
        "clocks": [
             {
                "uid": "8763c61c-a32a-41a3-885c-0400ad4775de",
                "name": "London",
                "offset": "0"
            },
            .
            .
            .
        ]
    }

    The function in this file...
     - Load or save the configuration
     - Delete existing or create new video feeds
     - Delete existing or create new clocks
     - Change the existing default video feed

    */

    const init = () => {
        loadConfig();
    }

    /* Load and save Config */
    let loadConfig = () => {
        let promise = VirtualRealityConfigurationService.getConfig();
        promise.then(result=>{
            $scope.config = result.data;
            // If there are no feeds or clocks, make empty arrays for them
            if(!$scope.config){
                $scope.config = {};
            }
            if(!$scope.config.clocks){
                $scope.config.clocks = [];
            }
            if(!$scope.config.videoFeeds){
                $scope.config.videoFeeds = [];
            }
        })
        ProgressBarService.track(promise);
    }

    $scope.saveConfig = () => {
        let promise = VirtualRealityConfigurationService.putConfig($scope.config);
        promise.then(() =>{
            $scope.unsavedChanges = false;
            loadConfig();
        })
        ProgressBarService.track(promise,{showSuccess:true});
    }

    /* Feeds */
    $scope.removeFeed = feed => {
        const uidToRemove = feed.uid;
        $scope.config.videoFeeds = $scope.config.videoFeeds.filter(feed=>feed.uid != uidToRemove);
        $scope.unsavedChanges = true;
        if(uidToRemove == $scope.config.videoFeedSky && $scope.config.videoFeeds.length > 0){
            setDefault($scope.config.videoFeeds[0]);
        }
    }
    $scope.beginCreatingFeed = () => {
        $scope.newFeed = {};
        $scope.creatingFeed = true;
        setTimeout(()=>{ // setTimeout allows other events like showing the element to happen first
            $("#newFeedForm input[name=name]").focus();
        })
    }
    $scope.createFeed = feed => {
        const uuid = Util.generateUUID();
        feed.uid = uuid;
        if($scope.config.videoFeeds.length < 1){
            setDefault(feed);
        }
        $scope.config.videoFeeds.push(feed);
        $scope.creatingFeed = false;
        $scope.unsavedChanges = true;
    }

    /* Clocks */
    $scope.removeClock = clock => {
        const uidToRemove = clock.uid;
        $scope.config.clocks = $scope.config.clocks.filter(clock=>clock.uid != uidToRemove);
        $scope.unsavedChanges = true;
    }

    $scope.beginCreatingClock = () => {
        $scope.newClock = {};
        $scope.creatingClock = true;
        setTimeout(()=>{ // setTimeout allows other events like showing the element to happen first
            $("#newClockForm input[name=name]").focus();
        })

    }
    $scope.createClock = clock => {
        const uuid = Util.generateUUID();
        clock.uid = uuid;
        $scope.config.clocks.push(clock);
        $scope.creatingClock = false;
        $scope.unsavedChanges = true;
    }

    /* Default Background Video */
    const setDefault = feed => {
        if($scope.config.videoFeedSky != feed.uid){
            $scope.unsavedChanges = true;
        }
        $scope.config.videoFeedSky = feed.uid;
    }
    $scope.setDefault = setDefault;


    init();
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
/* global app angular */
app.controller('ClientAudioSettingsController', 
function($scope, $window, $uibModalInstance, $sce,
    ClientConfigurationService, LabelsService, AuthenticationService,
    DebugService, ProgressBarService, clientid) {
    
    let userInfo = AuthenticationService.getUserInfo();
    $scope.supportsAudioEncryption = userInfo.systemSupport.supportsAudioEncryption;
    $scope.debug = DebugService.isEnabled();

    $scope.client = {};
    $scope.codecOptions = [];
    $scope.audioEncryptionOptions = [];
    
    /*
     * 05/30/2017 KSG
     * Per documentation, hide Audio Encode Quality and Audio Encode Complexity
     * for any selection other than the SPEEX codecs
     */
    $scope.hideAudioEncodeQuality = true;
    $scope.hideAudioEncodeComplexity = true;
    
    /*
     * 05/30/2017 KSG
     * Per documentation, hide Audio Encode Quality and Audio Encode Complexity
     * for any selection other than the SPEEX codecs
     */
    $scope.$watch('client.AUDIO_CODEC', function() {
        if($scope.client != undefined && $scope.client.AUDIO_CODEC != undefined && $scope.client.AUDIO_CODEC.label != undefined) {
            if($scope.client.AUDIO_CODEC.label.match(/speex/i)) {
                $scope.hideAudioEncodeQuality = false;
                $scope.hideAudioEncodeComplexity = false;
            } else {
                $scope.hideAudioEncodeQuality = true;
                $scope.hideAudioEncodeComplexity = true;
            }
        }
    });
    
    $scope.$watch('[isCodecOptionsLoaded, isAudioEncryptionMethodsLoaded]', function(newValue, oldValue) {
        if($scope.isCodecOptionsLoaded === true && $scope.isAudioEncryptionMethodsLoaded === true) {
            $scope.getClient();
        }
    });
    
    
    loadControllerData();
    
    function loadControllerData() {
        // Get Audio Codec list
        LabelsService.getLabel(clientid, 'AUDIO_CODEC')
        .then(function(result) {
            var typeObj = result.data.AUDIO_CODEC;
            var keys = Object.keys(typeObj);
            
            angular.forEach(keys, function(keyValue, idx) {
                var type = {
                    label: typeObj[keyValue],
                    value: keyValue
                };
                $scope.codecOptions.push(type);
            });
            
            $scope.isCodecOptionsLoaded = true;
        });
        
        /*
         * 05/30/2017 KSG
         * Per documentation, get AUDIO_ENCRYPTION_METHOD list
         */
        LabelsService.getLabel(clientid, 'AUDIO_ENCRYPTION_METHOD')
        .then(function(result) {
            var typeObj = result.data.AUDIO_ENCRYPTION_METHOD;
            var keys = Object.keys(typeObj);
            
            angular.forEach(keys, function(keyValue, idx) {
                var type = {
                    label: typeObj[keyValue],
                    value: keyValue
                };
                $scope.audioEncryptionOptions.push(type);
            });
            
            $scope.isAudioEncryptionMethodsLoaded = true;
        });
        
    }
    
    /*
     * 05/30/2017 KSG
     * Moved out from loadControllerData() because we need to load other items first
     */
    $scope.getClient = function() {
        let promise = ClientConfigurationService.getClient(clientid)
        .then(function(result) {
            $scope.client = result.data[0];
            
            // Set the codec option
            $scope.client.AUDIO_CODEC = getCodecObject($scope.client.AUDIO_CODEC + '');
            
            // Set Encoder Sample Rate object
            $scope.client.AUDIO_ENCODE_SAMPLE_RATE_IN_HZ = getEncoderSampleRateObject($scope.client.AUDIO_ENCODE_SAMPLE_RATE_IN_HZ + '');
            
            // Set the Audio Encryption Method
            $scope.client.AUDIO_ENCRYPTION_METHOD = getAudioEncryptionObject($scope.client.AUDIO_ENCRYPTION_METHOD + '');

            $scope.client.AUDIO_INPUT_LEVEL_GAIN_DB = $scope.client.AUDIO_INPUT_LEVEL_GAIN_STEP*6;
            $scope.client.AUDIO_OUTPUT_LEVEL_GAIN_DB= $scope.client.AUDIO_OUTPUT_LEVEL_GAIN_STEP*6;
        });

        ProgressBarService.track(promise);
    }
    
    /*
     * Get Audio Codec object
     */
    function getCodecObject(val) {
        var obj;
        
        angular.forEach($scope.codecOptions, function(item, key) {
            //if(item.value.toUpperCase() == val.toUpperCase()) {
            if(item.value == val) {
                obj = item;
            }
        });
        
        return obj;
    }
    
    /*
     * Get Encoder Sample Rate Object
     */
    function getEncoderSampleRateObject(val) {
        var obj;
        
        angular.forEach($scope.encoderSampleRateOptions, function(item, key) {
            //if(item.value.toUpperCase() == val.toUpperCase()) {
            if(item.value == val) {
                obj = item;
            }
        });
        
        return obj;
    }
    
    
    /*
     * Define Codec Options
     */
//    $scope.codecOptions = [
//        /*{
//            'label': 'High Compression Codec/Low Bitrate (Default)',
//            'value': 1
//        },
//        {
//            'label': 'No Compression/Very High Bitrate',
//            'value': 2
//        }*/
//        {
//            'label' : 'PCM (Pulse Code Modulation)',
//            value: 0
//        },
//        {
//            'label' : 'Speex (Code Excited Linear Prediction)',
//            value: 1
//        },
//        {
//            'label' : 'G.722 (Adaptive Differential PCM)',
//            value: 2
//        },
//        {
//            'label' : 'iLBC (Internet Low Bit Rate)',
//            value: 3
//        },
//        {
//            'label' : 'G.711 u-Law (Logarithmic PCM)',
//            value: 4
//        },
//        {
//            'label' : 'G.711 A-Law (Logarithmic PCM)',
//            value: 5
//        },
//        {
//            'label' : 'GSM (Global System for Mobile)',
//            value: 6
//        },
//        {
//            'label' : 'Speex #2 (Code Excited Linear Prediction)',
//            value: 7
//        },
//        {
//            'label' : 'G.722.1 (Adaptive Differential PCM)',
//            value: 8
//        },
//        {
//            'label' : 'PCM (Pulse Code Modulation)',
//            value: 9
//        },
//        {
//            'label' : 'OPUS (Constrained Energy Lapped Transform) @ 20ms',
//            value: 10
//        },
//        {
//            'label' : 'OPUS (Constrained Energy Lapped Transform) @ 5ms',
//            value: 11
//        },
//    ];
    
    /*
     * Define Encoder Sample Rate Options
     */
    $scope.encoderSampleRateOptions = [
        {
            'label': 'Narrowband (8 KHz)',
            'value': 8000
        },
        {
            'label': 'Wideband (16 KHz)',
            'value': 16000
        },
        {
            'label': 'Ultra Wideband (32 KHz)',
            'value': 32000
        }
    ];
    
    /*
     * Get Audio Capture Buffer Size Label
     */
    $scope.getAudioCaptureBufferSizeLabel = function() {
        var label = $scope.AUDIO_CAPTURE_BUFFER_SIZE_IN_MS + ' ms';
        
        return label;
    };
    
    /*
     * Get Audio Encoding Quality Label
     */
    $scope.getAudioEncodeQualityLabel = function() {
        var label;
        
        angular.forEach($scope.audioEncodeQualityOptions, function(item, key) {
            if(item.value == $scope.client.AUDIO_ENCODING_QUALITY) {
                label = item.label;
            }
        });
        
        return label;
    };
    
    /*
     * Audio Encode Quality Options
     */
    $scope.audioEncodeQualityOptions = [
        {
            'label': '-8',
            'value': -8
        },
        {
            'label': '-7',
            'value': -7
        },
        {
            'label': '-6',
            'value': -6
        },
        {
            'label': '-5',
            'value': -5
        },
        {
            'label': '-4',
            'value': -4
        },
        {
            'label': '-3',
            'value': -3
        },
        {
            'label': '-2',
            'value': -2
        },
        {
            'label': '-1',
            'value': -1
        },
        {
            'label': 'Standard',
            'value': 0
        },
        {
            'label': '+1',
            'value': 1
        },
        {
            'label': '+2',
            'value': 2
        }
    ];
    
    /*
     * Get Audio Encoding Complexity Label
     */
    $scope.getAudioEncodeComplexityLabel = function() {
        var label;
        
        angular.forEach($scope.audioEncodeComplexityOptions, function(item, key) {
            if(item.value == $scope.client.AUDIO_ENCODING_COMPLEXITY) {
                label = item.label;
            }
        });
        
        return label;
    };
    
    /*
     * Audio Encode Complexity Options
     */
    $scope.audioEncodeComplexityOptions = [
        {
            'label': '8+',
            'value': 8
        },
        {
            'label': '7+',
            'value': 7
        },
        {
            'label': '6+',
            'value': 6
        },
        {
            'label': '5+',
            'value': 5
        },
        {
            'label': '4+',
            'value': 4
        },
        {
            'label': '3+',
            'value': 3
        },
        {
            'label': '2+',
            'value': 2
        },
        {
            'label': '1+',
            'value': 1
        },
        {
            'label': 'Standard',
            'value': 0
        },
        {
            'label': '-1',
            'value': -1
        }
    ];
    
    /*
     * Get Jitter Buffer Size Label
     */
    $scope.getJitterBufferSizeLabel = function() {
        var label;
        
        angular.forEach($scope.jitterBufferSizeOptions, function(item, key) {
            if(item.value == $scope.client.AUDIO_JITTER_BUFFER_SIZE_IN_MS) {
                label = item.label;
            }
        });
        
        return label;
    }
    
    /*
     * Jitter Buffer Size Options
     */
    $scope.jitterBufferSizeOptions = [
        {
            'label': 'Automatic',
            'value': 0
        },
        {
            'label': '20 ms',
            'value': 20
        },
        {
            'label': '40 ms',
            'value': 40
        },
        {
            'label': '60 ms',
            'value': 60
        },
        {
            'label': '80 ms',
            'value': 80
        },
        {
            'label': '100 ms',
            'value': 100
        },
        {
            'label': '120 ms',
            'value': 120
        },
        {
            'label': '140 ms',
            'value': 140
        },
        {
            'label': '160 ms',
            'value': 160
        },
        {
            'label': '180 ms',
            'value': 180
        },
        {
            'label': '200 ms',
            'value': 200
        }
    ];
    
    /*
     * Get Silence Suppression Time Label
     */
    $scope.getSilenceSuppressionTimeLabel = function() {
        var label;
        
        angular.forEach($scope.silenceSuppressionTimeOptions, function(item, key) {
            if(item.value == $scope.client.SILENCE_SUPPRESSION_TIME_IN_MS) {
                label = item.label;
            }
        });
        
        return label;
    };
    
    /*
     * Silence Suppression Time Options
     */
    $scope.silenceSuppressionTimeOptions = [
        {
            'label': 'Off',
            'value': 0
        },
        {
            'label': '100 ms',
            'value': 100
        },
        {
            'label': '200 ms',
            'value': 200
        },
        {
            'label': '300 ms',
            'value': 300
        },
        {
            'label': '400 ms',
            'value': 400
        },
        {
            'label': '500 ms',
            'value': 500
        },
        {
            'label': '600 ms',
            'value': 600
        },
        {
            'label': '700 ms',
            'value': 700
        },
        {
            'label': '800 ms',
            'value': 800
        },
        {
            'label': '900 ms',
            'value': 900
        },
        {
            'label': '1000 ms',
            'value': 1000
        }
    ];
    
    /*
     * Packet Resequencer Depth Label
     */
    $scope.getPacketResequencerDepthLabel = function() {
        var label;
        
        angular.forEach($scope.packetResequencerDepthOptions, function(item, key) {
            if(item.value == $scope.client.AUDIO_PACKET_RESEQUENCER_DEPTH) {
                label = item.label;
            }
        });
        
        return label;
    };
    
    /*
     * Packet Resequencer Depth Options
     */
    $scope.packetResequencerDepthOptions = [
        {
            'label': '1 packet',
            'value': 1
        },
        {
            'label': '2 packets',
            'value': 2
        },
        {
            'label': '3 packets',
            'value': 3
        },
        {
            'label': '4 packets',
            'value': 4
        },
        {
            'label': '5 packets',
            'value': 5
        },
        {
            'label': '6 packets',
            'value': 6
        },
        {
            'label': '7 packets',
            'value': 7
        },
        {
            'label': '8 packets',
            'value': 8
        },
        {
            'label': '9 packets',
            'value': 9
        },
        {
            'label': '10 packets',
            'value': 10
        }
    ];
    
    /*
     * Automatic Gain Control Level Label
     */
    $scope.getAutomaticGainControlLevelLabel = function() {
        var label;
        
        angular.forEach($scope.automaticGainControlLevelOptions, function(item, key) {
            if(item.value == $scope.client.AUDIO_AGC_THRESHOLD) {
                label = item.label;
            }
        });
        
        return label;
    };
    
    /*
     * Automatic Gain Control Level Options
     */
    $scope.automaticGainControlLevelOptions = [
        {
            'label': '-8',
            'value': -8
        },
        {
            'label': '-7',
            'value': -7
        },
        {
            'label': '-6',
            'value': -6
        },
        {
            'label': '-5',
            'value': -5
        },
        {
            'label': '-4',
            'value': -4
        },
        {
            'label': '-3',
            'value': -3
        },
        {
            'label': '-2',
            'value': -2
        },
        {
            'label': '-1',
            'value': -1
        },
        {
            'label': 'Standard',
            'value': 0
        },
        {
            'label': '+1',
            'value': 1
        },
        {
            'label': '+2',
            'value': 2
        },
        {
            'label': '+3',
            'value': 3
        },
        {
            'label': '+4',
            'value': 4
        },
        {
            'label': '+5',
            'value': 5
        },
        {
            'label': '+6',
            'value': 6
        },
        {
            'label': '+7',
            'value': 7
        },
        {
            'label': '+8',
            'value': 8
        },
        {
            'label': '+9',
            'value': 9
        },
        {
            'label': '+10',
            'value': 10
        },
        {
            'label': '+11',
            'value': 11
        },
        {
            'label': '+12',
            'value': 12
        },
        {
            'label': '+13',
            'value': 13
        },
        {
            'label': '+14',
            'value': 14
        },
        {
            'label': '+15',
            'value': 15
        },
        {
            'label': '+16',
            'value': 16
        },
        {
            'label': '+17',
            'value': 17
        },
        {
            'label': '+18',
            'value': 18
        },
        {
            'label': '+19',
            'value': 19
        },
        {
            'label': '+20',
            'value': 20
        },
        {
            'label': '+21',
            'value': 21
        },
        {
            'label': '+22',
            'value': 22
        },
        {
            'label': '+23',
            'value': 23
        }
    ];


    // const stepToDb = step => step*6; // step size is arbitrary in nature, but +6dB is roughly equivalent to a doubling in amplitude
    const dbToLabel = db => {
        let prefix = (db > 0)?"+":""; // explicitly show '+' sign for positive numbers
        return prefix + db + " db"; // add 'dB' on the end to show that the unit is dB
    }
    // const stepToLabel = step => dbToLabel(stepToDb(step));

    /*
     * Get Audio Input Level Gain Label
     */
    $scope.getAudioInputLevelGainLabel = function() {
        return dbToLabel($scope.client.AUDIO_INPUT_LEVEL_GAIN_DB)
    };
    
    /*
     * Get Audio Output Level Gain Label
     */
    $scope.getAudioOutputLevelGainLabel = function() {
        return dbToLabel($scope.client.AUDIO_OUTPUT_LEVEL_GAIN_DB)
    };
    
    // $scope.getInputLevelGainDb = () => $scope.client.AUDIO_INPUT_LEVEL_GAIN_STEP*6;
    // $scope.getOutputLevelGainDb = () => $scope.client.AUDIO_OUTPUT_LEVEL_GAIN_STEP*6;
    
    /*
     * Audio Level Gain Options
     */
    $scope.audioLevelGainOptions = [
        {
            'label': '-18 db',
            'value': -18
        },
        {
            'label': '-12 db',
            'value': -12
        },
        {
            'label': '-6 db',
            'value': -6
        },
        {
            'label': '0 db',
            'value': 0
        },
        {
            'label': '+6 db',
            'value': 6
        },
        {
            'label': '+12 db',
            'value': 12
        },
        {
            'label': '+18 db',
            'value': 18
        },
    ];
    
    $scope.getSpeakerDimReductionLabel = function() {
        var label;
        
        angular.forEach($scope.speakerDimReductionOptions, function(item, key) {
            if(item.value == $scope.client.SPEAKER_DIM_REDUCTION_STEP) {
                label = item.label;
            }
        });
        
        return label;
    };
    
    /*
     * Speaker Dim Reduction Options
     */
    $scope.speakerDimReductionOptions = [
        {
            'label': 'None',
            'value': 0
        },
        {
            'label': '-6 db',
            'value': -6
        },
        {
            'label': '-12 db',
            'value': -12
        },
        {
            'label': '-18 db',
            'value': -18
        },
        {
            'label': '-24 db',
            'value': -24
        },
        {
            'label': '-30 db',
            'value': -30
        },
        {
            'label': '-36 db',
            'value': -36
        },
        {
            'label': 'Mute',
            'value': -42
        }
    ];
    
    /*
     * Get Echo Cancellation Tail length Label
     */
    $scope.getEchoCancellationTailLengthLabel = function() {
        var label;
        
        angular.forEach($scope.echoCancellationTailLengthOptions, function(item, key) {
            if(item.value == $scope.client.AUDIO_ECHO_CANCELLATION_TAIL_LENGTH) {
                label = item.label;
            }
        });
        
        return label;
    };
    
    /*
     * Echo Cancellation Tail Length Options
     */
    $scope.echoCancellationTailLengthOptions = [
        {
            'label': '50 ms',
            'value': 50
        },
        {
            'label': '100 ms',
            'value': 100
        },
        {
            'label': '150 ms',
            'value': 150
        },
        {
            'label': '200 ms',
            'value': 200
        },
        {
            'label': '250 ms',
            'value': 250
        },
        {
            'label': '300 ms',
            'value': 300
        }
    ];
    
    /*
     * Get Audio Encryption object
     */
    function getAudioEncryptionObject(val) {
        var obj;
        
        angular.forEach($scope.audioEncryptionOptions, function(item, key) {
            if(item.value.toUpperCase() == val.toUpperCase()) {
                obj = item;
            }
        });
        
        return obj;
    }
    
    /*
     * Save Client Audio Settings
     */
    $scope.save = function() {        
        // Set the codec option
        $scope.client.AUDIO_CODEC = $scope.client.AUDIO_CODEC.value;

        // Get Encoder Sample Rate object
        $scope.client.AUDIO_ENCODE_SAMPLE_RATE_IN_HZ = $scope.client.AUDIO_ENCODE_SAMPLE_RATE_IN_HZ.value;

        // Set the Audio Encryption Method
        $scope.client.AUDIO_ENCRYPTION_METHOD = $scope.client.AUDIO_ENCRYPTION_METHOD.value;

        $scope.client.AUDIO_INPUT_LEVEL_GAIN_STEP = $scope.client.AUDIO_INPUT_LEVEL_GAIN_DB/6;
        $scope.client.AUDIO_OUTPUT_LEVEL_GAIN_STEP= $scope.client.AUDIO_OUTPUT_LEVEL_GAIN_DB/6;
        
        // Save client object using PUT
        let promise = ClientConfigurationService.putClient($scope.client)
            .then($uibModalInstance.close);
        ProgressBarService.track(promise,{showSuccess:true});
    };
    
    /*
     * Cancel, close the dialog
     */
    $scope.cancel = function() {
        $uibModalInstance.dismiss();  
    };
    
    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
	};
});
/* global $ app Grid Util CustomFilters*/

app.controller('ClientConfigurationListController', 
function($scope, $state,$uibModal, ClientConfigurationService, SelectorChooserService, EnabledService,
     AuthenticationService, SelectorDescriberService, LabelStorageService, SearchAndReplaceService,
     ModalConfirmer, $q, NotificationService, ProgressBarService) {

    $scope.selectorAssignments = editSelectorAssignments;
    $scope.audioSettings = editAudioSettings;
    $scope.clientOptions = editOptions;
    $scope.refresh = refresh;

    
    let grid = Grid($scope);
    const init = () => {
        let promise = LabelStorageService.refreshAllClients().then(clients=>{
            return setupGrid().then(()=>{
                grid.setRows(getRowsFromClients(clients));
            })
        })
        ProgressBarService.track(promise); // show a loading bar!

        /* Display clients that are disabled as grayed out */
        grid.addRowClassRule(row=>{
            return row.originalClient.LABEL_DISABLED=="ON";
        },"disabled");
    }

    /* this grid setup requires that we get clients first
    since we need to know the possible values for the type dropdown ahead of time.
    This means if we add a new row with a new type, then it won't appear in the dropdown.
    Not sure how to handle that case just yet. */
    const setupGrid = () => {
        let options = grid.getOptions();
        options.enableCellChangeFlash = true;
        options.enableMaintainSelection = true;
        options.rowHeight = 20;
        options.headerHeight = 65;
        options.enableAutoVerticalResize = true;
        options.rowSelection = 'multiple';
        options.deselectWithoutCtrl = true;
        options.autoScrollIntoFocus = true;
        options.hideEmptyColumns = true;
        options.columnDefs = [
            {headerName:"",                 width:65,   field:"baseType",   pinned:"left"},
            {headerName:"Type",             width:145,  field:"type",       pinned:"left"},
            {headerName:"Talk/Listen Name", width:160,  field:"name",       pinned:"left"},
            {headerName:"Listen Only Name", width:125,  field:"listenOnlyName"},
            {headerName:"Login Name",       width:120,  field:"loginName"},
            {headerName:"Login Password",   width:120,  field:"loginPassword"},
            {headerName:"Description",                  field:"description"},
            {headerName:"PL",               width:50,   field:"pl"},
            {headerName:"Latchable",        width:82,   field:"latchable"},
            {headerName:"Selector Assignments Template", width: 120, field:"assignmentsTemplate"},
            {headerName:"Audio Settings Template",       width: 120, field:"audioTemplate"},
            {headerName:"Options Template",              width: 120, field:"optionsTemplate"}
        ]

        return LabelStorageService.getAllClients().then(allClients=>{
            const set = Util.uniquePropertyValues(allClients,"LABEL_BASE_TYPE_NAME"); // using LABEL_BASE_TYPE_NAME for RTSP special case so it looks like 'VS' instead
            console.log("type dropdown set",set);
            grid.setFloatingFilter(options.columnDefs[0],CustomFilters.getSetFilter(set));
            grid.suppressAllFilterButtons();
            grid.suppressAllFilterMenus();
            if(AuthenticationService.hasTrunking()){
                // insert new rows before assignments template
                options.columnDefs.splice(options.columnDefs.findIndex(r=>r.field=="assignmentsTemplate"),0,...[
                    {headerName:"Ext Alpha (8U)", width:105, field:"alpha8U"},
                    {headerName:"Ext Alpha (4)",  width:105, field:"alpha4"},
                    {headerName:"Restrict",       width:85, field:"restrict"},
                    {headerName:"Port",           width:65, field:"port"}
                ]);
            }
            grid.attachToElement($("#clientConfigurationGrid")[0])
            $scope.search = () => grid.search($scope.searchText);
        })
    }

    const getSelectedClientProperty = (propName) => {
        let client = getSingleSelectedClient();
        return Util.getPropertySafe(client,propName); // return undefined if we don't have just 1 selected, or if the property doesn't exist
    }
    const getSingleSelectedClient = () => {
        if(grid.hasOneSelected()) return grid.getSelectedRows()[0];
        return undefined; // if 0 or 2+ clients are selected, we can't get a single selected client
    }

    const getRowsFromClients = clients => {
        let rows = clients.map(client=>{
            return {
                ID:                 client.ID,
                originalClient:     client, // In case there are more properties we want to access not covered by the other properties in this row
                baseType:           client.LABEL_BASE_TYPE_NAME, // using LABEL_BASE_TYPE_NAME for RTSP special case so it looks like 'VS' instead
                type:               client.LABEL_TYPE_SUFFIX,
                name:               client.LABEL_NAME,
                listenOnlyName:     client.SELECTOR_NAME_LISTEN_ONLY,
                loginName:          client.LOGIN_NAME,
                loginPassword:      client.LOGIN_PASSWORD_DISPLAY,
                description:        client.DESCRIPTION,
                pl:                 client.IS_PARTY_LINE?"Yes":"",
                latchable:          client.LATCHABLE?"Yes":"",
                assignmentsTemplate:client.SELECTOR_ASSIGNMENTS_TEMPLATE_NAME,
                audioTemplate:      client.AUDIO_SETTINGS_TEMPLATE_NAME,
                optionsTemplate:    client.OPTIONS_TEMPLATE_NAME,
                restrict:           client.RESTRICTION_DISPLAY,
                port:               client.PORT,
                disabled:           client.LABEL_DISABLED,
                alpha8U:            client.EXTERNAL_NAME_LONG,
                alpha4:             client.EXTERNAL_NAME_SHORT
            }
        })
        return rows;
    }
    
    /*
     * Edit Client
     */
    $scope.editClient = function() {
        var modalInstance = $uibModal.open({
            controller: 'EditClientController',
            templateUrl: 'views/editClient-dialog.html',
            backdrop: 'static',
            resolve: {
                clientid: ()=>getSelectedClientProperty("ID"),
                mode: ()=>'edit'
            }
        });
        modalInstance.result.then(()=>{
            /* These callbacks exist for all of the operations you perform on a client
            edit, delete, add, duplicate, options, ...
            and we don't really have to refresh the whole page after each one
            we should be able to just update the grid a little bit
            with calls to grid.updateRow, removeRow, addRow, ...
            one complication is that with adding and duplicating, we get a client back
            but it is missing an ID, as the POST call to add a client, you don't give it an ID
            it just generates one internally. In any case, it seems to foul up with add/duplicate
            so for now we are just going to refresh the whole thing any time anything changes */
            $scope.refresh();
        })
    };

    const hasTemplateOfType = (client,type) => {
        let templateID = templateOfType(client,type);
        return (templateID != undefined && templateID != client.ID)
    }
    const templateOfType = (client,type) => {
        let templateIDPropertyName = type+"_TEMPLATE_ID";
        return client[templateIDPropertyName];
    }

    function editSelectorAssignments(){
        let client = getSelectedClientProperty("originalClient");
        let templateID = client.SELECTOR_ASSIGNMENTS_TEMPLATE_ID;
        /* Logic */
        if(hasTemplateOfType(client,"SELECTOR_ASSIGNMENTS")){
            promptEditTemplate(client, templateID).then(response=>{
                if(response == "editTemplate") editTemplate(); // Note you see .then(refresh) for Options and Audio Settings here
                if(response == "unlink") unlinkAndEdit(); // But we are going to another page so we shouldn't refresh.
            })
        }
        else{ // No template found or this client is the basis for a template; open selector assignments normally
            edit();
        }
        /* Helper Functions */
        function editSelectorAssignments(id){$state.go('clientSelectorAssignments', { 'clientid' : id })}
        function edit()         { return editSelectorAssignments(client.ID) }
        function editTemplate() { return editSelectorAssignments(templateID) }
        function unlinkAndEdit(){
            /* Unlike Options and Audio Settings, we are going to a new page rather than opening a modal.
            Because of this, we'll just unlink the template regardless of if the user cancels or saves
            when they're on the Selector Assignments page. */
            return unlinkTemplate(client,"SELECTOR_ASSIGNMENTS").then(edit);
        }
    }

    function editAudioSettings() {
        let client = getSelectedClientProperty("originalClient");
        let templateID = client.AUDIO_SETTINGS_TEMPLATE_ID;
        /* Logic */
        if(hasTemplateOfType(client,"AUDIO_SETTINGS")){
            promptEditTemplate(client,templateID).then(response=>{
                if(response == "editTemplate") editTemplate().then(refresh)
                if(response == "unlink") unlinkAndEdit().then(refresh)
            })
        }
        else{ // No template found or this client is the basis for a template; open selector assignments normally
            edit().then(refresh)
        }
        /* Helper Functions */
        function edit()         { return openAudioSettingsDialog(client.ID); }
        function editTemplate() { return openAudioSettingsDialog(templateID); }
        function unlinkAndEdit(){ // only unlink the template if the edit was SAVED rather than CANCELED
            return edit().then(()=>unlinkTemplate(client,"AUDIO_SETTINGS"));
        }
    }

    function editOptions() {
        let client = getSelectedClientProperty("originalClient");
        let templateID = client.OPTIONS_TEMPLATE_ID;
        /* Logic */
        if(hasTemplateOfType(client,"OPTIONS")){
            promptEditTemplate(client,templateID).then(response=>{
                if(response == "editTemplate") editTemplate().then(refresh)
                if(response == "unlink") unlinkAndEdit().then(refresh)
            })
        }
        else{
            edit().then(refresh);
        }
        /* Helper Functions */
        function edit()         { return openOptionsDialog(client.ID, client.LABEL_TYPE_PREFIX) }
        function editTemplate() { return openOptionsDialog(templateID,client.LABEL_TYPE_PREFIX) }
        function unlinkAndEdit(){ // only unlink the template if the edit was SAVED rather than CANCELED
            return edit().then(()=>unlinkTemplate(client,"OPTIONS"))
        }
    }

    let openAudioSettingsDialog = function(clientid) {
        var modalInstance = $uibModal.open({
            controller: 'ClientAudioSettingsController',
            templateUrl: 'ClientConfiguration/views/clientAudioSettings-dialog.html',
            backdrop: 'static',
            size: 'lg',
            resolve: {
                clientid: ()=>clientid
            }
        });
        return modalInstance.result;
    };
    
    const determineAppropriateOptionsDialog = type => {
        let controller;
        let view;
        if(["VCP","VDI"].includes(type)){
            controller = 'ClientConfigurationOptionsController';
            view = 'ClientConfiguration/views/clientConfigurationOptions-dialog.html';
        }
        else if(type == "SIP"){
            controller = 'ClientConfigurationOptionsSIPController';
            view = 'ClientConfiguration/views/clientConfigurationOptionsSIP-dialog.html';
        }
        else if(type == "RTSP"){
            controller = 'ClientConfigurationOptionsRTSPController';
            view = 'ClientConfiguration/views/clientConfigurationOptionsRTSP-dialog.html';
        }
        else if(type == "P2P"){
            controller = 'ClientConfigurationOptionsRTSPController';
            view = 'ClientConfiguration/views/clientConfigurationOptionsRTSP-dialog.html';
        }
        else{
            console.error("can't open options dialog for client of type",type,"we were expecting VCP, VDI, SIP, or RTSP");
        }
        return {
            controller:controller,
            view:view
        }
    }
    const openOptionsDialog = function(clientid, clientType) {
        let appropriateDialog = determineAppropriateOptionsDialog(clientType);
        let modalInstance = $uibModal.open({
            controller: appropriateDialog.controller,
            templateUrl: appropriateDialog.view,
            backdrop: 'static',
            size: 'lg',
            resolve: {clientid: ()=>clientid}
        });
        return modalInstance.result;//.then($scope.refresh);
    }

    const unlinkTemplate = function(client, type) {
        let promise = ClientConfigurationService.unlinkTemplate(client.ID,type);
        ProgressBarService.track(promise);
        return promise;
    };

    const getStringForListOfClients = clients => {
        if(clients && clients.length > 0){
            return "["+clients.map(client=>client.name).join(", ")+"]";
        }
        else{
            return "[No clients]";
        }
    }
    
    const promptEditTemplate = function() {
        var modalInstance = $uibModal.open({
            controller: function($scope,$uibModalInstance){
                $scope.editTemplate = () => $uibModalInstance.close('editTemplate');
                $scope.unlink = () =>       $uibModalInstance.close('unlink');
                $scope.cancel = () =>       $uibModalInstance.dismiss();
            },
            templateUrl: 'views/editTemplate-dialog.html',
            backdrop: 'static'
        });
        return modalInstance.result;
    };
    
    /*
     * Open Template dialog
     */
    $scope.openTemplates = function() {
        var modalInstance = $uibModal.open({
            controller: 'ClientTemplatesController',
            templateUrl: 'views/clientTemplates-dialog.html',
            backdrop: 'static',
            size: 'lg'
        });
        modalInstance.result.then($scope.refresh);
    };
    
    /* Disable / Enable client(s) */
    function numSelectedDisabled(){return grid.getSelectedRows().filter(row=>row.disabled).length;}
    $scope.canDisable = function(){return $scope.someSelected() && numSelectedDisabled() < 1}
    $scope.canEnable = function(){return numSelectedDisabled() > 0}
    $scope.disableSelectedClients = function(){
        ProgressBarService.track(
            Promise.all(
                grid.getSelectedRows().map(row=>{
                    ClientConfigurationService.disableClient(row);
                })
            ).finally($scope.refresh)
        )
    }
    $scope.enableSelectedClients = function(){
        ProgressBarService.track(
            Promise.all(
                grid.getSelectedRows().map(row=>{
                    return ClientConfigurationService.enableClient(row);
                })
            ).finally($scope.refresh)
        )
    }
    /*
     * Delete client(s)
     */
    $scope.canDelete = () => $scope.someSelected() && EnabledService.deleteClients();
    $scope.deleteClient = function() {
        let selected = grid.getSelectedRows();
        if(!selected || selected.length < 1) return; 
        const message = "Are you sure you want to delete the following client(s)? " + getStringForListOfClients(selected);
        const onSuccessDeleting = () => {
            $scope.refresh();
            // grid.removeRows(selected);
            // grid.deselectAll();
        }
        const onFailureDeleting = () => NotificationService.add({message:"Failed to perform the desired deletions",type:"danger"});
        const onConfirm = () => {
            let promises = selected.map(client=>{
                ClientConfigurationService.deleteClient(client);
            })
            let promise = $q.all(promises);
            ProgressBarService.track(promise,{showSuccess:true});
            promise
            .then(onSuccessDeleting)
            .catch(onFailureDeleting);
        }
        ModalConfirmer.prompt({
            title:"Confirm Deletion",
            message:message,
            okayLabel:"Delete"
        }).then(onConfirm);
    }
    
    /*
     * Add new client
     */
    $scope.addClient = function() {
        var modalInstance = $uibModal.open({
			controller: 'EditClientController',
			templateUrl: 'views/editClient-dialog.html',
			backdrop: 'static',
            resolve: {
                clientid: ()=>'',
                mode: () => 'add'
            }
		});
		modalInstance.result.then(()=>{
            // grid.addRow(client);
            $scope.refresh();
        });
    };
    
    /*
     * Duplicate existing client - will open the Edit Client dialog and make a copy of the client
     */
    $scope.duplicateClient = function() {
            var modalInstance = $uibModal.open({
            controller: 'EditClientController',
            templateUrl: 'views/editClient-dialog.html',
            backdrop: 'static',
            resolve: {
                clientid: ()=>getSelectedClientProperty("ID"),
                mode: ()=>'duplicate'
            }
        });
        modalInstance.result.then(()=>{
            // console.log("duplicate client",client);
            // grid.addRow(client);
            $scope.refresh();
        });
    }
    $scope.openReplaceWithDialog = () => {
        SelectorChooserService.prompt().then(chosenID=>{
            let selected = grid.getSelectedRows()[0];
            SearchAndReplaceService.promptReplaceSelectors(selected.ID,chosenID);
        })
    }

    $scope.searchAndReplace = () => {
        SelectorChooserService.prompt({
            title:"Choose a Selector to be replaced",
            showSystemName:AuthenticationService.hasTrunking()
        }).then(destID=>{
            let title = "Choose a Selector to replace '" + LabelStorageService.getLabelName(destID) + "'"
            SelectorChooserService.prompt({
                title:title,
                showSystemName:AuthenticationService.hasTrunking()
            }).then(sourceID=>{
                SearchAndReplaceService.promptReplaceSelectors(destID,sourceID);
            })
        })
    }

    function refresh(){
        let promise = LabelStorageService.refreshAllClients().then(clients=>{
            let rows = getRowsFromClients(clients);
            grid.setRows(rows);
        });

        ProgressBarService.track(promise); // show a loading bar while it loads!
        promise.catch(()=>{
            NotificationService.add({message:"Failed to refresh the grid",type:"danger"});
        })

        return promise;
        
    }
    
    SelectorDescriberService.waitUntilReady().then(()=>{
        init();
    });

    $scope.p2pSelected = () => {
        return Util.getPropertySafe(getSingleSelectedClient(),"originalClient","LABEL_TYPE_PREFIX") == "P2P";
    }
    $scope.oneSelected = () => grid.hasOneSelected();
    $scope.someSelected = () => !$scope.noneSelected();
    $scope.noneSelected = () => grid.hasNoneSelected();
    $scope.selectAll = () => grid.selectAllFiltered();
});
/* global app */
app.controller('ClientConfigurationOptionsController',
function($scope, $state, $timeout,
    $window, $uibModalInstance, $sce, ProgressBarService,
    ClientConfigurationService, AuthenticationService, clientid) {
    
    $scope.client = {};

    const init = () => {
        loadControllerData();
    }

    function loadControllerData() {
        ClientConfigurationService.getClient(clientid)
        .then(function(result) {
            $scope.client = result.data[0];
        });
    }

    $scope.save = function() {
        let promise = ClientConfigurationService.putClient($scope.client)
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then($uibModalInstance.close);
    };
    
    $scope.cancel = $uibModalInstance.dismiss;
    
    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
    };
    init();
});
/* global app Form */
app.controller('ClientConfigurationOptionsRTSPController',
    function( $scope,  $uibModalInstance, ProgressBarService,
        ClientConfigurationService, LabelStorageService, clientid) {
            
    $scope.client = {};
    
    const form1Fields =     ["RTSP_STREAMING_METHOD",   "IP_PORT_FOR_RTSP_AND_RTP_OVER_HTTP",   "RTSP_URI"];
    const form2Fields =     ["GEO_MAPPING_DISABLE",     "GEO_MAPPING_LATITUDE",                 "GEO_MAPPING_LONGITUDE"];
    const streamingMethods = [
        {value:"RTSP_WITH_RTP_OVER_RTSP",label:"RTSP with RTP over RTSP"},
        {value:"RTSP_WITH_RTP_OVER_UDP", label:"RTSP with RTP over UDP"},
        {value:"RTSP_AND_RTP_OVER_HTTP", label:"RTSP and RTP over HTTP"}
    ]
    
    const defaults = {
        // "RTSP_STREAMING_METHOD":undefined,
        "GEO_MAPPING_DISABLE":"OFF",
        "IP_PORT_FOR_RTSP_AND_RTP_OVER_HTTP":8080
    }
    $scope.models = Object.assign({},defaults);

    const init = () => {
        $scope.form1 = generateForm1();
        $scope.form2 = generateForm2();
        load();
    }

    const load = () => {
        let promise = LabelStorageService.refreshFullDetailLabels([clientid]);
        ProgressBarService.track(promise);
        promise.then(function(result) {
            $scope.client = result[0];
            console.log($scope.client,"client");
            let fields = form1Fields.concat(form2Fields);
            fields.forEach(f=>{ // populate forms properly
                if($scope.client[f] != undefined) $scope.models[f] = $scope.client[f];
            })
        })
    }
    /* Special case for RTSP so we can change the visible name to Video Source */
    $scope.getClientTypeString = () => {
        console.log("$scope client LABEL TYPE PREFIX",$scope.client.LABEL_TYPE_PREFIX);
        let typeString = ($scope.client.LABEL_TYPE_PREFIX == "RTSP") ? "VIDEO_SOURCE" : $scope.client.LABEL_TYPE 
        return typeString + ' / ' + $scope.client.SELECTOR_NAME + ' / ' + $scope.client.DESCRIPTION;
    }

    $scope.save = () => {
        Object.assign($scope.client,$scope.models);
        if($scope.client.GEO_MAPPING_DISABLE!="ON") delete $scope.client.GEO_MAPPING_DISABLE;
        let promise = ClientConfigurationService.putClient($scope.client);
        promise.then($uibModalInstance.close);
        ProgressBarService.track(promise,{showSuccess:true});
    }
    $scope.cancel = function() {
        $uibModalInstance.dismiss();  
    };



    // Form
    // RTSP Options
	// Client Options
	// 	RTSP Streaming Method (DROPDOWN)
	// 	IP Port for <Streaming Method> (SHORT TEXT)
	// 	RTSP URI ( LONG TEXT )

	// Geo Mapping
	// 	Geo Mapping Disable (checkbox)
	// 	Geo Mapping Latitude (Fixed Position) (SHORT TEXT)
    // 	Geo Mapping Longitude (Fixed Position) (SHORT TEXT)
    
    /* generate form */
    const generateForm1 = () => {
        const form = Form(3);
        const fieldLabels = [
            "RTSP Streaming Method",
            "IP Port for RTSP and RTP over HTTP",
            "URI"
        ];
        const fields = form.get();
        fields.forEach((field,i)=>{
            field.label=fieldLabels[i];
            field.modelName=form1Fields[i];
        });
        fields[0].type="select";
        fields[0].selectOptions = streamingMethods;
        fields[0].disabled = true;
        fields[1].disabled = true;
        return form;
    }
    
    const generateForm2 = () => {
        const form = Form(3);
        const fieldLabels = [
            "Geo Mapping Disable",
            "Geo Mapping Latitude (Fixed Position)",
            "Geo Mapping Longitude (Fixed Position)"
        ]
        const fields = form.get();
        fields.forEach((field,i)=>{
            field.label=fieldLabels[i];
            field.modelName=form2Fields[i];
        });
        fields[0].type = "toggleSwitch";
        return form;
    }

    init();
});
/* global app Util */
app.controller('ClientConfigurationOptionsSIPController',
function($scope, $uibModalInstance, $sce, ProgressBarService,
    ClientConfigurationService, clientid, ResourceService) {
    
    $scope.client = {};
    $scope.inboundSessionActivations = [];
    $scope.inboundSessionDeactivations = [];
    $scope.outboundSessionActivations = [];
    $scope.outboundSessionDeactivations = [];
    $scope.rtpKeepAliveMethods = [];
    $scope.soundFiles = [];

    const arrayAndPropertyNames = [
        {array:"inboundSessionActivations",     property:"SIP_INBOUND_SESSION_ACTIVATION"},
        {array:"inboundSessionDeactivations",   property:"SIP_INBOUND_SESSION_DEACTIVATION"},
        {array:"outboundSessionActivations",    property:"SIP_OUTBOUND_SESSION_ACTIVATION"},
        {array:"outboundSessionDeactivations",  property:"SIP_OUTBOUND_SESSION_DEACTIVATION"},
        {array:"rtpKeepAliveMethods",           property:"RTP_KEEP_ALIVE_METHOD"}
    ];
    
    const init = () => {
        let promise = loadClient()
        .then(loadLists)
        ProgressBarService.track(promise);
    }
    
    function loadClient() {
        let promise = ClientConfigurationService.getClient(clientid)
        promise.then(function(result) {
            $scope.client = result.data[0];
        });
        return promise;
    }

    /* We get from the server just the value of these properties on the client
    But to work with the <ui-select> dropdown (and ng-model), we must use a value/label pair.
    Which looks like {value:"DISABLED",label:"Disabled"}. We find the one with the same value 
    as the client, and rewrite the client's property from just the value to the value/label pair.
    We will switch it back to just the value when we go to save the client. */
    const loadList = (propertyName,arrayName) => {
        /* result.data looks like this
        {
            "SIP_INBOUND_SESSION_ACTIVATION":{
                "DISABLED":"Disabled",
                "ON_CALL_RECEIVED":"On Call Received",
                "ON_TALK_SELECTOR_ACTIVATION":"On Talk Selector Activation"
            }
        }
        */
        let promise = ClientConfigurationService.getClient(clientid, propertyName)
            .then(result=>{
                let obj = result.data[propertyName]; // shown in comments above
                $scope[arrayName] = Util.objectToArray(obj); // convert to array of value/label pairs
                let x = Util.findElementWithProperty($scope[arrayName],"value",$scope.client[propertyName]) // find corresponding value/label pair
                $scope.client[propertyName] = x; // assign property to be value/label pair
            })
        return promise
    }
    
    const loadLists = function() {
        arrayAndPropertyNames.forEach(item=>{
            loadList(item.property,item.array);
        })
        /* Get ringtones from resource API */
        ResourceService.getSoundFileNames()
        .then(names=>{
            /* convert to objects with label and value, to be used as drop down list */
            const soundsAsDropdownList = names.map(name=>{
                return {
                    label:name,
                    value:name
                }
            })
            $scope.soundFiles = soundsAsDropdownList;
            /* Load ringtone as dropdown object */
            const loadedRingtone = $scope.client.RING_TONE_FILE_NAME;
            $scope.client.RING_TONE_FILE_NAME = Util.findElementWithProperty(soundsAsDropdownList,"value",loadedRingtone);
            /* Load Answer sound file as dropdown object */
            const loadedAnswerSound = $scope.client.ANSWER_SOUND_FILE_NAME;
            $scope.client.ANSWER_SOUND_FILE_NAME = Util.findElementWithProperty(soundsAsDropdownList,"value",loadedAnswerSound);
        });
    };

    $scope.save = function() {
        // Get some list values and set them as API needs them
        if($scope.client.SIP_INBOUND_SESSION_ACTIVATION != undefined) $scope.client.SIP_INBOUND_SESSION_ACTIVATION = $scope.client.SIP_INBOUND_SESSION_ACTIVATION.value;
        if($scope.client.SIP_INBOUND_SESSION_DEACTIVATION != undefined) $scope.client.SIP_INBOUND_SESSION_DEACTIVATION = $scope.client.SIP_INBOUND_SESSION_DEACTIVATION.value;
        if($scope.client.SIP_OUTBOUND_SESSION_ACTIVATION != undefined) $scope.client.SIP_OUTBOUND_SESSION_ACTIVATION = $scope.client.SIP_OUTBOUND_SESSION_ACTIVATION.value;
        if($scope.client.SIP_OUTBOUND_SESSION_DEACTIVATION != undefined) $scope.client.SIP_OUTBOUND_SESSION_DEACTIVATION = $scope.client.SIP_OUTBOUND_SESSION_DEACTIVATION.value;
        if($scope.client.RTP_KEEP_ALIVE_METHOD != undefined) $scope.client.RTP_KEEP_ALIVE_METHOD = $scope.client.RTP_KEEP_ALIVE_METHOD.value;
        if($scope.client.RING_TONE_FILE_NAME != undefined) $scope.client.RING_TONE_FILE_NAME = $scope.client.RING_TONE_FILE_NAME.value;
        if($scope.client.ANSWER_SOUND_FILE_NAME != undefined) $scope.client.ANSWER_SOUND_FILE_NAME = $scope.client.ANSWER_SOUND_FILE_NAME.value;
        // Save client object using PUT
        let promise = ClientConfigurationService.putClient($scope.client)
        ProgressBarService.track(promise,{showSuccess:true});
        promise.then($uibModalInstance.close);
    };
    $scope.cancel = $uibModalInstance.dismiss;




    /* normally would use ng-model but it doesn't work well with file input elements */
    const setRingtoneFile = filename => $scope.client.RING_TONE_FILE_NAME = Util.findElementWithProperty($scope.soundFiles,"value",filename);
    const setAutoAnswerFile = filename => $scope.client.ANSWER_SOUND_FILE_NAME = Util.findElementWithProperty($scope.soundFiles,"value",filename);
    const addSoundFileToList = filename => $scope.soundFiles.push({label:filename,value:filename})

    $scope.uploadAnswerSoundFile = ResourceService.putSoundFile;
    $scope.uploadRingtoneFile = ResourceService.putSoundFile;

    /* handlers for uploading an auto answer sound file */
    $scope.onSuccessUploadAnswerSoundFile = filename => {
        addSoundFileToList(filename);
        setAutoAnswerFile(filename);
    }
    $scope.onFailureUploadAnswerSoundFile = () => {

    }
    /* handlers for uploading a ringtone file */
    $scope.onSuccessUploadRingtoneFile = filename => {
        addSoundFileToList(filename);
        setRingtoneFile(filename);
    }
    $scope.onFailureUploadRingtoneFile = () => {

    }
    
    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
    };
    init();
});
app.controller('TIFConfigurationController',
function($scope, TelephoneInterfaceService, PhoneBankService, ResourceService) {

    /* RTS Function Type dropdown */
    const getRTSFunctionTypes = id => {
        return TelephoneInterfaceService.getRTSFunctionTypes(id).then(result=>{
            const options = Util.objectToArray(result.data.TELEX_LABEL_CATEGORY);
            options.push({label:"(None)",value:"NONE"})
            return options;
        })
    }


    /* Update the config of one phone line in the phone bank*/
    const loadClientWithID = targetID => {
        return getRTSFunctionTypes(targetID).then(telexFunctionTypes=>{
            /* update possible RTS Function Types */
            $scope.rtsFunctionTypes = telexFunctionTypes
            /* If a phone was previously loaded, then switched away from and switched back to
            it would consider itself already loaded (config.loaded == true) even though
            it would be in the process of sending a get request to make it up-to-date.
            This line sets loaded to fase until the get request goes through */
            PhoneBankService.setConfig(targetID,{loaded:false});

            return TelephoneInterfaceService.getClient(targetID).then(result=>{
                const client = result.data[0];
                if(client){
                    const config = {};
                    /* Transform properties if necessary */
                    /* SIP_INBOUND_SESSION_ACTIVATION is normally stored as
                        ON_CALL RECEIVED,
                        ON_TALK_SELECTOR_ACTIVATION, or
                        DISABLED
                        so we have to map that to "ON"/"OFF" for autoAnswer.
                        Here I'm choosing to only map ON_CALL_RECEIVED to ON.*/
                    const autoAnswer = client.SIP_INBOUND_SESSION_ACTIVATION == "ON_CALL_RECEIVED"? "ON":"OFF"
                    const phoneLineStatus = Util.negateOnOff(client.LABEL_DISABLED);
                    const functionType = {value: client.RTS_ALPHA_FUNCTION_TYPE? client.RTS_ALPHA_FUNCTION_TYPE : "NONE"};
                    const functionNumber = parseInt(client.RTS_ALPHA_FUNCTION_INDEX) + 1; // from 0-indexing to 1-indexing
                    const autoAnswerSound = {value: client.ANSWER_SOUND_FILE_NAME};
                    const ringtone = {value: client.RING_TONE_FILE_NAME};
                    const fourwireID = Util.getPropertySafe(client,"ASSOCIATED_FOURWIRE","ID");
                    
                    config.phoneLineStatus  = phoneLineStatus;
                    config.phoneLineNumber  = client.DESCRIPTION;
                    config.userName         = client.LOGIN_NAME;
                    config.password         = client.LOGIN_PASSWORD;
                    config.phoneLineName    = client.SELECTOR_NAME;
                    config.autoAnswer       = autoAnswer;
                    config.rtsAlpha         = client.EXTERNAL_NAME_LONG;
                    config.rtsFunctionType  = functionType;
                    config.rtsFunctionNumber= functionNumber;
                    config.autoAnswerSound  = autoAnswerSound;
                    config.ringtone         = ringtone;
                    config.inputStep        = client.AUDIO_INPUT_LEVEL_GAIN_STEP;
                    config.outputStep       = client.AUDIO_OUTPUT_LEVEL_GAIN_STEP;
                    config.fourwireID       = fourwireID;
                    config.loaded           = true;
                    
                    PhoneBankService.setConfig(targetID,config);
    
                    return result.data[0];
                }
            });
        })
    }

    const saveChanges = () => {
        const id = PhoneBankService.getSelectedPhone().ID;
        const config = PhoneBankService.getConfig(id);
        
        /* Transform properties if necessary */
        const inboundSessionActivation = config.autoAnswer == "ON"? "ON_CALL_RECEIVED" : "ON_TALK_SELECTOR_ACTIVATION";
        const labelDisabled = Util.negateOnOff(config.phoneLineStatus);
        const functionIndex = parseInt(config.rtsFunctionNumber) - 1; // from 1-indexing to 0-indexing

        const obj = {
            LABEL_DISABLED:                 labelDisabled,
            DESCRIPTION:                    config.phoneLineNumber,
            LOGIN_NAME:                     config.userName,
            LOGIN_PASSWORD:                 config.password,
            SELECTOR_NAME:                  config.phoneLineName,
            SIP_INBOUND_SESSION_ACTIVATION: inboundSessionActivation,
            EXTERNAL_NAME_LONG:             config.rtsAlpha,
            RTS_ALPHA_FUNCTION_TYPE:        config.rtsFunctionType.value,
            RTS_ALPHA_FUNCTION_INDEX:       functionIndex,
            ANSWER_SOUND_FILE_NAME:         config.autoAnswerSound.value,
            RING_TONE_FILE_NAME:            config.ringtone.value
        }

        console.log("saving changes:",obj);

        $scope.changesSaved = false;
        TelephoneInterfaceService.updateClient(id,obj).then(()=>{
            $scope.changesSaved = true;
        })
        
    }

    /* RTS Alpha is only editable if there is no function type or function index */
    $scope.RTSAlphaDisabled = phone => {
        return !phone || phone.config.rtsFunctionType || phone.config.rtsFunctionNumber;
    }

    $scope.saveChanges = saveChanges;
    $scope.getSelectedPhone = PhoneBankService.getSelectedPhone;
    PhoneBankService.onPhoneChange((newPhone)=>{
        if(newPhone){
            console.log("new phone selected");
            loadClientWithID(newPhone.ID)
        }
    })

    $scope.uploadAnswerSoundFile = ResourceService.putSoundFile;
    $scope.uploadRingtoneFile = ResourceService.putSoundFile;
    const addSoundFileToList = filename => $scope.soundFiles.push({label:filename,value:filename})
    const selectAnswerSoundFile = filename => $scope.getSelectedPhone().config.autoAnswerSound = Util.findElementWithProperty($scope.soundFiles,"value",filename);
    const selectRingtoneFile    = filename => $scope.getSelectedPhone().config.ringtone        = Util.findElementWithProperty($scope.soundFiles,"value",filename);

    /* handlers for uploading an auto answer sound file */
    $scope.onSuccessUploadAnswerSoundFile = filename => {
        addSoundFileToList(filename);
        selectAnswerSoundFile(filename);
    }
    $scope.onFailureUploadAnswerSoundFile = () => {

    }
    /* handlers for uploading a ringtone file */
    $scope.onSuccessUploadRingtoneFile = filename => {
        addSoundFileToList(filename);
        selectRingtoneFile(filename);
    }
    $scope.onFailureUploadRingtoneFile = filename => {

    }

    /* Request the available sound file names to populate our dropdowns */
    ResourceService.getSoundFileNames()
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

});
app.controller('TIFDetailsController', function($scope, PhoneBankService, DebugService, AuthenticationService) {    
    const timeSinceLastChange = phone => {
        let dur = phone.LINE_STATE_DURATION;
        if(dur){
            return dur + " ago";
        }
        else{
            return "Unknown";
        }
    }
    const getStateDescription = () => {
        let desc = "";
        if($scope.getSelectedPhone()){
            const state = $scope.getSelectedPhone().LINE_STATE;
            desc = state;
            if(state=="DISABLED")desc="INACTIVE";
            if(state=="ERROR")desc="An issue has been detected with this line.  This issue is due to either a loss of communication with the RTS Master Controller or the associated 4-Wire port is not connected.";
        }
        return desc;
    }
    const monitorSelectedPhone = () => {
        const getLevelsSafe = () => {
            let selectedPhone = PhoneBankService.getSelectedPhone();
            if(selectedPhone) return selectedPhone.levels;
        }
        $scope.$watch(getLevelsSafe,levels=>{
            if(levels){
                $scope.rxa = parseFloat($scope.rxa2) || levels.rxAverage;
                $scope.rxp = parseFloat($scope.rxp2) || levels.rxPeak;
                levels.rxPeak = $scope.rxp;
                levels.rxAverage = $scope.rxa;
                $scope.txa = levels.txAverage;
                $scope.txp = levels.txPeak;
            }
        })
    }
    $scope.getSelectedPhone = PhoneBankService.getSelectedPhone;
    $scope.timeSinceLastChange = timeSinceLastChange;
    $scope.getStateDescription = getStateDescription;
    $scope.isDebug = DebugService.isEnabled;
    $scope.enableVuMeter = AuthenticationService.hasVuMeters();
    monitorSelectedPhone();
});
app.controller('TIFDialerController', function($scope, TelephoneInterfaceService,PhoneBankService) {    
    const getPhone = PhoneBankService.getSelectedPhone;
    const getNumber = () => $scope.phoneNumber;

    const advice = () => {
        const phone = getPhone();
        const number = getNumber();
        if(!phone){
            return "Choose a phone line.";
        }
        if(phone.LINE_STATE == 'ON-HOOK' && number == undefined){
            return "Input a number to dial.";
        }
        if(phone.LINE_STATE == 'OFF-HOOK'){
            return "Line is in use.";
        }
        if(phone.LINE_STATE == 'ERROR'){
            return "This line is currently unavailable."
        }
    }
    const canPlaceCall = () => {
        const phone = getPhone();
        const number = getNumber();
        return (
            phone  // phone must exist
            && phone.LINE_STATE == 'ON-HOOK' // phone must be on hook
            && number // number must exist
            && typeof(number) == 'string' // number must be a string
        )
    }
    const placeCall = () =>{
        const phone = getPhone();
        const number = getNumber();

        if(canPlaceCall()){
            console.log("dialing",number,"from phone",phone)
            TelephoneInterfaceService.call(phone.LINE_ID,number);
        }
        else{
            console.error("ERROR: not attempting to dial",number,"from phone",phone,"due to canPlaceCall returning",canPlaceCall());
        }
    }
    const phoneIsOffHook = () => {
        const phone = getPhone();
        return phone && phone.LINE_STATE != "ON-HOOK";
    }
    const canHangUp = () => phoneIsOffHook()
    const hangUp = () => {
        const phone = getPhone();
        if(canHangUp()){
            TelephoneInterfaceService.disconnect(phone.LINE_ID);
        }
    }
    const sendDTMF = () => {
        TelephoneInterfaceService.call(getPhone().LINE_ID,$scope.dtmf);
        $scope.dtmf = ""; // clear the field
    }

    $scope.canPlaceCall = canPlaceCall;
    $scope.advice = advice;
    $scope.placeCall = placeCall;
    $scope.canHangUp = canHangUp;
    $scope.hangUp = hangUp;
    $scope.getPhone = getPhone;
    $scope.showExtension = () => phoneIsOffHook();
    $scope.sendDTMF = () => sendDTMF();
});
/* global app Util Loader*/
app.controller('TIFLevelsController',function($scope, TelephoneInterfaceService, PhoneBankService){
    // Configuration
    const MAX_STEP = 3;
    const MIN_STEP = -3;
    // Variables
    let loader = Loader($scope,"levels");

    const init = () => {
        displayLevelsOfPhone(getPhone());
        // PhoneBankService.onPhoneChange(displayLevelsOfPhone);
        PhoneBankService.onPhoneConfigUpdated(displayLevelsOfPhone);
    }

    /* Input and Output levels want a user-friendly label that shows the amount of gain in dB.
    We receive the step size from the server and convert it into dB for the user */
    const stepToDb = step => step*6; // step size is arbitrary in nature, but +6dB is roughly equivalent to a doubling in amplitude
    const dbToLabel = db => {
        let prefix = (db > 0)?"+":""; // explicitly show '+' sign for positive numbers
        return prefix + db + " db"; // add 'dB' on the end to show that the unit is dB
    }
    const stepToLabel = step => dbToLabel(stepToDb(step));

    /* If we haven't received an up-to-date version of the phone's config from the server, show a loading bar.
    If we have, update the UI to show the up-to-date input and output levels */
    const getPhone = PhoneBankService.getSelectedPhone;
    // const isPhoneLoaded = ()=>getPhone().config.loaded
    const displayLevelsOfPhone = phone => {
        if(Util.getPropertySafe(phone,"config","loaded")){
            loader.hide();
            $scope.inputStep = phone.config.inputStep;
            $scope.outputStep = phone.config.outputStep;
        }
        else{
            loader.pend();
        }
    }

    /* Send updates to server */
    const updateServerInputStep  = step => TelephoneInterfaceService.updateClient(getPhone().ID,{AUDIO_INPUT_LEVEL_GAIN_STEP:step});
    const updateServerOutputStep = step => {
        /* do the normal thing and update output level gain */
        TelephoneInterfaceService.updateClient(getPhone().ID,{AUDIO_OUTPUT_LEVEL_GAIN_STEP:step});
        const fourwireID = getPhone().config.fourwireID;
        if(fourwireID){ /* Update the associated fourwire's input gain */
            TelephoneInterfaceService.updateClient(fourwireID,{AUDIO_INPUT_LEVEL_GAIN_STEP:step});
        }
        else{
            console.log("no associated fourwire found for line",getPhone())
        }
    }
    /* Apply updates locally */
    const updateLocalInputStep = step => {
        $scope.inputStep = step; // update the display
        getPhone().config.inputStep = step; // update the phone.config, so if we switch to a different tab and back we still see this step value
    }
    const updateLocalOutputStep = step => {
        $scope.outputStep = step;
        getPhone().config.outputStep = step;
    }
    
    /* Make changes to levels */
    const setInputStep = newStep => {
        if(newStep == undefined) return; // invalid
        newStep = Util.clamp(newStep,MIN_STEP,MAX_STEP);
        if(newStep != $scope.inputStep){ // only update server if there's a change
            updateServerInputStep(newStep);
        }
        updateLocalInputStep(newStep);
    }
    const setOutputStep = newStep => {
        if(newStep == undefined) return;
        newStep = Util.clamp(newStep,MIN_STEP,MAX_STEP);
        if(newStep != $scope.outputStep){ // only update server if there's a change
            updateServerOutputStep(newStep);
        }
        updateLocalOutputStep(newStep);
    }

    init();

    /* + and - buttons for levels for input and output levels */
    $scope.incrementInputStep = () => setInputStep($scope.inputStep+1);
    $scope.decrementInputStep = () => setInputStep($scope.inputStep-1);
    $scope.incrementOutputStep = () => setOutputStep($scope.outputStep+1);
    $scope.decrementOutputStep = () => setOutputStep($scope.outputStep-1);
    /* user-friendly labels */
    $scope.getInputGainLabel  = () => stepToLabel($scope.inputStep);
    $scope.getOutputGainLabel = () => stepToLabel($scope.outputStep);
})
/* global app Util */
app.controller('TIFMainController',
function($scope, $interval, AuthenticationService,
    TelephoneInterfaceService, SystemSettingsService, PhoneBankService) {
/* Parameters */
    const DEFAULT_DISABLED_PHONES_VISIBLE = false;
    const DEFAULT_TAB = 'details';
    const DEFAULT_SYS_TAB = 'sysStatus';
    const UPDATE_LEVELS_DELAY = 100;   
    
/* Initialization */
    const init = () => {
        /* set Default values and expose to $scope */
        $scope.disabledPhonesAreVisible = DEFAULT_DISABLED_PHONES_VISIBLE;    
        $scope.chooseSidebar = chooseSidebar
        $scope.sidebar = undefined;
        $scope.chooseSysTab = chooseSysTab;
        $scope.getSelectedPhone = PhoneBankService.getSelectedPhone;
        // $scope.selectPhone = PhoneBankService.selectPhone;
                
        /* Choose which tabs to display first */
        chooseSidebar(DEFAULT_TAB);
        chooseDefaultSysTab();

        setupLevelsUpdates();

        /* Keep phones up to date */
        setupInterval(refreshStatus,Util.getTelephoneStatusRefreshInterval());
    }

    const setupLevelsUpdates = () => {
        let enabled = AuthenticationService.hasVuMeters();
        $scope.enableVuMeter = enabled;
        if(enabled){
            /* The first request will not return any valid data but rather initiate the audio accumulation. */
            TelephoneInterfaceService.getLevelsFromServer();
            // $("body").on('click',updateLevelsIfEnabled);
            setupInterval(updateLevelsIfEnabled,UPDATE_LEVELS_DELAY);
        }
    }

    const updateLevelsIfEnabled = () => {
        if($scope.enableVuMeter){
            TelephoneInterfaceService.updateLevels();
        }
    }

    const chooseDefaultSysTab = () => {
        SystemSettingsService.getOrPull().then(settings=>{
            const mainRTS_MC_IP = settings.IP_ADDRESS_FOR_TELEX_TIF_MASTER;
            const backupRTS_MC_IP = settings.IP_ADDRESS_FOR_TELEX_TIF_MASTER_BACKUP;
            /* We require at least one of the main or backup IP addresses be present */
            if(!mainRTS_MC_IP && !backupRTS_MC_IP){
                chooseSysTab("sysConfig");
            }
            else{
                chooseSysTab(DEFAULT_SYS_TAB);
            }
        })
    }

/* Utility functions */

    /* Simplifies setting up an interval and clearing it when we change state*/
    const setupInterval = (func,interval)=>{
        const handle = $interval(func, interval);
        // Call it immediately 
        func();
        // Clear interval upon leaving scope
        $scope.$on('$destroy', function() {
            $interval.cancel(handle);
        });
    }

    const chooseSidebar = name => {
        console.log("CHOOSING SIDEBAR from sidebar controller",name);
        const options = ["details","dialer","configuration","levels"];
        if(options.includes(name)){
            $scope.sidebar = name;
        }
        else{
            console.error("tried to go to a side bar that doesn't exist:",name);
        }
    }

    const chooseSysTab = name => {
        const options = ["sysStatus","sysConfig","sysDialPlan",];
        if(options.includes(name)){
            $scope.sysconfigTab = name;
        }
        else{
            console.error("tried to go to a side bar that doesn't exist:",name);
        }
    }

    $scope.getStateDisplayName = phone => {
        let state = phone.LINE_STATE;
        let stateName = state;
        if(state == "DISABLED")stateName="INACTIVE";
        if(state == "ERROR")stateName="UNAVAILABLE";
        return stateName;
    }

/* Misc Controls */
    $scope.toggleShowDisabledPhones = () => {
        if($scope.disabledPhonesAreVisible){
            $scope.disabledPhonesAreVisible = false;
        }
        else{
            $scope.disabledPhonesAreVisible = true;
        }
        refreshStatus();
    }

    
    $scope.selectPhone = phone => {
        PhoneBankService.selectPhone(phone);
        $scope.changesSaved = false;
    }

    /* This gets called repeatedly to query the server for the status of phones*/
    const refreshStatus = ()=>{
        return TelephoneInterfaceService.getStatusShowDisabled().then(result=>{
            PhoneBankService.updatePhones(result.data);
            var telephones;
            if($scope.disabledPhonesAreVisible){
                telephones = PhoneBankService.getAllPhones();
            }
            else{
                telephones = PhoneBankService.getEnabledPhones();
            }
            $scope.telephones = telephones;
        });
    }

    init();
});

app.controller('TIFSysConfigController',
function(AuthenticationService, $scope, $sce, FailoverService, $uibModal,
    SystemSettingsService, TelephoneInterfaceService) {
    
    const SIP_REGISTERED = "SIP_REGISTERED_TRUNK";
    const SIP_DIRECT_IP = "SIP_DIRECT_IP_TRUNK";

    const init = () => {
        $scope.userInfo = AuthenticationService.getUserInfo();
        $scope.systemSettings = {};
        $scope.numRegistered;
        $scope.numUnregistered;

        $scope.disableDomainAuthenticationOnOff;

    
        // /*
        //  * Valid IP Addresses retrieved from API
        //  * /
        $scope.validIpAddresses = [];
        loadControllerData();
        getSIPClientTypeCounts();
        $scope.save = save;
        $scope.cancel = cancel;


        $scope.pbxSelect = {
            selected: {value:'do nothing',label:'Do Nothing'}, // default selection
            options:[
                {value:'do nothing', label:'Do Nothing'},
                {value:'registered', label:'Set all to Registered Trunk'},
                {value:'unregistered', label:'Set all to Direct IP Trunk'}
            ]
        }
    }

    
    function loadControllerData() {
        // Call SystemSettings service to get the IP list first
        SystemSettingsService.getList('NETWORK_INTERFACE_IP_ADDRESS')
        .then(function(result) {
            $scope.validIpAddresses = result.data.NETWORK_INTERFACE_IP_ADDRESS;
        });
        
        SystemSettingsService.getOrPull().then(settings=>{
            $scope.systemSettings = settings;
            if($scope.systemSettings.SIP_DOMAIN_NAME === undefined){
                $scope.systemSettings.SIP_DOMAIN_NAME = "";
            }
            /* negate SIP_DOMAIN_AUTHENTICATION for Disable Domain Auth */
            const domainAuth = $scope.systemSettings.SIP_DOMAIN_AUTHENTICATION;
            const disableDomainAuth = Util.negateOnOff(domainAuth);
            $scope.disableDomainAuthenticationOnOff = disableDomainAuth;
        })
    }
    /*
     * How many SIP clients are each type?
     */
    const getSIPClientTypeCounts = () => {
        console.log("getting client type counts");
        return TelephoneInterfaceService.getClients()
        .then(result=>{
            console.log("clients gotten",result.data);
            const count1 = result.data.filter(client=>client.LABEL_TYPE == SIP_REGISTERED).length;
            const count2 = result.data.filter(client=>client.LABEL_TYPE == SIP_DIRECT_IP).length;            
            $scope.numRegistered = count1;
            $scope.numUnregistered = count2;
        })
    }
    /*
     * Set all SIP clients to a particular type
     */
    const isSIPClientType = type => type == SIP_REGISTERED || type == SIP_DIRECT_IP;
    const setSIPClientsType = newType => {
        console.log("setting sip clients type",newType);
        if(isSIPClientType(newType)){
            return TelephoneInterfaceService.getClients()
            .then(result=>{
                const SIPClientsToChange = result.data.filter(client=>{
                    return isSIPClientType(client.LABEL_TYPE) && newType != client.LABEL_TYPE
                });
                var promises = [];
                SIPClientsToChange.forEach(client=>{
                    client.LABEL_TYPE = newType;
                    console.log("Im setting client id",client.ID,"to",client);                    
                    promises.push(TelephoneInterfaceService.putClient(client.ID,client));
                })
                return Promise.all(promises);
            });
        }
        else{
            console.error("you can only set SIP clients to either",SIP_REGISTERED,"or",SIP_DIRECT_IP);
        }
    }

    $scope.showPBXHelp = () => {
        $uibModal.open({
			controller: function($scope,$uibModalInstance){
                $scope.close = $uibModalInstance.dismiss;
            },
            templateUrl: 'TIF/views/pbxConnectHelp-dialog.html'
		});
    }
    
    /*
     * Cancel, reload existing data
     */
    const cancel = function() {
        loadControllerData();
    }

    /*
     * Save settings to server with PUT
     */
    const save = function() {
        if($scope.pbxSelect.selected.value == "registered"){
            setSIPClientsType(SIP_REGISTERED).then(getSIPClientTypeCounts);
        }
        else if($scope.pbxSelect.selected.value == "unregistered"){
            setSIPClientsType(SIP_DIRECT_IP).then(getSIPClientTypeCounts);
        }

        $scope.systemSettings.SIP_DOMAIN_AUTHENTICATION = Util.negateOnOff($scope.disableDomainAuthenticationOnOff);
        // if($scope.systemSettings.SIP_DOMAIN_AUTHENTICATION == "OFF") delete $scope.systemSettings.SIP_DOMAIN_AUTHENTICATION;

        SystemSettingsService.pushAndPull($scope.systemSettings)
        .then(function() {
            $scope.changesSaved = true;
        });
    };

    $scope.isFailedOver = () => {
        return FailoverService.secondaryIsActive();
    }

    /*
	 * Fix for ui-select
	 */
	$scope.trustAsHtml = function(value) {
		return $sce.trustAsHtml(value);
	};

    init();
});
app.controller('TIFDialPlanController',
    function($scope, $timeout, SystemSettingsService, $uibModal) {
    $scope.systemSettings = "";
    const init = () => {
        load();
        watchDialPlans();
        /* Export functions to scope */
        $scope.save = save;
        $scope.cancel = cancel;
        $scope.dialPlanNames = [];
    }
    const showChangesSaved = () => {
        $scope.changesSaved = true;
        $timeout(()=>$scope.changesSaved = false,2000);
    }
    const watchDialPlans = () => {
        const watchDescendantsRecursively = true;
        $scope.$watch("systemSettings.DIAL_PLANS",()=>{
            const arr = $scope.systemSettings.DIAL_PLANS;
            if(arr){
                /* Add an empty dial plan at the end to allow the user to add one easily */
                if(arr[arr.length-1].DIAL_PLAN){
                    arr.push({DIAL_PLAN:""});
                }
                /* Remove any empty dial plans except the last */
                arr.slice(0,-1).forEach((item,index)=>{
                    if(!item.DIAL_PLAN){
                        arr.splice(index,1);
                    }
                })
                /* Name the Dial Plans indexing from 1 instead of 0 */
                $scope.dialPlanNames = arr.map((val,index)=>{
                    return "Dial Plan " + (index + 1);
                })
                /* And name the last one specifically */
                $scope.dialPlanNames[$scope.dialPlanNames.length-1] = "New Dial Plan";

            }
        },watchDescendantsRecursively);
    }
    const load = () => {
        SystemSettingsService.getOrPull().then(settings=>{
            $scope.systemSettings = settings;
            // Add in an empty dial plan if it isn't in the response
            if(!$scope.systemSettings.DIAL_PLANS || $scope.systemSettings.DIAL_PLANS.length < 1){
                $scope.systemSettings.DIAL_PLANS = [{DIAL_PLAN:""}]
            }
        })
    }

    const save = () => {
        const settingsToSave = angular.copy($scope.systemSettings);
        // the last dial plan is an extra created to allow the user to add a new one, remove it
        settingsToSave.DIAL_PLANS = $scope.systemSettings.DIAL_PLANS.slice(0,-1);

        SystemSettingsService.pushAndPull(settingsToSave)
        .then(function() {
            showChangesSaved();
            load();
        });
    }
    const cancel = () => {
        load();
    }

    init();

    $scope.showHelpPage = () => {
        $uibModal.open({
			controller: function($scope,$uibModalInstance){
                $scope.close = $uibModalInstance.dismiss;
            },
            templateUrl: 'TIF/views/dialPlansHelp-dialog.html'
		});
    }
});
app.controller('TIFSysStatusController', ['$scope', '$interval', 'SystemStatusService', function($scope,$interval,SystemStatusService) {
    const MC_STATUS_REFRESH_RATE = 2000; //ms
    
    /* Repeatedly update MC Status, and cancel this when we destroy the scope */
    const refreshMCStatus = () => {
        SystemStatusService.pull().then(status=>{
            $scope.TIF = status.TELEPHONE_INTERFACE_STATUS;
        })
    }

    refreshMCStatus();
    const handle = $interval(refreshMCStatus,MC_STATUS_REFRESH_RATE)
    $scope.$on('$destroy',()=>$interval.cancel(handle));
    
}]);
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
/* global app $ Util */
app.controller('GeoMainController',
function($scope,GeoService,EventService, WhosTalkingService,WhosOnlineService) {
    const ACTIVE_VOICE_INTERVAL = 500; // ms
    const whosTalkingMonitor = Util.repeater(WhosTalkingService.pull,ACTIVE_VOICE_INTERVAL);
    const whosOnlineMonitor = Util.repeater(WhosOnlineService.pull,1000);

    let total = window.innerHeight;
    let header = $("div[ui-view=upper]").height();
    let remaining = total-header;
    console.log("total header remaining",total,header,remaining);
    $("div[ui-view=middle]").css("height",remaining+"px");
    EventService.emit("firstGeoOpened");
    $scope.$on("$destroy",()=>{
        EventService.emit("lastGeoClosed");
        whosTalkingMonitor.stop();
        whosOnlineMonitor.stop();
    });
    setTimeout(()=>{
        console.log("geoservice initializing");
        GeoService.setup("mapid",$scope);
        whosTalkingMonitor.start();
        whosOnlineMonitor.start();
    },1000);
});
//# sourceMappingURL=bundle-d2a19ae457.js.map
