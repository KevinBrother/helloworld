interface Image {
  display();
}

class RealImage implements Image {
  filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  display() {
    console.log('this is realImage’s display');
  }

  loadFromDisk() {
    console.log('this is realImage’s load from disk');
  }
}

class ProxyImage implements Image {
  private realImage!: RealImage;
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  display() {
    if (!this.realImage) {
      this.realImage = new RealImage(this.filename);
    }
    this.realImage.display();
  }
}

(function () {
  const proxyImage = new ProxyImage('a.mp3');

  proxyImage.display();
})();
