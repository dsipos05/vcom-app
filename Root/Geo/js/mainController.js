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