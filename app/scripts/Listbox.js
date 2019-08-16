const makeListbox = (function() {

  'use strict';

  // Define values for keycodes
  const VK_ENTER      = 13;
  const VK_ESC        = 27;
  const VK_SPACE      = 32;
  const VK_LEFT       = 37;
  const VK_UP         = 38;
  const VK_RIGHT      = 39;
  const VK_DOWN       = 40;
  let LAST_ID = 0;

class Button {
  constructor(notifyListbox, buttonLabel, listboxId, labelId) {
    this.notifyListbox = notifyListbox;
    this.buttonEl = document.createElement('button');
    this.buttonEl.innerHTML = 'All <i class="fas fa-angle-down"></i>';
    this.buttonEl.id = `${listboxId}-button`;
    this.buttonEl.className = 'listbox-button';
    this.buttonEl.setAttribute('aria-haspopup', 'listbox');
    this.buttonEl.addEventListener('click', this.clickHandler.bind(this));
    this.buttonEl.addEventListener('keydown', this.keydownHandler.bind(this));
    this.buttonEl.setAttribute('aria-labelledby', labelId);
    this.expanded = false;
  }

  append(parent) {
    parent.appendChild(this.buttonEl);
  }

  keydownHandler(e) {
    switch (e.keyCode) {
      case VK_DOWN:
      case VK_ENTER:
        this.toggleExpanded();
        this.notifyListbox(e);
        break;
      default:
    }
  }

  clickHandler(e) {
    this.toggleExpanded();
    this.notifyListbox(e);
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
    this.buttonEl.setAttribute('aria-expanded', this.expanded);
    if (this.expanded) {
      this.buttonEl.innerHTML = `${this.buttonEl.innerText} <i class="fas fa-angle-up"></i>`;
    } else {
      this.buttonEl.innerHTML = `${this.buttonEl.innerText} <i class="fas fa-angle-down"></i>`;
    }
  }

  setText(text) {
    this.buttonEl.innerHTML = `${text} <i class="fas fa-angle-up"></i> `;
  }

  setFocus() {
    this.buttonEl.focus();
  }
}

class List {
  constructor(notifyListbox, values, listboxId) {
    this.listEl = document.createElement('ul');
    this.listEl.id = `${listboxId}-ul`;
    this.listEl.className = 'listbox-ul';
    this.listEl.setAttribute('role', 'listbox');
    this.divEl = document.createElement('div');
    this.divEl.className = 'listbox-ul-container';
    this.notifyListbox = notifyListbox;
    this.listEl.addEventListener('click', this.clickHandler.bind(this));
    this.listEl.addEventListener('keydown', this.keydownHandler.bind(this));
    this.currentIndex = 0;
    this.previousIndex = 0;
    this.hidden;
    this.hide();

    const mouseEnterHandler = this.mouseEnterHandler.bind(this);
    const mouseLeaveHandler = this.mouseLeaveHandler.bind(this);
    const list = this.listEl;
    const reducer = function(acc, value, index) {
      const liEl = document.createElement('li');
      liEl.textContent = value;
      liEl.addEventListener('mouseenter', mouseEnterHandler);
      liEl.addEventListener('mouseleave', mouseLeaveHandler);
      liEl.className = 'listbox-li';
      liEl.id = `${listboxId}-li-${index}`;
      liEl.setAttribute('role', 'option');
      list.appendChild(liEl);
      acc.push(liEl);
      return acc;
    }
    this.liElementsArray = values.reduce(reducer, []);
    this.setAriaActiveDescendant(this.liElementsArray[0].id);
    this.divEl.appendChild(this.listEl);
  }

  append(parent) {
    parent.appendChild(this.divEl);
  }

  mouseEnterHandler(e) {
    this.liElementsArray[this.currentIndex].style.backgroundColor = 'white';
    e.target.style.backgroundColor = 'gray';
    this.notifyListbox(e, 'mouseenter', e.target.textContent);
    this.setAriaActiveDescendant(e.target.id);
  }

  mouseLeaveHandler(e) {
    e.target.style.backgroundColor = 'initial';
  }

  clickHandler(e) {
    this.hide();
    this.notifyListbox(e, 'selectCurrent', e.target.innerText);
  }

  keydownHandler(e) {
    switch (e.keyCode) {
      case VK_DOWN:
      case VK_UP:
        this.handleChangeCurrentLI(e);
        this.notifyListbox(e, 'changeCurrent', this.liElementsArray[this.currentIndex].textContent);
        break;
      case VK_ESC:
      case VK_ENTER:
        this.hide();
        this.notifyListbox(e, 'selectCurrent', this.liElementsArray[this.currentIndex].textContent);
        break;
      default:
    }

  }

  toggleVisibility() {
    if (this.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    if (this.hidden) {
      this.hidden = false;
      this.listEl.classList.remove('hidden');
      this.listEl.tabIndex = '0';
      this.listEl.focus();
      this.styleCurrentLI();
    }
  }

  hide() {
    if (!this.hidden) {
      this.hidden = true;
      this.listEl.classList.add('hidden');
      this.listEl.tabIndex = '-1';
    }
  }

  getPreviousIndex() {
    const index = this.currentIndex - 1 < 0
      ? this.liElementsArray.length - 1
      : this.currentIndex - 1;
    return index;
  }

  getNextIndex() {
    const index = this.currentIndex + 1 == this.liElementsArray.length
      ? 0
      : this.currentIndex + 1;
    return index;
  }

  setAriaActiveDescendant(id) {
    this.listEl.setAttribute('aria-activedescendant', id);
    this.liElementsArray.forEach(function(liEl, index) {
      if (liEl.id === id) {
        liEl.setAttribute('aria-selected', 'true');
      } else {
        if (liEl.hasAttribute('aria-selected')) {
          liEl.removeAttribute('aria-selected');
        }
      }
    });
  }

  handleChangeCurrentLI(e) {
    this.previousIndex = this.currentIndex;
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
    this.styleCurrentLI();
    this.setAriaActiveDescendant(this.liElementsArray[this.currentIndex].id);
  }

  styleCurrentLI() {
    this.liElementsArray[this.previousIndex].style.backgroundColor = 'initial';
    this.liElementsArray[this.currentIndex].style.backgroundColor = 'gray';
  }

}

class Listbox {
  constructor({id, parentId, label, callback, values}) {
    //if (!id || !typeof parentId === 'string') return;
    const parent = document.getElementById(parentId);
    if (!parent) return;
    const divEl = document.createElement('div');
    divEl.classList.add('listbox-container');
    divEl.id = id;
    const labelEl = document.createElement('label');
    labelEl.className = 'listbox-label';
    labelEl.id = `listbox-label-${id}`;
    labelEl.textContent = `${label}:`;
    labelEl.setAttribute('for', `${id}-ul`);

    this.notifyListboxButton = this.notifyListboxButton.bind(this);
    this.notifyListboxList = this.notifyListboxList.bind(this);

    this.list = new List(this.notifyListboxList, values, id);
    this.callback = callback;

    this.button = new Button(this.notifyListboxButton, label, id, labelEl.id);
    divEl.appendChild(labelEl);
    this.button.append(divEl);
    this.list.append(divEl);
    parent.append(divEl);

    this.selectedItem = 0;
    this.currentListItem = 0;
    this.totalItems = values.length;
  }


  notifyListboxList(e, type, text) {
    e.preventDefault();
    switch(type) {
      case 'mouseenter' :
        this.button.setText(text);
        break;
      case 'selectCurrent' :
        this.callback(text);
        this.button.setFocus();
        this.button.toggleExpanded();
        break;
      case 'changeCurrent' :
        this.button.setText(text);
        break;
      default:
    }
  }

  notifyListboxButton(e) {

    e.preventDefault();
    switch(e.type) {
      case 'click' :
        this.list.toggleVisibility();
        break;
      case 'keydown':
        this.list.show();
        break;
    }
  }

}
  return function(options) {
    new Listbox(options);
  }
}());
