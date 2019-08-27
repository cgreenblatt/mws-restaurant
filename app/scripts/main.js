
window.addEventListener('DOMContentLoaded', (event) => {

  const model = {
    getURL() {
      const port = 9000; // Change this to your server port
      return `http://localhost:${port}/data/restaurants.json`;
    },
    getMapCenterCoords: () => (
      {
        map: {
          center: [40.722216, -73.987501],
        },
      }),
    getRestaurantURL: (id) => `./restaurant.html?id=${id}`,
    getImageURLs: (id) => ['-350-small', '-700-medium', '-1050-large', '-1400-xlarge'].map((size) => `/images/${id}${size}.jpg`),
    initData: function initData() {
      return fetch(this.getURL())
        .then((response) => {
          if (!response.ok) throw new Error(`Error: ${response.statusText}`);
          return response.json();
        })
        .then((json) => {
          this.data = json;
          this.data.filters = {};
          this.data.restaurants.forEach((restaurant) => {
            restaurant.restaurantURL = model.getRestaurantURL(restaurant.id);
            restaurant.imageURLs = model.getImageURLs(restaurant.id);
          });
          return this.data.restaurants;
        })
        .catch((error) => {
          console.log('oops ' + error);
        });
    },
    getValuesFor: function getValuesFor(filterKey) {
      const reducer = (acc, restaurant) => {
        const value = restaurant[filterKey];
        if (acc[value]) {
          acc[value].push(restaurant.id - 1);
        } else {
          acc[value] = [restaurant.id - 1];
        }
        return acc;
      };
      let acc = { All: [] };
      for (let i = 0; i < this.data.restaurants.length; i += 1) {
        acc.All.push(i);
      }
      acc = this.data.restaurants.reduce(reducer, acc);
      this.data.filters[filterKey] = acc;
      return acc;
    },
    getFilterIndexes(filterValuesSelected, filterKey) {
      const selectedValue = filterValuesSelected[filterKey];
      const filterValuesObject = this.data.filters[filterKey];
      const filterIndexes = filterValuesObject[selectedValue];
      return filterIndexes;
    },
    getIntersection: function getIntersection(array1, array2) {
      return array2.filter((value) => array1.includes(value));
    },
    filterRestaurants: function filterRestaurants(filterValuesSelected) {
      const filterKeys = Object.keys(filterValuesSelected);
      let intersectionIndexes = this.getFilterIndexes(filterValuesSelected, filterKeys[0]);
      for (let i = 1; i < filterKeys.length; i += 1) {
        const nextFilterIndexes = this.getFilterIndexes(filterValuesSelected, filterKeys[i]);
        intersectionIndexes = this.getIntersection(intersectionIndexes, nextFilterIndexes);
      }
      return intersectionIndexes;
    },
  };

  const view = {
    init: function init(controller, initData) {
      this.controller = controller;
      this.newMap = this.initMap(initData.coordinates);
      this.markerArray = this.initMarkers(initData.restaurants);
      this.listContainer = document.getElementById('restaurants-container');
      this.restaurantElementsArray = this.initRestaurantElementsArray(initData.restaurants);
      this.currentRestaurantUL = this.getRestaurantListElement(this.restaurantElementsArray);
      this.handleFilterSelection = this.handleFilterSelection.bind(this);
      this.addRestaurantListToDom(this.currentRestaurantUL);
      this.filterValues = {};
      this.addFilter(initData.filters.cuisines, 'Cuisines');
      this.addFilter(initData.filters.neighborhoods, 'Neighborhoods');
    },
    initMap: (coordinates) => {
      const newMap = L.map('map', {
        center: coordinates.map.center,
        zoom: 12,
        scrollWheelZoom: false,
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoic3BhcmtwdWciLCJhIjoiY2pqaGphZmZrMHpjZzNxcXN6NnFnODV1MCJ9.mguQAJA30rXv2JkSHo6Ntg',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, '
          + '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, '
          + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets',
      }).addTo(newMap);
      return newMap;
    },
    initMarkers: function initMarkers(restaurants) {
      function markerClickHandler(event) {
        console.log('id is ' + event.sourceTarget.options.id);
      }
      return restaurants.map((restaurant) => {
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
          {
            title: restaurant.name,
            alt: restaurant.name,
            url: restaurant.restaurantURL,
            id: restaurant.id,
          });
        marker.on('click', markerClickHandler);
        return {
          marker: marker.addTo(this.newMap),
          displayed: true,
        };
      });
    },
    updateMarkers: function updateMarkers(idArray) {
      this.markerArray.forEach((marker, index) => {
        if (!marker.displayed && idArray.includes(index)) {
          marker.marker.addTo(this.newMap);
          marker.displayed = true;
          return;
        }
        if (marker.displayed && !idArray.includes(index)) {
          marker.marker.remove();
          marker.displayed = false;
        }
      });
    },
    getImageElement: function getImageElement(restaurant) {
      const img = document.createElement('img');
      img.alt = restaurant.name;
      img.src = restaurant.imageURLs[1];
      img.srcset = restaurant.imageURLs.map((url) => `${url} ${url.split('-')[1]}w`).join(', ');
      img.sizes = '(min-width: 700px) 45.5vw, (min-width: 1050px) 29.333vw, '
        + '(min-width: 1400px) 21.25vw, (min-width: 1750px) 16.4vw';
      img.className = 'restaurant-img';
      return img;
    },
    getRestaurantLiElement: function getRestaurantLIElement(restaurant) {
      const name = document.createElement('h3');
      name.textContent = restaurant.name;
      const neighborhood = document.createElement('h4');
      neighborhood.textContent = restaurant.neighborhood;
      const address = document.createElement('h4');
      address.textContent = restaurant.address;
      const link = document.createElement('a');
      link.href = restaurant.restaurantURL;
      link.textContent = 'View Details';
      const li = document.createElement('li');
      li.className = 'restaurant-card';
      li.appendChild(this.getImageElement(restaurant));
      li.appendChild(name);
      li.appendChild(neighborhood);
      li.appendChild(address);
      li.appendChild(link);
      return li;
    },
    initRestaurantElementsArray: function initRestaurantElementsArray(restaurants) {
      return restaurants.map((restaurant) => this.getRestaurantLiElement(restaurant));
    },
    getRestaurantListElement: (restaurantElementsArray) => {
      // create new list element
      const list = document.createElement('ul');
      list.id = 'restaurants-list';
      // add all <li> restaurant elements to new list
      restaurantElementsArray.forEach((element) => {
        list.appendChild(element);
      });
      // return new <ul> element with all restaurant <li>'s
      return list;
    },
    addRestaurantListToDom: function addRestaurantListToDom(ulElement) {
      this.listContainer.appendChild(ulElement);
    },
    updateRestaurantList: function updateRestaurantList(idArray) {
      const filteredElements = idArray.map((id) => this.restaurantElementsArray[id]);
      const newUlElement = this.getRestaurantListElement(filteredElements);
      this.listContainer.replaceChild(newUlElement, this.currentRestaurantUL);
      this.currentRestaurantUL = newUlElement;
      this.updateMarkers(idArray);
    },
    addFilter: function addFilter(filterOptions, label) {
      this.filterValues[filterOptions.filterKey] = 'All';
      this.comboBox = makeListbox(
        {
          id: filterOptions.filterKey,
          parentId: 'filter-options',
          label,
          callback: this.handleFilterSelection,
          values: Object.keys(filterOptions.values),
        }
      );
    },
    handleFilterSelection: function handleFilterSelection(filterKey, value) {
      this.filterValues[filterKey] = value;
      this.controller.filterRestaurants(this.filterValues);
    },
  };

  const controller = {
    init: function init() {
      model.initData().then((data) => {
        view.init(this, {
          coordinates: model.getMapCenterCoords(),
          restaurants: data,
          filters: {
            cuisines: this.getFilterOptions('cuisine_type'),
            neighborhoods: this.getFilterOptions('neighborhood'),
          },
        });
      });
    },
    getFilterOptions: (filterKey) => {
      const values = model.getValuesFor(filterKey);
      return {
        filterKey,
        values,
      };
    },
    filterRestaurants: (filterValues) => {
      const list = model.filterRestaurants(filterValues);
      view.updateRestaurantList(list);
    },
  };


  controller.init();
});
