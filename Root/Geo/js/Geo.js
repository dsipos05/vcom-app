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