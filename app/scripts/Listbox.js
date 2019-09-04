const makeListbox = (function () {

  // Define values for keycodes
  const VK_TAB = 9;
  const VK_ENTER = 13;
  const VK_ESC = 27;
  const VK_UP = 38;
  const VK_DOWN = 40;

  class Button {
    constructor(buttonLabel, listboxId, labelId, clickHandler, keydownHandler) {
      this.buttonEl = document.createElement('button');
      this.buttonEl.innerHTML = '<i class="fas fa-angle-down"></i>';
      this.buttonEl.id = `${listboxId}-button`;
      this.buttonEl.className = 'listbox-button';
      this.buttonEl.setAttribute('aria-haspopup', 'listbox');
      this.buttonEl.setAttribute('aria-expanded', false);
      this.buttonEl.addEventListener('click', clickHandler);
      this.buttonEl.addEventListener('keydown', keydownHandler);
      this.buttonEl.setAttribute('aria-labelledby', labelId);
      this.expanded = false;
    }

    append(parent) {
      parent.appendChild(this.buttonEl);
    }

    handleExpand() {
      this.buttonEl.setAttribute('aria-expanded', true);
      this.setChevronUp();
    }

    handleCollapse() {
      this.buttonEl.setAttribute('aria-expanded', false);
      this.setChevronDown();
    }

    setAriaActiveDescendant(activeDescendant) {
      this.buttonEl.setAttribute('aria-activedescendant', activeDescendant.id);
      this.buttonEl.setAttribute('aria-owns', activeDescendant.id);
      const up = this.buttonEl.innerHTML.includes('fas fa-angle-up');
      this.buttonEl.innerHTML = `${activeDescendant.textContent} <i class='fas fa-angle-${up ? 'up' : 'down'}'></i>`;
    }

    setFocus() {
      this.buttonEl.focus();
      this.handleCollapse();
    }

    setChevronUp() {
      this.buttonEl.innerHTML = `${this.buttonEl.textContent} <i class="fas fa-angle-up"></i>`;
    }

    setChevronDown() {
      this.buttonEl.innerHTML = `${this.buttonEl.textContent} <i class="fas fa-angle-down"></i>`;
    }
  }

  class List {
    constructor(values, listboxId,
      mouseenterHandler, clickHandler, documentClickHandler) {
      this.documentClickHandler = documentClickHandler;
      this.listboxId = listboxId;
      this.ulEl = document.createElement('ul');
      this.ulEl.id = `${listboxId}-ul`;
      this.ulEl.classList.add('listbox-ul');
      this.ulEl.hidden = true;
      this.ulEl.setAttribute('role', 'listbox');
      // for positioning
      this.divEl = document.createElement('div');
      this.divEl.className = 'listbox-ul-container';
      this.divEl.id = `${listboxId}-ul-container}`;
      this.ulEl.addEventListener('click', clickHandler);
      this.currentIndex = 0;
      this.initialIndex = 0;
      const list = this.ulEl;
      function reducer(acc, value, index) {
        const liEl = document.createElement('li');
        liEl.textContent = value;
        liEl.addEventListener('mouseenter', mouseenterHandler);
        liEl.className = 'listbox-li';
        liEl.id = `${listboxId}-li-${index}`;
        liEl.setAttribute('role', 'option');
        list.appendChild(liEl);
        acc.push(liEl);
        return acc;
      }
      this.liElementsArray = values.reduce(reducer, []);
      this.setAriaSelected(this.liElementsArray[0].id);
      this.divEl.appendChild(this.ulEl);
    }

    getCurrentElementText() {
      return this.liElementsArray[this.currentIndex].textContent;
    }

    getCurrentElement() {
      return this.liElementsArray[this.currentIndex];
    }

    restoreInitialState() {
      this.currentIndex = this.initialIndex;
      this.setAriaSelected(this.liElementsArray[this.currentIndex].id);
    }

    isHidden() {
      return this.ulEl.hidden;
    }

    append(parent) {
      parent.appendChild(this.divEl);
    }

    setCurrentIndex(targetEl) {
      const arry = targetEl.id.split('-');
      const index = parseInt(arry[arry.length - 1], 10);
      this.currentIndex = index;
    }

    saveInitialState() {
      this.initialIndex = this.currentIndex;
    }

    show() {
      if (this.ulEl.hidden) {
        this.saveInitialState();
        document.addEventListener('click', this.documentClickHandler, true);
        this.ulEl.hidden = false;
      }
    }

    hide() {
      if (!this.ulEl.hidden) {
        this.ulEl.hidden = true;
        document.removeEventListener('click', this.documentClickHandler, true);
      }
    }

    getPreviousIndex() {
      const index = this.currentIndex - 1 < 0
        ? this.liElementsArray.length - 1
        : this.currentIndex - 1;
      return index;
    }

    getNextIndex() {
      const index = this.currentIndex + 1 === this.liElementsArray.length
        ? 0
        : this.currentIndex + 1;
      return index;
    }

    setAriaSelected(id) {
      this.liElementsArray.forEach((liEl) => {
        if (liEl.id === id) {
          liEl.setAttribute('aria-selected', 'true');
          liEl.classList.add('listbox-li-selected');
          return;
        }
        if (liEl.hasAttribute('aria-selected')) {
          liEl.removeAttribute('aria-selected');
          liEl.classList.remove('listbox-li-selected');
        }
      });
    }

    handleChangeCurrentLI(e) {
      e.preventDefault();
      this.liElementsArray[this.currentIndex].tabIndex = '-1';
      switch (e.keyCode) {
      case VK_DOWN:
        this.currentIndex = this.getNextIndex();
        break;
      case VK_UP:
        this.currentIndex = this.getPreviousIndex();
        break;
      default:
        return;
      }
      this.setAriaSelected(this.liElementsArray[this.currentIndex].id);
    }
  }

  class Listbox {
    constructor({
      id, parent, label, callback, values,
    }) {
      //const parent = document.getElementById(parentId);
      //if (!parent) return;
      this.divEl = document.createElement('div');
      this.divEl.id = id;
      this.divEl.classList.add('listbox-container');
      const labelEl = document.createElement('label');
      labelEl.className = 'listbox-label';
      labelEl.id = `listbox-label-${id}`;
      labelEl.textContent = `${label}:`;
      labelEl.setAttribute('for', `${id}-ul`);
      this.documentClickHandler = this.documentClickHandler.bind(this);

      this.list = new List(values, id,
        this.listItemMouseenterHandler.bind(this),
        this.listClickHandler.bind(this),
        this.documentClickHandler);

      this.callback = callback;
      this.button = new Button(label, id, labelEl.id,
        this.buttonClickHandler.bind(this), this.keydownHandler.bind(this));
      this.divEl.appendChild(labelEl);
      this.button.append(this.divEl);
      this.list.append(this.divEl);
      parent.append(this.divEl);
      this.button.setAriaActiveDescendant(this.list.getCurrentElement());

      this.currentListItem = 0;
      this.totalItems = values.length;
    }

    buttonClickHandler(e) {
      if (this.list.isHidden()) {
        this.list.show(e);
        this.button.handleExpand();
      } else {
        this.list.hide();
        this.button.handleCollapse();
      }
    }

    listClickHandler(e) {
      this.callback(this.divEl.id, e.target.textContent);
      this.button.handleCollapse();
      this.list.hide();
    }

    listItemMouseenterHandler(e) {
      this.list.setAriaSelected(e.target.id);
      this.button.setAriaActiveDescendant(e.target);
      this.list.setCurrentIndex(e.target);
    }

    buttonKeydownHandler(e) {
      switch (e.keyCode) {
      case VK_DOWN:
      case VK_ENTER:
      case VK_UP:
        e.preventDefault();
        this.list.show(e);
        this.button.handleExpand();
        break;
      default:
      }
    }

    keydownHandler(e) {
      if (this.list.isHidden()) {
        this.buttonKeydownHandler(e);
      } else {
        this.listKeydownHandler(e);
      }
    }

    listKeydownHandler(e) {
      switch (e.keyCode) {
      case VK_DOWN:
      case VK_UP:
        e.preventDefault();
        this.list.handleChangeCurrentLI(e);
        this.button.setAriaActiveDescendant(this.list.getCurrentElement());
        break;
      // executing search
      case VK_ESC:
      case VK_ENTER:
        e.preventDefault();
        this.callback(this.divEl.id, this.list.getCurrentElementText());
        this.button.setFocus();
        this.list.hide();
        break;
      case VK_TAB:
        this.restoreInitialState();
        break;
      default:
      }
    }

    documentClickHandler(e) {
      // if the click has not occurred in the listbox, restore the initial state
      if (!((e.target.id.includes(this.divEl.id) && e.target.nodeName !== 'LABEL')
       || (e.target.parentElement.id === `${this.divEl.id}-button`))) {
        this.restoreInitialState();
      }
      document.removeEventListener('click', this.documentClickHandler, true);
    }

    restoreInitialState() {
      this.list.restoreInitialState();
      this.list.hide();
      this.button.setAriaActiveDescendant(this.list.getCurrentElement());
      this.button.handleCollapse();
    }
  }

  function checkId(id) {
    if (!id) throw new Error('An id is required for the creation of the Listbox');
    if (typeof id === 'number') throw new Error('The id must be a string value');
    if (document.getElementById(id)) throw new Error('A unique id is required for the Listbox');
  }

  /*function checkParentId(parentId) {
    if (!parentId) throw new Error('A parentId is required for the creation of the Listbox');
    if (!document.getElementById(parentId)) throw new Error('Invalid parentId');
  }*/

  function checkParams(id, callback) {
    checkId(id);
    if (!callback) throw new Error('A callback is required for the Listbox');
  }

  return function listbox({
    id, parent, label = 'Listbox Label', callback, values = ['All'],
  }) {
    /* eslint-disable no-new */
    checkParams(id, callback);
    new Listbox({
      id, parent, label, callback, values,
    });
  };
}());
