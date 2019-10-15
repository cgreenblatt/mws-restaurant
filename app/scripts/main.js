window.addEventListener('DOMContentLoaded', () => {
  const router = {
    init: function init() {
      this.routes = {};
      window.addEventListener('popstate', (e) => {
        this.navigateToURL();
      });
    },
    add: function addRoute({ name, pathname, callback }) {
      if (!this.routes) {
        this.init();
      }
      this.routes[name] = { pathname, callback };
    },
    navigate: function navigate(name, pathname, stateObj) {
      window.history.pushState(stateObj, 'details', pathname);
      this.routes[name].callback(pathname);
    },
    navigateToURL: function navigateToURL() {
      const route = this.getRoute();
      this.routes[route].callback(window.location.hash);
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
    init: function init(initData, appDiv, markerClickHandler) {
      this.mapSection = document.createElement('section');
      this.mapSection.id = 'map-container';
      const mapDiv = document.createElement('div');
      mapDiv.id = 'map';
      mapDiv.setAttribute('role', 'application');
      this.mapSection.appendChild(mapDiv);
      appDiv.append(this.mapSection);
      this.newMap = this.initMap(initData.coordinates);
      this.mapCenter = initData.coordinates.map.center;
      this.markerArray = this.initMarkers(initData.restaurants, markerClickHandler);
      const group = new L.featureGroup(this.markerArray.map((m) => m.marker));
      this.bounds = group.getBounds();
    },
    fitBounds: function fitBounds() {
      this.newMap.fitBounds(this.bounds);
    },
    initMap: (coordinates) => {
      const newMap = L.map('map', {
        center: coordinates.map.center,
        zoom: 10,
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
    initMarkers: function initMarkers(restaurants, markerClickHandler) {
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
    updateMap: function updateMap(restaurant) {
      this.updateMarkers([restaurant.id - 1]);
      this.newMap.panTo([restaurant.latlng.lat, restaurant.latlng.lng]);
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
      this.idArray = initData.restaurants.map((r) => r.id - 1);
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
      const li = document.createElement('li');
      li.id = restaurant.id;
      li.className = 'restaurant-card';
      li.appendChild(this.getImageElement(restaurant));
      li.appendChild(name);
      li.appendChild(neighborhood);
      li.appendChild(address);
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
      this.idArray = idArray;
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
        },
      );
    },
    handleFilterSelection: function handleFilterSelection(filterKey, value) {
      this.filterValues[filterKey] = value;
      this.controller.filterRestaurants(this.filterValues);
    },
    getIdArray: function getIdArray() {
      return this.idArray;
    }
  };

  const detailsScreen = {
    init: function init(appDiv) {
      this.appDiv = appDiv;
      this.container = document.createElement('div');
      this.container.id = 'restaurant-container';
      this.detailsSection = document.createElement('section');
      this.container.appendChild(this.detailsSection);

      this.nameHeading = document.createElement('h2');
      this.nameHeading.id = 'restaurant-name';
      this.image = document.createElement('img');
      this.image.className = 'restaurant-img';
      this.cuisineHeading = document.createElement('h4');
      this.cuisineHeading.id = 'restaurant-cuisine';
      this.addressHeading = document.createElement('h4');
      this.addressHeading.id = 'restaurant-address';
      this.hoursTable = document.createElement('table');
      this.hoursTable.id = 'restaurant-hours';
      this.days = {
        Monday: {},
        Tuesday: {},
        Wednesday: {},
        Thursday: {},
        Friday: {},
        Saturday: {},
        Sunday: {},
      };

      Object.keys(this.days).map((d) => {
        const day = this.days[d];
        day.trDay = document.createElement('tr');
        day.tdDay = document.createElement('td');
        day.tdDay.textContent = d;
        day.tdDay.className = 'day';
        day.tdHours = document.createElement('td');
        day.tdHours.className = 'hours';

        day.trDay.appendChild(day.tdDay);
        day.trDay.appendChild(day.tdHours);
        this.hoursTable.appendChild(day.trDay);
      });

      this.detailsSection.appendChild(this.nameHeading);
      this.detailsSection.appendChild(this.image);
      this.detailsSection.appendChild(this.cuisineHeading);
      this.detailsSection.appendChild(this.addressHeading);
      this.detailsSection.appendChild(this.hoursTable);

      return this.container;
    },
    instantiateValues: function instantiateValues(restaurant) {
      this.nameHeading.textContent = restaurant.name;
      this.image.src = restaurant.imageURLs[1];
      this.cuisineHeading.textContent = restaurant.cuisine_type;
      this.addressHeading.textContent = restaurant.address;
      Object.keys(this.days).map((d) => {
        this.days[d].tdHours.textContent = restaurant.operating_hours[d]
          ? restaurant.operating_hours[d].replace(/-/g, 'to')
          : '';
      });
    },
  };

  const view = {
    init: function init(controller, initData) {
      const markerClickHandler = (event)  => {
        if (this.currentScreen === 'home') {
         controller.viewDetailsRequest(event.sourceTarget.options.id);
       }
      }
      this.controller = controller;
      this.appDiv = document.getElementById('app');
      map.init(initData, this.appDiv, markerClickHandler);
      this.homeScreen = homeScreen.init(this.appDiv, initData, controller);
      this.detailsScreen = detailsScreen.init();
      this.currentScreen = null;
      this.headerHeight = document.querySelector('header').offsetHeight;
    },
    updateRestaurantList: function updateRestaurantList(list) {
      homeScreen.updateRestaurantList(list);
    },
    showDetails: function showDetails(restaurant) {
      map.updateMap(restaurant);
      detailsScreen.instantiateValues(restaurant);
      if (this.currentScreen === 'home') {
        this.appDiv.replaceChild(this.detailsScreen, this.homeScreen);
        window.scrollTo(0, -this.headerHeight)
      } else {
        this.appDiv.appendChild(this.detailsScreen);
      }
      this.currentScreen = 'details';
    },
    showHome: function showHome() {
      if (this.currentScreen === 'home') return;
      map.updateMarkers(homeScreen.getIdArray());
      map.fitBounds();
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
        },
      );
      router.add(
        {
          name: 'details',
          pathname: '#details/',
          callback: this.showDetails.bind(this),
        },
      );
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
      const pathname = `#details/${restaurantId}/${restaurant.name.replace(/ /g, '_')}.html`;
      router.navigate('details', pathname, {});
    },
    showDetails: function showDetails(pathname) {
      const restaurantId = parseInt(pathname.split('/')[1]);
      view.showDetails(model.getRestaurantById(restaurantId));
    },
    showHome: function showHome() {
      view.showHome();
    },
  };

  controller.init();
});
