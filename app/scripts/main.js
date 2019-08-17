
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
          this.data.filters = {};
          this.data.restaurants.forEach((restaurant) => {
            restaurant.restaurantURL = model.getRestaurantURL(restaurant.id);
            restaurant.imageURLs = model.getImageURLs(restaurant.id);
          });
          return this.data.restaurants;
        })
        .catch(error => {
          console.log('oops ' + error);
        });
    },
    getValuesFor: function(filterKey) {
      const reducer = (acc, restaurant) => {
        const value = restaurant[filterKey];
        if (acc[value]) {
          acc[value].push(restaurant.id - 1);
        } else {
          acc[value] = [restaurant.id -1];
        }
        return acc;
      }
      let acc = { All: [] };
      for (let i = 0; i < this.data.restaurants.length; i++) {
        acc.All.push(i);
      }
      const values = this.data.restaurants.reduce(reducer, acc);
      this.data.filters[filterKey] = values;
      return values;
    },
    getFilterIndexes(filterValuesSelected, filterKey) {
      const selectedValue = filterValuesSelected[filterKey];
      const filterValuesObject = this.data.filters[filterKey];
      const filterIndexes = filterValuesObject[selectedValue];
      return filterIndexes;
    },
    getIntersection: function(array1, array2) {
        return array2.filter(value => array1.includes(value));
    },
    filterRestaurants: function(filterValuesSelected) {
      const filterKeys = Object.keys(filterValuesSelected);
      let intersectionIndexes = this.getFilterIndexes(filterValuesSelected, filterKeys[0]);
      for (let i = 1; i < filterKeys.length; i++) {
        const nextFilterIndexes = this.getFilterIndexes(filterValuesSelected, filterKeys[i]);
        intersectionIndexes = this.getIntersection(intersectionIndexes, nextFilterIndexes);
      }
      return intersectionIndexes;
    }
  }
  controller = {
    init: function() {
      model.initData().then((data) => {
        //this.restaurants = data;
        view.init({
          coordinates: model.getMapCenterCoords(),
          restaurants: data,
          filters: {
            cuisines: this.getFilterOptions('cuisine_type'),
            neighborhoods: this.getFilterOptions('neighborhood'),
          }
        });
      });
    },
    getFilterOptions: function(filterKey) {
      const values = model.getValuesFor(filterKey);
      return {
        filterKey,
        values,
      }
    },
    filterRestaurants: function(filterValues) {
      const list = model.filterRestaurants(filterValues);
      view.updateRestaurantList(list);
    },
  };

  view = {
    init: function(initData) {
      this.initMap(initData.coordinates);
      this.markerArray = this.createMarkers(initData.restaurants);
      this.addMarkersToMap(this.markerArray);
      this.listContainer = document.getElementById('restaraunts-container');
      //this.restaurantHTMLArray = this.initRestaurantHTMLArray(initData.restaurants);
      this.restaurantElementsArray = this.initRestaurantElementsArray(initData.restaurants);
      //this.addRestaurantsToDOM(this.restaurantHTMLArray);
      this.currentRestaurantUL = this.getRestaurantListElement(this.restaurantElementsArray);
      this.handleFilterSelection = this.handleFilterSelection.bind(this);
      this.addRestaurantListToDom(this.currentRestaurantUL);
      this.filterValues = {};
      this.addFilter(initData.filters.cuisines, 'Cuisines');
      this.addFilter(initData.filters.neighborhoods, 'Neighborhoods');
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
    getImageElement: function(restaurant) {
      const img = document.createElement('img');
      img.alt = restaurant.name;
      img.src = restaurant.imageURLs[1];
      img.srcset = this.getImageSrcset(restaurant);
      img.sizes = this.getImageSizes();
      img.className = 'restaurant-img';
      return img;
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
    getRestaurantLiElement: function(restaurant) {
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
    /*getRestaurantHTML: function(restaurant) {
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
    },*/
    initRestaurantElementsArray: function(restaurants) {
      return restaurants.map(restaurant => this.getRestaurantLiElement(restaurant))
    },
    /*addRestaurantsToDOM: function(restaurantsHTMLArray) {
      this.list.innerHTML = restaurantsHTMLArray.join('');
    },*/
    getRestaurantListElement: function(restaurantElementsArray) {
      // create new list element
      const list = document.createElement('ul');
      this.list = list;
      list.id = 'restaurants-list';

      // add all <li> restaurant elements to new list
      restaurantElementsArray.forEach((element) => {
        list.appendChild(element);
      });

      // return new <ul> element with all restaurant <li>'s
      return list;
      //this.listContainer.appendChild(list);
    },
    addRestaurantListToDom: function(ulElement) {
      this.listContainer.appendChild(ulElement);
    },
    changeDOMRestaurantList: function(newULelement) {
      this.listContainer.replaceChild(newULelement, this.currentRestaurantUL);
      this.currentRestaurantUL = newULelement;
    },
    updateRestaurantList: function(idArray) {
      const filteredElements = idArray.map(id => this.restaurantElementsArray[id]);
      const newUL = this.getRestaurantListElement(filteredElements);
      this.changeDOMRestaurantList(newUL);
    },
    addFilter: function(filterOptions, label) {
      this.filterValues[filterOptions.filterKey] = 'All';
      this.comboBox = makeListbox(
        {
          id: filterOptions.filterKey,
          parentId: 'new-filter-options',
          label: label,
          callback: this.handleFilterSelection,
          values: Object.keys(filterOptions.values),
        });
    },
    handleFilterSelection: function(filterKey, value) {
      this.filterValues[filterKey] = value;
      controller.filterRestaurants(this.filterValues);
    }
  }

  controller.init();
});
