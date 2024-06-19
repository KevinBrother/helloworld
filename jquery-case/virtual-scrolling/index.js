class VirtualScrolling {
  data = [];

  constructor() {
    this.mockData();
    this.render();
  }

  render() {
    const container = $(".container");
    // const template = document.querySelector('inner');
    const items = this.data.map((item) => {
      return `<div class="inner">${item.text}</div>`;
    });
    container.append(items.join(""));
  }
}

new VirtualScrolling();
