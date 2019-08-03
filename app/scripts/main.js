
window.addEventListener('DOMContentLoaded', (event) => {

  model = {
    init: function() {
      return {map: {center: [40.722216, -73.987501]}}
    }
  }

  controller = {
    init: function() {
      view.init(model.init());
    },
  }

  view = {
    init: function(init) {
      debugger;
      this.newMap = L.map('map', {
        center: init.map.center,
        zoom: 12,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoic3BhcmtwdWciLCJhIjoiY2pqaGphZmZrMHpjZzNxcXN6NnFnODV1MCJ9.mguQAJA30rXv2JkSHo6Ntg',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(this.newMap);
    }
  }


/**
 * @description: Initialize leafconst map, called from HTML.
 */
/*const initMap = () => {
  let newMap;
  newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1Ijoic3BhcmtwdWciLCJhIjoiY2pqaGphZmZrMHpjZzNxcXN6NnFnODV1MCJ9.mguQAJA30rXv2JkSHo6Ntg',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);
}*/
controller.init();
});
