class VirtualScrolling {
  data: {
    text: string;
  }[] = [];

  constructor() {
    this.mockData();
  }
  mockData(count: number = 1000) {
    const data = [];
    for (let i = 0; i < count; i++) {
      this.data.push({
        text: Math.random().toString(36),
      });
    }
    return data;
  }
}

export {};
