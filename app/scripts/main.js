
window.addEventListener('DOMContentLoaded', (event) => {

  model = {
    getURL() {
      const port = 9000 // Change this to your server port
      return `http://localhost:${port}/data/restaurants.json`;
    },
    getMapCenterCoords: () => (
      {
        map: {
          center: [40.722216, -73.987501]
        }
      }),
    getRestaurantURL: (id) => `./restaurant.html?id=${id}`,
    getImageURLs: (id) => ['-350-small', '-700-medium', '-1050-large', '-1400-xlarge'].map(size => `/images/${id}${size}.jpg`),
    initData: function() {
      return fetch(this.getURL())
        .then(response => {
          if (!response.ok)
            throw(new Error(`Error: ${response.statusText}`));
          return response.json();
        })
        .then((json) => {
          this.data = json;
          this.data.restaurants.forEach((restaurant) => {
            restaurant.restaurantURL = model.getRestaurantURL(restaurant.id);
            restaurant.imageURLs = model.getImageURLs(restaurant.id);
          });
          return this.data.restaurants;
        })
        .catch(error => {
          console.log('oops ' + error);
        });
    }
  }

  controller = {
    init: function() {
      model.initData().then((data) => {
        view.init({
          coordinates: model.getMapCenterCoords(),
          restaurants: data,
        });
      });
    }
  };

  view = {
    init: function(initData) {
      this.initMap(initData.coordinates);
      this.markerArray = this.createMarkers(initData.restaurants);
      this.addMarkersToMap(this.markerArray);
      this.list = document.getElementById('restaurants-list');
      this.restaurantHTMLArray = this.initRestaurantHTMLArray(initData.restaurants);
      this.addRestaurantsToDOM(this.restaurantHTMLArray);
    },
    initMap: function(init) {
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
    },
    createMarkers: function(restaurants) {
      return restaurants.map((restaurant) =>
        new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
          {
            title: restaurant.name,
            alt: restaurant.name,
            url: restaurant.restaurantURL,
            id: restaurant.id,
          }).on('click', this.markerClickHandler)
        )
    },
    addMarkersToMap: function(markers) {
      markers.forEach(marker => marker.addTo(this.newMap))
    },
    markerClickHandler: (event) => {
      console.log('id is ' + event.sourceTarget.options.id);
    },
    getImageHTML: function (restaurant) {
      return `<img src="${restaurant.imageURLs[1]}" srcset="${this.getImageSrcset(restaurant)}" sizes="${this.getImageSizes()}" alt="${restaurant.name}" class="restaurant-img">\n`
    },
    getImageSrcset: restaurant => restaurant.imageURLs.map(url => `${url} ${url.split('-')[1]}w`).join(', '),
    getImageSizes: () =>
        '(min-width: 700px) 45.5vw, ' +
        '(min-width: 1050px) 29.333vw, ' +
        '(min-width: 1400px) 21.25vw, ' +
        '(min-width: 1750px) 16.4vw',
    getRestaurantHTML: function(restaurant) {
      return `
      <li class="restaurant-card" />
        ${this.getImageHTML(restaurant)}
        <h3>${restaurant.name}</h3>
        <h4>${restaurant.neighborhood}</h4>
        <h4>${restaurant.address}</h4>
        <a href="${restaurant.restaurantURL}" aria-label="${restaurant.name} details">View Details</a>
      </li>`
    },
    initRestaurantHTMLArray: function(restaurants) {
      return restaurants.map(restaurant => this.getRestaurantHTML(restaurant))
    },
    addRestaurantsToDOM: function(restaurantsHTMLArray) {
      this.list.innerHTML = restaurantsHTMLArray.join('');
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
