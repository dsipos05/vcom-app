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