window.vcomBuildVersion = '0.2379829798908364';
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
var app = angular.module("app",['ui.router', 'ui.bootstrap','ngFileUpload']);

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouteProvider) {
	$urlRouteProvider.otherwise('/');

	$stateProvider.state('splash',{
		url: '/',
		views: {
			'upper' : {
				controller : 'HeaderController',
				templateUrl : 'splash/html/header.html'
			},
			'middle' : {
				controller : 'SplashController',
				templateUrl : 'splash/html/splash.html'
			}
		}
    });
}]);

/* React when the origin changes */
app.run(function(EventService,OriginService,BrandingService){
	/* This event should fire just once at the beginning */
	EventService.on("initializeBranding",()=>{
		BrandingService.applyFavicon();
		BrandingService.applyTitle();
		BrandingService.refreshLogo();
	})
	OriginService.init();
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

/* global app $ */
app.controller('HeaderController',
function(EnvService,BrandingService) {
    const productName = EnvService.get("productName");
    const fadeInTime = 600;//ms
    BrandingService.refreshLogo().then(()=>{
        $("#logoImage").attr("src",BrandingService.getLogo()).hide().fadeIn(fadeInTime);
    })
    $("#branding_name").text(productName).hide().fadeIn(fadeInTime);
});
/* global app $ */
app.controller('SplashController',
function( $scope,RedirectService,URLService,WhichPageService,BrandingService) {
    let httpsCheckPromise
    const init = () => {
        $scope.loaded = false;
        const isPublicDemo = WhichPageService.isPublicDemo();
        $scope.isPublicDemo = () => isPublicDemo;
        $scope.productName = BrandingService.getProductName();
        $scope.vsaImgURL = BrandingService.getSplashVSAImageURL();
        $scope.vcpImgURL = BrandingService.getSplashVCPImageURL();
        $scope.homeLinkURL = BrandingService.getSplashHomeLink();
        establishURLs();
    }
    const establishURLs = () => {
        console.log("Checking if we should go to HTTPS")
        httpsCheckPromise = RedirectService.determineIfHTTPSIsSupported();
        httpsCheckPromise.then(port=>{
            console.log("need to send you to HTTPS",port);
            $scope.$apply(()=>{
                $(".vsa.dest a").attr("href",URLService.buildURL({path:"/SystemAdmin/#/",port:port,protocol:"https"}))
                $(".vcp.dest a").attr("href",URLService.buildURL({path:"/ControlPanel/#/",port:port,protocol:"https"}));
            })
            console.log("$scope",$scope);
        })
        httpsCheckPromise.catch(reason=>{
            console.log("Staying on HTTP",reason);
            $scope.$apply(()=>{
                $(".vsa.dest a").attr("href",URLService.buildURL({path:"/SystemAdmin/#/"}))
                $(".vcp.dest a").attr("href",URLService.buildURL({path:"/ControlPanel/#/"}));
            })
        })
        httpsCheckPromise.finally(()=>{
            $scope.$apply(()=>{
                $scope.loaded = true;
                $("#loader").css("display","block");
                
            })
        })
    }
    init();
});
//# sourceMappingURL=bundle-d8a007ef83.js.map
