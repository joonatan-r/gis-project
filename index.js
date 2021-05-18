import 'ol/ol.css';
import GPX from 'ol/format/GPX';
import GeoJSON from 'ol/format/GeoJSON';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import { transform } from 'ol/proj';

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
    })
};
const markerStyle = new Style({
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
    center: [7659812, 4669423],
    zoom: 4
  })
});
map.on('click', (e)=>{
  map.forEachFeatureAtPixel(e.pixel, 
    function(feature) {
      const props = feature.getProperties();
      let info = '';

      if (props.name) {
        info = props.name;
      } else if (props.tags && props.tags.name) {
        info = props.tags.name;
      }
      if (!info) {
        info = 'No name available';
      }
      document.getElementById('infotext').innerHTML = info;
      document.getElementById('info').style.display = 'inline';
    },
    {
      layerFilter: function(layer) {
        if (layer.get('name') === 'routes') return false;
        return true; 
      }
    }
  );
  console.log(transform(e.coordinate, 'EPSG:3857', 'EPSG:4326'));
});

// ---------------------

let str = "";

try {
  str = fs.readFileSync('routes.gpx', 'utf8');
} catch (e) {
  console.log(e);
}
const routeLayer = new VectorLayer({
  source: new VectorSource(),
  style: function (feature) {
    return style[feature.getGeometry().getType()];
  },
});
routeLayer.set('name', 'routes');
map.addLayer(routeLayer);

const routeGPXfeatures = (new GPX()).readFeatures(str, {featureProjection: 'EPSG:3857'});
routeLayer.getSource().addFeatures(routeGPXfeatures);

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
  style: function (feature) {
    if (feature.getGeometry().getType() === 'Point') {
      return markerStyle;
    }
    return style[feature.getGeometry().getType()];
  },
});
map.getLayers().insertAt(1, hotelLayer);

document.getElementById('button').addEventListener('click', 
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
          const hotelFeatures = (new GeoJSON()).readFeatures(data, {featureProjection: 'EPSG:3857'});
          hotelLayer.getSource().addFeatures(hotelFeatures);
        } else {
          console.log(error);
        }
      }
    );
  }
);
