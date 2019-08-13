class Button {
  constructor(buttonLabel, listEl) {
    this.buttonEl = document.createElement('button');
    this.buttonEl.innerHTML = `${buttonLabel} <i class="fas fa-angle-down"></i> `;
    this.listEl = listEl;
    this.buttonEl.addEventListener('click', this.clickHandler.bind(this));
    this.buttonEl.addEventListener('mouseenter', this.mouseEnterHandler.bind(this));
    this.buttonEl.addEventListener('mouseleave', this.mouseLeaveHandler.bind(this));
  }

  append(parent) {
    parent.appendChild(this.buttonEl);
  }

  mouseEnterHandler() {
    this.buttonEl.style.cursor = 'pointer';
  }

  mouseLeaveHandler() {
    this.buttonEl.style.cursor = 'initial';
  }

  clickHandler() {
    this.listEl.toggleVisibility();
  }

  setList(listEl) {
    this.listEl = listEl;
  }
}

class List {
  constructor(callback) {
    this.listEl = document.createElement('ul');
    this.listEl.style = 'border: solid 2px blue';
    this.callback = callback;
    this.listEl.addEventListener('mouseenter', this.mouseEnterHandler.bind(this));
    this.listEl.addEventListener('mouseleave', this.mouseLeaveHandler.bind(this));
    this.listEl.addEventListener('click', this.clickHandler.bind(this));
    this.listEl.hidden = true;
  }

  append(parent) {
    parent.appendChild(this.listEl);
  }

  setListValues(array) {
    const str = array.map(value => `<li>${value}</li>`).join('');
    this.listEl.innerHTML = str;
  }

  mouseEnterHandler(e) {
    this.listEl.style.cursor = 'pointer';
  }

  mouseLeaveHandler(e) {
    this.listEl.style.cursor = 'initial';
  }

  clickHandler(e) {
    e.preventDefault();
    this.callback(e.target.innerText);
  }

  toggleVisibility() {
    this.listEl.hidden = !this.listEl.hidden;
  }
}

class ComboBox {
  constructor({parentId, buttonLabel, callback}) {
    //if (!id || !typeof parentId === 'string') return;
    const parent = document.getElementById(parentId);
    if (!parent) return;
    this.list = new List(callback);

    this.button = new Button(buttonLabel, this.list);
    this.button.append(parent);
    this.list.append(parent);
  }

  setListValues(array) {
    this.list.setListValues(array);
  }


}
