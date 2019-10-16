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
    init: function init(initData, appDiv, markerClickHandler, view) {
      this.mapSection = view.initElement({ tag: 'section', id: 'map-container' });
      const mapDiv = view.initElement({ tag: 'div', id: 'map', role: 'application', appendTo: this.mapSection });
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
    init: function init(view, initData, controller) {
      this.view = view;
      this.controller = controller;
      this.container = view.initElement({ tag: 'section', id: 'home-screen-container' });
      // create filter area
      this.filterDiv = view.initElement({ tag: 'div', id: 'filter-options', appendTo: this.container });
      // create restaurant list container
      this.listContainer = view.initElement({ tag: 'div', id: 'restaurants-container', appendTo: this.container });
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
      const li = this.view.initElement({ tag: 'li', id: restaurant.id, className: 'restaurant-card' });
      li.appendChild(this.getImageElement(restaurant));
      const name = this.view.initElement({ tag: 'h3', textContent: restaurant.name, appendTo: li});
      const neighborhood = this.view.initElement({ tag: 'h4', textContent: restaurant.neighborhood, appendTo: li });
      const address = this.view.initElement({ tag: 'h4', textContent: restaurant.address, appendTo: li });
      const button = this.view.initElement({ tag: 'button', textContent: 'details', appendTo: li });
      button.addEventListener('click', this.detailsButtonHandler.bind(this));
      return li;
    },
    detailsButtonHandler: function detailsButtonHandler(e) {
      this.controller.viewDetailsRequest(e.path[1].id);
    },
    initRestaurantElementsArray: function initRestaurantElementsArray(restaurants) {
      return restaurants.map((restaurant) => this.getRestaurantLiElement(restaurant));
    },
    getRestaurantListElement: function getRestaurantListElement(restaurantElementsArray) {
      const list = this.view.initElement({ tag: 'ul', id: 'restaurants-list' });
      // add all <li> restaurant elements to new list
      restaurantElementsArray.forEach((element) => {
        list.appendChild(element);
      });
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
    init: function init(view) {
      this.container = view.initElement({ tag: 'div', id: 'restaurant-container' });
      this.detailsSection = view.initElement({ tag: 'section', appendTo: this.container });
      this.nameHeading = view.initElement({ tag: 'h2', id: 'restaurant-name', appendTo: this.detailsSection });
      this.image = view.initElement({ tag: 'img', className: 'restaurant-img', appendTo: this.detailsSection });
      this.cuisineHeading = view.initElement({ tag: 'h4', id: 'restaurant-cuisine', appendTo: this.detailsSection });
      this.addressHeading = view.initElement({ tag: 'h4', id: 'restaurant-address', appendTo: this.detailsSection });
      this.hoursTable = view.initElement({ tag: 'table', id: 'restaurant-hours', appendTo: this.detailsSection });
      this.initDays();
      return this.container;
    },
    initBreadcrumb: function initBreadcrumb() {
      this.nav = document.createElement('nav');
      this.breadcrumb = document.createElement('ul');
      this.breadcrumb.className = 'breadcrumb';
      const home = document.createElement('li');
      home.textContent = 'Home';
    },
    initDays: function initDays() {
      this.days = {
        Monday: {},
        Tuesday: {},
        Wednesday: {},
        Thursday: {},
        Friday: {},
        Saturday: {},
        Sunday: {},
      };
      Object.keys(this.days).forEach((d) => {
        const day = this.days[d];
        day.trDay = view.initElement({ tag: 'tr' });
        day.tdDay = view.initElement({ tag: 'td', className: 'day', textContent: d, appendTo: day.trDay });
        day.tdHours = view.initElement({ tag: 'td', className: 'hours', appendTo: day.trDay });
        this.hoursTable.appendChild(day.trDay);
      });
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
      map.init(initData, this.appDiv, markerClickHandler, this);
      this.homeScreen = homeScreen.init(this, initData, controller);
      this.detailsScreen = detailsScreen.init(this);
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
    initElement: ({ tag, id, className, textContent, role, appendTo }) => {
      if (!tag) return null;
      const el = document.createElement(tag);
      if (id) el.id = id;
      if (className) el.className = className;
      if (textContent) el.textContent = textContent;
      if (role) el.setAttribute('role', role);
      if (appendTo) appendTo.appendChild(el);
      return el;
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
