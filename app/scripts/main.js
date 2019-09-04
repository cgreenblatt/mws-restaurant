window.addEventListener('DOMContentLoaded', () => {
  const router = {
    init: function init() {
      this.routes = {};
      window.addEventListener('popstate', () => {
        const route = this.getRoute(window.location.hash);
        this.routes[route].callback();
      });
    },
    add: function addRoute({ name, pathname, callback }) {
      if (!this.routes) {
        this.init();
      }
      this.routes[name] = { pathname, callback };
    },
    navigate: function navigate(name, pathname, stateObj, ...rest) {
      window.history.pushState(stateObj, 'details', pathname);
      this.routes[name].callback(rest);
    },
    navigateToURL: function navigateToURL() {
      const route = this.getRoute();
      this.routes[route].callback();
    },
    getRoute: function getPath() {
      const route = window.location.hash ? 'details' : 'home';
      return route;
    },

  };
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
    getRestaurantURL: (name) => `/${name.replace(/ /g, '_')}.html`,
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
            restaurant.restaurantURL = model.getRestaurantURL(restaurant.name);
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
    getRestaurantById(id) {
      return this.data.restaurants[id - 1];
    },
  };

  const map = {
    init: function init(initData, appDiv) {
      const mapSection = document.createElement('section');
      mapSection.id = 'map-container';
      const mapDiv = document.createElement('div');
      mapDiv.id = 'map';
      mapDiv.setAttribute('role', 'application');
      mapSection.appendChild(mapDiv);
      appDiv.append(mapSection);
      this.newMap = this.initMap(initData.coordinates);
      this.markerArray = this.initMarkers(initData.restaurants);
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
          marker,
          displayed: false,
        };
      });
    },
    addAllMarkers: function addAllMarkers() {
      this.markerArray.forEach((marker) => {
        if (marker.displayed) return;
        marker.marker.addTo(this.newMap);
        marker.displayed = true;
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
  };

  const homeScreen = {
    init: function init(appDiv, initData, controller) {
      this.controller = controller;
      this.container = document.createElement('section');
      this.container.id = 'home-screen-container';

      // create filter area
      this.filterDiv = document.createElement('div');
      this.filterDiv.id = 'filter-options';
      this.container.appendChild(this.filterDiv);
      // create restaurant list container
      this.listContainer = document.createElement('div');
      this.listContainer.id = 'restaurants-container';
      this.container.appendChild(this.listContainer);

      this.restaurantElementsArray = this.initRestaurantElementsArray(initData.restaurants);
      this.currentRestaurantUL = this.getRestaurantListElement(this.restaurantElementsArray);
      this.handleFilterSelection = this.handleFilterSelection.bind(this);
      this.addRestaurantListToDom(this.currentRestaurantUL);
      this.filterValues = {};
      this.addFilter(initData.filters.cuisines, 'Cuisines');
      this.addFilter(initData.filters.neighborhoods, 'Neighborhoods');
      return this.container;
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
      li.id = restaurant.id;
      li.className = 'restaurant-card';
      li.appendChild(this.getImageElement(restaurant));
      li.appendChild(name);
      li.appendChild(neighborhood);
      li.appendChild(address);
      li.appendChild(link);
      const button = document.createElement('button');
      button.textContent = 'details';
      button.addEventListener('click', this.detailsButtonHandler.bind(this));
      li.appendChild(button);
      return li;
    },
    detailsButtonHandler: function detailsButtonHandler(e) {
      this.controller.viewDetailsRequest(e.path[1].id);
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
      map.updateMarkers(idArray);
    },
    addFilter: function addFilter(filterOptions, label) {
      this.filterValues[filterOptions.filterKey] = 'All';
      this.comboBox = makeListbox(
        {
          id: filterOptions.filterKey,
          parent: this.filterDiv,
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

  const detailsScreen = {
    init: function init(appDiv) {
      this.appDiv = appDiv;
      this.container = document.createElement('div');
      const message = document.createElement('h2');
      message.textContent = 'hello!!';
      this.container.appendChild(message);
      return this.container;
    },
  };

  const view = {
    init: function init(controller, initData) {
      this.controller = controller;
      this.appDiv = document.getElementById('app');
      map.init(initData, this.appDiv);
      this.homeScreen = homeScreen.init(this.appDiv, initData, controller);
      this.detailsScreen = detailsScreen.init();
      this.currentScreen = null;
    },
    updateRestaurantList: function updateRestaurantList(list) {
      homeScreen.updateRestaurantList(list);
    },
    showDetails: function showDetails(restaurant) {
      if (this.currentScreen === 'details') return;
      if (this.currentScreen === 'home') {
        this.appDiv.replaceChild(this.detailsScreen, this.homeScreen);
      } else {
        this.appDiv.appendChild(this.detailsScreen);
      }
      this.currentScreen = 'details';
    },
    showHome: function showHome() {
      map.addAllMarkers();
      if (this.currentScreen === 'home') return;
      if (this.currentScreen === 'details') {
        this.appDiv.replaceChild(this.homeScreen, this.detailsScreen);
      } else {
        this.appDiv.appendChild(this.homeScreen);
      }
      this.currentScreen = 'home';
    },
  };

  const controller = {
    init: function init() {
      router.add(
        {
          name: 'home',
          pathname: '/',
          callback: this.showHome.bind(this),
        });
      router.add(
        {
          name: 'details',
          pathname: '#details/',
          callback: this.showDetails.bind(this),
        }
      )
      model.initData().then((data) => {
        view.init(this, {
          coordinates: model.getMapCenterCoords(),
          restaurants: data,
          filters: {
            cuisines: this.getFilterOptions('cuisine_type'),
            neighborhoods: this.getFilterOptions('neighborhood'),
          },
        });
        router.navigateToURL();
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
    viewDetailsRequest: (restaurantId) => {
      const restaurant = model.getRestaurantById(restaurantId);
      const name = 'details';
      const pathname = `#details/${restaurant.name.replace(/ /g, '-')}.html`;
      const stateObj = { restaurantId: restaurant.id };
      router.navigate(name, pathname, stateObj, restaurant);
    },
    showDetails: function showDetails(restaurant) {
      view.showDetails(restaurant);
    },
    showHome: function showHome() {
      view.showHome();
    }
  };

  controller.init();
});
