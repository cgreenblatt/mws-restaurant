window.addEventListener('DOMContentLoaded', event => {
  model = {
    getURL() {
      const port = 9000; // Change this to your server port

      return `http://localhost:${port}/data/restaurants.json`;
    },

    getMapCenterCoords: function () {
      return {
        map: {
          center: [40.722216, -73.987501]
        }
      };
    },
    getRestaurantURL: function (id) {
      return `./restaurant.html?id=${id}`;
    },
    initData: function () {
      return fetch(model.getURL()).then(response => {
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        return response.json();
      }).then(json => {
        this.data = json;
        this.data.restaurants.forEach(restaurant => {
          restaurant.url = model.getRestaurantURL(restaurant.id);
        });
        console.log(this.data);
        return this.data.restaurants;
      }).catch(error => {
        console.log('opps ' + error);
      });
    }
  };
  controller = {
    init: function () {
      model.initData().then(data => {
        view.init({
          coordinates: model.getMapCenterCoords(),
          restaurants: data
        });
      });
    }
  };
  view = {
    init: function (initData) {
      this.initMap(initData.coordinates);
      this.addMarkers(initData.restaurants);
    },
    initMap: function (init) {
      this.newMap = L.map('map', {
        center: init.map.center,
        zoom: 12,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoic3BhcmtwdWciLCJhIjoiY2pqaGphZmZrMHpjZzNxcXN6NnFnODV1MCJ9.mguQAJA30rXv2JkSHo6Ntg',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' + '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(this.newMap);
    },

    addMarkers(restaurants) {
      restaurants.forEach(restaurant => {
        const marker = view.addMarker(restaurant);
        view.addMarkerClickHandler(marker);
      });
    },

    addMarker: function (restaurant) {
      // https://leafletjs.com/reference-1.3.0.html#marker
      const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
        title: restaurant.name,
        alt: restaurant.name,
        url: restaurant.url,
        id: restaurant.id
      });
      marker.addTo(view.newMap);
      return marker;
    },
    addMarkerClickHandler: marker => {
      marker.on('click', view.markerClickHandler);
    },
    markerClickHandler: event => {
      console.log('id is ' + event.sourceTarget.options.id);
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

  };
  controller.init();
});
//# sourceMappingURL=main.js.map
