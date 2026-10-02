const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
});
const map = L.map('mapid', {center: [40.7, -94.5], zoom: 3, layers: [streets]});
const baseMaps = {Streets: streets};
if (typeof API_KEY === 'string' && API_KEY) {
  for (const [name, style] of [['Satellite', 'satellite-streets-v11'], ['Light Map', 'light-v10']]) {
    baseMaps[name] = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}?access_token={accessToken}`, {
      attribution: '&copy; Mapbox &copy; OpenStreetMap contributors',
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 18,
      accessToken: API_KEY
    });
  }
}
const allEarthquakes = L.layerGroup().addTo(map);
const tectonicPlates = L.layerGroup().addTo(map);
const majorEarthquakes = L.layerGroup();
L.control.layers(baseMaps, {'Earthquakes': allEarthquakes, 'Tectonic Plates': tectonicPlates, 'Major Earthquakes': majorEarthquakes}).addTo(map);
const colors = ['#98ee00', '#d4ee00', '#eecc00', '#ee9c00', '#ea822c', '#ea2c2c'];

function magnitudeColor(magnitude) {
  return colors[Math.max(0, Math.min(5, Math.floor(magnitude)))];
}

function earthquakeLayer(data) {
  return L.geoJSON(data, {
    pointToLayer(feature, latlng) {
      const magnitude = Number(feature.properties.mag) || 0;
      return L.circleMarker(latlng, {radius: Math.max(2, magnitude * 4), fillColor: magnitudeColor(magnitude), color: '#333', weight: 1, fillOpacity: 0.8});
    },
    onEachFeature(feature, layer) {
      const popup = document.createElement('div');
      popup.textContent = `${feature.properties.place || 'Unknown location'} | Magnitude: ${feature.properties.mag ?? 'Unavailable'}`;
      layer.bindPopup(popup);
    }
  });
}

function showLoadError(message) {
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = message;
  document.body.appendChild(status);
}

fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson')
  .then((response) => {
    if (!response.ok) throw new Error('Earthquake data request failed.');
    return response.json();
  })
  .then((data) => {
    earthquakeLayer(data).addTo(allEarthquakes);
    earthquakeLayer({...data, features: data.features.filter((feature) => Number(feature.properties.mag) >= 4.5)}).addTo(majorEarthquakes);
  })
  .catch(() => showLoadError('Unable to load earthquake data.'));

fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
  .then((response) => {
    if (!response.ok) throw new Error('Plate boundary request failed.');
    return response.json();
  })
  .then((data) => L.geoJSON(data, {style: {color: '#ff6500', weight: 2}}).addTo(tectonicPlates))
  .catch(() => showLoadError('Unable to load tectonic plate boundaries.'));

const legend = L.control({position: 'bottomright'});
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  colors.forEach((color, index) => {
    const swatch = document.createElement('span');
    swatch.style.backgroundColor = color;
    swatch.style.display = 'inline-block';
    swatch.style.width = '12px';
    swatch.style.height = '12px';
    div.appendChild(swatch);
    div.appendChild(document.createTextNode(` ${index}${index < 5 ? '–' + (index + 1) : '+'}`));
    div.appendChild(document.createElement('br'));
  });
  return div;
};
legend.addTo(map);
