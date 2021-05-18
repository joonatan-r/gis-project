import 'ol/ol.css';
import GPX from 'ol/format/GPX';
import GeoJSON from 'ol/format/GeoJSON';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import {Circle, Fill, Stroke, Style, Icon} from 'ol/style';
import { transform } from 'ol/proj';

// from https://openlayers.org/en/latest/doc/tutorials/bundle.html
// & https://openlayers.org/en/latest/examples/gpx.html

const fs = require('fs');
const query_overpass = require('query-overpass');

const style = {
    'Point': new Style({
      image: new Circle({
        fill: new Fill({
          color: 'rgba(0,200,0,0.5)'
        }),
        radius: 5,
        stroke: new Stroke({
          color: '#0f0',
          width: 1
        })
      })
    }),
    'LineString': new Style({
      stroke: new Stroke({
        color: '#f00',
        width: 3
      })
    }),
    'Polygon': new Style({
      fill: new Fill({
        color: 'rgba(0,255,255,0.5)'
      }),
      stroke: new Stroke({
        color: '#0ff',
        width: 1
      })
    }),
    'MultiPoint': new Style({
      image: new Circle({
        fill: new Fill({
          color: 'rgba(255,0,255,0.5)'
        }),
        radius: 5,
        stroke: new Stroke({
          color: '#f0f',
          width: 1
        })
      })
    }),
    'MultiLineString': new Style({
      stroke: new Stroke({
        color: '#00f',
        width: 3
      })
    }),
    'MultiPolygon': new Style({
      fill: new Fill({
        color: 'rgba(25,120,255,0.5)'
      }),
      stroke: new Stroke({
        color: '#00f',
        width: 1
      })
    })
};
const markerStyle = new Style({
  image: new Icon({
      anchor: [0.5, 1],
      scale: 0.1,
      src: "https://img-premium.flaticon.com/png/512/447/447031.png?token=exp=1621243081~hmac=6e1351bba0a82caf37b634965b0b8ccf"
  })
});
const markerSmallStyle = new Style({
  image: new Circle({
    fill: new Fill({
      color: 'rgba(255,0,0,0.5)'
    }),
    radius: 5,
    stroke: new Stroke({
      color: '#f00',
      width: 1
    })
  })
});
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  view: new View({
    center: [0, 0],
    zoom: 0
  })
});
map.on('click', (e)=>{
  map.forEachFeatureAtPixel(e.pixel, 
    function(feature) {
      console.log(feature.getProperties().name); // TODO: name:en or smth
    }
  );
  console.log(transform(e.coordinate, 'EPSG:3857', 'EPSG:4326'));
});

// ---------------------

let str = "";

try {
  str = fs.readFileSync('routes.gpx', 'utf8'); // openrouteservice
} catch (e) {
  console.log(e);
}
const routeLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature, resolution) {
    if (feature.getGeometry().getType() === 'Point' && resolution < 400) {
      return markerStyle;
    }
    return style[feature.getGeometry().getType()];
  },
});
map.addLayer(routeLayer);

const GPXfeatures = (new GPX()).readFeatures(str, {featureProjection: 'EPSG:3857'});
routeLayer.getSource().addFeatures(GPXfeatures);

// -----------------------

try {
  str = fs.readFileSync('cities.gpx', 'utf8');
} catch (e) {
  console.log(e);
}
const cityLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature) {
    return style[feature.getGeometry().getType()];
  },
});
map.addLayer(cityLayer);

const cityGPXfeatures = (new GPX()).readFeatures(str, {featureProjection: 'EPSG:3857'});
cityLayer.getSource().addFeatures(cityGPXfeatures);

// ----------------------

const hotelLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature, resolution) {
    if (feature.getGeometry().getType() === 'Point') {
      // if (resolution < 100) return markerStyle;
      return markerSmallStyle;
    }
    return style[feature.getGeometry().getType()];
  },
});
map.getLayers().insertAt(1, hotelLayer);

document.getElementById("button").addEventListener("click", 
  function() {
    // Query hotels. Query bounds order s,w,n,e

    let queryStr = '[out:json];';
    
    for (let f of cityGPXfeatures) {
      let coords = transform(f.getGeometry().flatCoordinates, 'EPSG:3857', 'EPSG:4326');
      queryStr += 'node[tourism=hotel](' + (coords[1] - 0.05) + ', ' + (coords[0] - 0.05) + ', ' + 
                  (coords[1] + 0.05) + ', ' + (coords[0] + 0.05) + ');out;';
    }
    
    query_overpass(queryStr, 
      function(error, data) {
        if (!error) {
          const testFeatures = (new GeoJSON()).readFeatures(data, {featureProjection: 'EPSG:3857'});
          hotelLayer.getSource().addFeatures(testFeatures);
        } else {
          console.log(error);
        }
      }
    );
  }
);
