
const router = {
  init() {
    this.routes = {};
    window.addEventListener('popstate', () => {
      this.navigateToURL();
    });
  },
  add({ name, pathname, callback }) {
    if (!this.routes) {
      this.init();
    }
    this.routes[name] = { pathname, callback };
  },
  navigate(name, pathname, stateObj) {
    window.history.pushState(stateObj, name, pathname);
    this.routes[name].callback(pathname);
  },
  navigateToURL() {
    const route = this.getRoute();
    this.routes[route].callback(window.location.hash);
  },
  getRoute() {
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
  getRestaurantURL: (name) => `/images/${name.replace(/ /g, '_')}.html`,
  getImageURLs: (id) => ['-350-small', '-700-medium', '-1050-large', '-1400-xlarge'].map((size) => `images/${id}${size}.jpg`),
  initData() {
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
      });
  },
  getValuesFor(filterKey) {
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
  getIntersection(array1, array2) {
    return array2.filter((value) => array1.includes(value));
  },
  filterRestaurants(filterValuesSelected) {
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
  init(initData, appDiv, markerClickHandler, view) {
    this.mapSection = view.initElement({ tag: 'section', id: 'map-container' });
    this.mapDiv = view.initElement({
      tag: 'div', id: 'map', attributes: [{ name: 'role', value: 'application' }],
      appendTo: this.mapSection,
    });
    appDiv.append(this.mapSection);
    this.newMap = this.initMap(initData.coordinates);
    this.mapCenter = initData.coordinates.map.center;
    this.markerArray = this.initMarkers(initData.restaurants, markerClickHandler);
    const group = new L.featureGroup(this.markerArray.map((m) => m.marker));
    this.bounds = group.getBounds();
  },
  fitBounds() {
    this.newMap.fitBounds(this.bounds);
  },
  focus() {
    this.mapDiv.focus();
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
  initMarkers(restaurants, markerClickHandler) {
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
  addAllMarkers() {
    this.markerArray.forEach((marker) => {
      if (marker.displayed) return;
      marker.marker.addTo(this.newMap);
      marker.displayed = true;
    });
  },
  updateMarkers(idArray) {
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
  updateMap(restaurant) {
    this.updateMarkers([restaurant.id - 1]);
    this.newMap.flyTo([restaurant.latlng.lat, restaurant.latlng.lng], 14);
  },
};

const homeScreen = {
  init(view, initData, controller) {
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
  getImageElement(restaurant) {
    const img = document.createElement('img');
    img.alt = restaurant.name;
    img.src = restaurant.imageURLs[1];
    img.srcset = this.view.getImageSrcset(restaurant);
    img.sizes = '(max-width: 699px) cacl(100vw - 30px), (min-width: 700px) calc(50vw - 15px), (min-width: 1050px) calc((100vw - 70px)/3), (min-width: 1400px) calc((100vw - 110px)/3)';
    img.className = 'restaurant-img';
    return img;
  },
  getRestaurantLiElement(restaurant) {
    const li = this.view.initElement({ tag: 'li', id: restaurant.id, classList: ['card', 'card-restaurant'] });
    li.appendChild(this.getImageElement(restaurant));
    this.view.initElement({ tag: 'h3', textContent: restaurant.name, appendTo: li });
    this.view.initElement({ tag: 'h4', textContent: restaurant.neighborhood, appendTo: li });
    this.view.initElement({ tag: 'h4', textContent: restaurant.address, appendTo: li });
    const button = this.view.initElement({ tag: 'button', className: 'details-button', textContent: 'details', appendTo: li });
    button.addEventListener('click', this.detailsButtonHandler.bind(this));
    return li;
  },
  detailsButtonHandler(e) {
    this.controller.viewDetailsRequest(e.path[1].id);
  },
  initRestaurantElementsArray(restaurants) {
    return restaurants.map((restaurant) => this.getRestaurantLiElement(restaurant));
  },
  getRestaurantListElement(restaurantElementsArray) {
    const list = this.view.initElement({ tag: 'ul', id: 'restaurants-list' });
    // add all <li> restaurant elements to new list
    restaurantElementsArray.forEach((element) => {
      list.appendChild(element);
    });
    return list;
  },
  addRestaurantListToDom(ulElement) {
    this.listContainer.appendChild(ulElement);
  },
  updateRestaurantList(idArray) {
    this.idArray = idArray;
    const filteredElements = idArray.map((id) => this.restaurantElementsArray[id]);
    const newUlElement = this.getRestaurantListElement(filteredElements);
    this.listContainer.replaceChild(newUlElement, this.currentRestaurantUL);
    this.currentRestaurantUL = newUlElement;
    map.updateMarkers(idArray);
  },
  addFilter(filterOptions, label) {
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
  handleFilterSelection(filterKey, value) {
    this.filterValues[filterKey] = value;
    this.controller.filterRestaurants(this.filterValues);
  },
  getIdArray() {
    return this.idArray;
  },
};

const detailsScreen = {
  init(view) {
    this.view = view;
    this.container = view.initElement({ tag: 'div' });
    this.initDetailsSection(view);
    this.initReviewsSection(view);
    return this.container;
  },
  initReviewsSection(view) {
    this.reviewsSection = view.initElement({ tag: 'section', id: 'reviews-container', appendTo: this.container });
    view.initElement({
      tag: 'h2', id: 'reviews-heading', textContent: 'Reviews', appendTo: this.reviewsSection,
    });
    this.reviewsList = view.initElement({ tag: 'ul', id: 'reviews-list', appendTo: this.reviewsSection });
    this.reviewCards = [];
  },
  initDetailsSection(view) {
    this.detailsSection = view.initElement({ tag: 'section', id: 'details-container', appendTo: this.container });
    this.nameHeading = view.initElement({ tag: 'h2', id: 'restaurant-name', appendTo: this.detailsSection,
      attributes: [{ name: 'tabindex', value: '0' }]});
    const col1 = view.initElement({ tag: 'div', id: 'details-col1', appendTo: this.detailsSection });
    this.image = view.initElement({ tag: 'img', classList: ['restaurant-img-d', 'restaurant-img'], appendTo: col1 });
    this.image.sizes = '(max-width: 699px) calc(100vw - 30px), (min-width: 700px) calc(50vw - 15px)';
    this.cuisineHeading = view.initElement({ tag: 'h4', id: 'restaurant-cuisine', appendTo: col1 });
    const col2 = view.initElement({ tag: 'div', id: 'details-col2', appendTo: this.detailsSection });
    this.addressHeading = view.initElement({ tag: 'h4', id: 'restaurant-address', appendTo: col2 });
    this.hoursTable = view.initElement({ tag: 'table', id: 'restaurant-hours', appendTo: col2 });
    this.initDays(view);
  },
  initDays(view) {
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
      day.tdDay = view.initElement({
        tag: 'td', className: 'day', textContent: d, appendTo: day.trDay,
      });
      day.tdHours = view.initElement({ tag: 'td', className: 'hours', appendTo: day.trDay });
      this.hoursTable.appendChild(day.trDay);
    });
  },
  instantiateValues(restaurant) {
    this.nameHeading.textContent = restaurant.name;
    this.image.src = restaurant.imageURLs[1];
    this.image.srcset = this.view.getImageSrcset(restaurant);
    this.cuisineHeading.textContent = restaurant.cuisine_type;
    this.addressHeading.textContent = restaurant.address;
    Object.keys(this.days).forEach((d) => {
      this.days[d].tdHours.innerHTML = restaurant.operating_hours[d]
        ? restaurant.operating_hours[d].replace(/-/g, 'to').replace(',', ',<br>')
        : '';
    });
    this.instantiateReviews(restaurant.reviews);
  },
  instantiateReviews(reviews) {
    // remove reviews list from reviews section
    this.reviewsList.remove();
    let i = 0;
    // instantiate review cards
    for (; i < reviews.length; i += 1) {
      // if there are not enough card elements for review, create new card
      if (this.reviewCards.length === i) this.reviewCards.push(this.newCard());
      // if card is not in DOM, append it to the reviews list
      if (!this.reviewCards[i].parentNode) this.reviewsList.appendChild(this.reviewCards[i]);
      // add values to card
      this.instantiateReview(reviews[i], this.reviewCards[i]);
    }
    // if there are more cards than reviews, remove excess cards from list
    for (; i < this.reviewCards.length; i += 1) {
      this.reviewCards[i].remove();
    }
    // append reviews list to reviews section
    this.reviewsSection.appendChild(this.reviewsList);
  },
  newCard() {
    const li = this.view.initElement({ tag: 'li', className: 'card', appendTo: this.reviewsList });
    const div = this.view.initElement({ tag: 'div', className: 'review-heading', appendTo: li });
    this.view.initElement({ tag: 'h3', className: 'reviewer', appendTo: div });
    this.view.initElement({ tag: 'h4', className: 'review-date', appendTo: div });
    const divRating = this.view.initElement({ tag: 'div', className: 'review-rating-div', appendTo: li });
    this.view.initElement({ tag: 'h3', className: 'review-rating', appendTo: divRating });
    this.view.initElement({ tag: 'span', classList: ['fas', 'star'], appendTo: divRating });
    this.view.initElement({ tag: 'p', className: 'review-text', appendTo: li });
    return li;
  },
  instantiateReview(review, card) {
    card.querySelector('.reviewer').textContent = review.name;
    card.querySelector('.review-date').textContent = review.date;
    card.querySelector('.review-rating').textContent = 'Rating:';
    card.querySelector('.review-text').textContent = review.comments;
    let starString = '';
    for (let i = 0; i < review.rating; i += 1) {
      starString += '\uf005';
    }
    card.querySelector('.star').textContent = starString;
  },
};

const alert = {
  init(controller) {
    this.controller = controller;
    this.map = map;
    this.alertModal = document.querySelector('.alert');
    this.fetchButton = document.getElementById('alert-fetch-button');
    this.closeButton = document.getElementById('alert-close-button');
    this.closeButton.addEventListener('click', this.closeButtonHandler.bind(this));
    this.closeButton.addEventListener('keydown', this.closeKeyDownHandler.bind(this));
    this.fetchButton.addEventListener('click', this.fetchButtonHandler.bind(this));
    this.fetchButton.addEventListener('keydown', this.fetchKeyDownHandler.bind(this));
  },
  hide() {
    this.alertModal.classList.remove('alert-show');
    this.fetchButton.tabIndex = '-1';
    this.closeButton.tabIndex = '-1';
  },
  show() {
    this.alertModal.classList.add('alert-show');
    this.fetchButton.tabIndex = '0';
    this.closeButton.tabIndex = '0';
    this.fetchButton.focus();
  },
  fetchButtonHandler() {
    this.controller.getUpdatesRequest(true);
  },
  closeButtonHandler() {
    this.controller.getUpdatesRequest(false);
  },
  fetchKeyDownHandler(event) {
    switch (event.keyCode) {
    case 13: // enter key pressed
      event.preventDefault();
      this.controller.getUpdatesRequest(true);
      break;
    case 9: // tab key pressed
      if (!event.shiftKey) { // no shift key
        event.preventDefault();
        this.controller.getUpdatesRequest(false);
      }
      break;
    default:
    }
  },
  closeKeyDownHandler(event) {
    switch (event.keyCode) {
    case 13: // enter key pressed
      event.preventDefault();
      this.controller.getUpdatesRequest(false);
      break;
    case 9: // tab key pressed
      if (event.shiftKey) { // with shift key, going out of alert
        event.preventDefault();
        this.controller.getUpdatesRequest(false);
      }
      break;
    default:
    }
  },
};

const view = {
  init(controller, initData) {
    const markerClickHandler = (event) => {
      if (this.currentScreen === 'home') {
        controller.viewDetailsRequest(event.sourceTarget.options.id);
      }
    };
    this.controller = controller;
    this.appDiv = document.getElementById('app');
    map.init(initData, this.appDiv, markerClickHandler, this);
    this.homeScreen = homeScreen.init(this, initData, controller);
    this.detailsScreen = detailsScreen.init(this);
    this.currentScreen = null;
    this.header = document.querySelector('header');
    this.main = document.querySelector('main');
    this.breadcrumb = this.initBreadcrumb();
    alert.init(controller);
  },
  initBreadcrumb() {
    const nav = this.initElement({ tag: 'nav' });
    const breadcrumb = this.initElement({ tag: 'ol', className: 'breadcrumb-ul',
      attributes: [{ name: 'ariaLabel', value: 'breadcrumb' }], appendTo: nav });
    const home = this.initElement({
      tag: 'li', className: 'breadcrumb-li', textContent: 'Home',
      attributes: [{ name: 'role', value: 'link' }, { name: 'tabindex', value: '0' }],
      appendTo: breadcrumb,
    });
    home.addEventListener('click', () => {
      this.controller.viewHomeRequest();
    });
    this.restaurantBreadcrumb = this.initElement({
      tag: 'li', id: 'breadcrumb-restaurant', className: 'breadcrumb-li', appendTo: breadcrumb,
    });
    return nav;
  },
  updateRestaurantList(list) {
    homeScreen.updateRestaurantList(list);
  },
  showDetails(restaurant) {
    if (this.currentScreen === 'details') return;
    map.updateMap(restaurant);
    detailsScreen.instantiateValues(restaurant);
    this.restaurantBreadcrumb.textContent = restaurant.name;
    this.header.appendChild(this.breadcrumb);
    this.main.style.marginTop = `${this.header.offsetHeight}px`;
    if (this.currentScreen === 'home') {
      this.appDiv.replaceChild(this.detailsScreen, this.homeScreen);
      window.scroll({ top: 0, behavior: 'smooth' });
    } else {
      this.appDiv.appendChild(this.detailsScreen);
    }
    this.currentScreen = 'details';
  },
  showHome() {
    if (this.currentScreen === 'home') return;
    map.updateMarkers(homeScreen.getIdArray());
    map.fitBounds();
    if (this.currentScreen === 'details') {
      this.breadcrumb.remove();
      this.main.style.marginTop = `${this.header.offsetHeight}px`;
      this.appDiv.replaceChild(this.homeScreen, this.detailsScreen);
    } else {
      this.appDiv.appendChild(this.homeScreen);
    }
    this.currentScreen = 'home';
  },
  showAlert() {
    alert.show();
    this.appDiv.classList.add('app-opacity');
  },
  hideAlert(focusMap=true) {
    alert.hide();
    this.appDiv.classList.remove('app-opacity');
    if (focusMap) {
      map.focus();
    }
  },
  initElement: ({
    tag, id, className, classList, textContent, attributes=[], appendTo
  }) => {
    if (!tag) return null;
    const el = document.createElement(tag);
    if (id) el.id = id;
    if (className) el.className = className;
    if (classList) {
      classList.forEach((c) => el.classList.add(c));
    }
    if (textContent) el.textContent = textContent;
    attributes.forEach(attr => {
      el.setAttribute(attr.name, attr.value)
    })
    if (appendTo) appendTo.appendChild(el);
    return el;
  },
  getImageSrcset(restaurant) {
    return restaurant.imageURLs.map((url) => `${url} ${url.split('-')[1]}w`).join(', ');
  },
};

const controller = {
  init() {
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
    // return this promise from init
    return model.initData().then((data) => {
      view.init(this, {
        coordinates: model.getMapCenterCoords(),
        restaurants: data,
        filters: {
          cuisines: this.getFilterOptions('cuisine_type'),
          neighborhoods: this.getFilterOptions('neighborhood'),
        },
      });
      router.navigateToURL();
    }).catch((error) => {
      //TODO put in error message
      console.log('oops ' + error);
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
  showDetails(pathname) {
    const restaurantId = parseInt(pathname.split('/')[1]);
    view.showDetails(model.getRestaurantById(restaurantId));
  },
  viewHomeRequest: () => {
    router.navigate('home', '/', {});
  },
  showHome() {
    view.showHome();
  },
  swUpdateReady(sw) {
    this.swUpdate = sw;
    view.showAlert();
  },
  getUpdatesRequest(confirmed) {
    if (!confirmed) {
      view.hideAlert(true);
      return;
    }
    view.hideAlert(false);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    this.swUpdate.postMessage({ request: 'skipWaiting' });
    this.swUpdate = undefined;
  },
};

/*
 * @description: Creates a promise that resolves when the service worker's state is 'activated'
 * @param {ServiceWorkerRegistration object} registration - The registration object returned from
 * registering the service worker
 * @return A Promise that resolves when the service worker's state is 'activated'
 * from https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker/onstatechange
 */
const swReady = (registration) => {
  // get service worker from registration object
  let serviceWorker;
  if (registration.installing) {
    serviceWorker = registration.installing;
  } else if (registration.waiting) {
    serviceWorker = registration.waiting;
  } else if (registration.active) {
    serviceWorker = registration.active;
  }

  /* from https://github.com/jakearchibald/svgomg/blob/master/src/js/page/utils.js#L7 */
  return new Promise((resolve) => {
    function checkState(state) {
      if (state === 'activated') {
        resolve(state);
      }
    }
    serviceWorker.addEventListener('statechange', (e) => {
      checkState(e.target.state);
    });

    checkState(serviceWorker.state);
  });
};

const swUpdateWaiting = (reg) => new Promise((resolve) => {
  const trackInstallation = (sw) => {
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed') {
        resolve(sw);
      }
    });
  };

  if (reg.waiting) {
    resolve(reg.waiting);
  }
  if (reg.installing) {
    trackInstallation(reg.installing);
  } else {
    reg.addEventListener('updatefound', () => {
      trackInstallation(reg.installing);
    });
  }
});

/*
 * @description: Creates a promise that resolves when the DOM content is loaded
 * @return: A promise that resolves when the DOM content is loaded
 * from https://github.com/jakearchibald/svgomg/blob/master/src/js/page/utils.js#L7
 */
const domReady = () => new Promise((resolve) => {
  function checkState() {
    if (document.readyState !== 'loading') {
      resolve();
    }
  }
  document.addEventListener('readystatechange', checkState);
  checkState();
});


const initApp = (registerServiceWorker = false) => {
  if (!registerServiceWorker || !('serviceWorker' in navigator)) {
    return domReady()
      .then(() => controller.init())
      .catch((error) => {
      //TODO display error to user
        console.log('An error occurred: ', error);
      });
  }

  // if page not controlled by service worker, register the service worker,
  // then when the service worker is
  // activated and the DOM content is loaded start the controller
  if (!navigator.serviceWorker.controller) {
    return navigator.serviceWorker.register('sw.js')
      .then(swReady)
      .then(domReady)
      .then(() => controller.init())
      .catch((error) => {
        //TODO display error to user
        console.log('An error occurred: ', error);
      });
  }  // page is controlled by service worker
  const promises = [];
  promises.push(navigator.serviceWorker.register('sw.js').then(swUpdateWaiting));
  promises.push(domReady().then(() => controller.init()));
  // let controller know sw update is ready after controller.init is completed
  return Promise.all(promises)
    .then((results) => controller.swUpdateReady(results[0]))
    .catch((error) => {
      //TODO display error to user
      console.log('An error occurred: ', error);
    });
};

initApp();
