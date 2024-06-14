class VirtualScrolling {
    data = [];
  
    constructor() {
      this.mockData();
      this.render();
    }
    
    mockData(count = 1000) {
      const data = [];
      for (let i = 0; i < count; i++) {
        this.data.push({
          text: `${this.data.length} --- ${Math.random().toString(36)}`,
        });
      }
      return data;
    }

    render() {
        const container = $('.container');
        // const template = document.querySelector('inner');
        const items = this.data.map((item) => {
          return `<div class="inner">${item.text}</div>`;
        });
        container.append(items.join(''));
      }

  }

  new VirtualScrolling();
