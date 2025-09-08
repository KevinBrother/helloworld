import { createServer, Server } from 'http';

export interface MockServerOptions {
  port?: number;
  responses?: Record<string, { 
    status?: number; 
    headers?: Record<string, string>; 
    body: string; 
  }>;
}

export class MockServer {
  private server: Server;
  private port: number;
  private responses: Record<string, any>;

  constructor(options: MockServerOptions = {}) {
    this.port = options.port || 3000;
    this.responses = options.responses || {};
    
    this.server = createServer((req, res) => {
      const url = req.url || '/';
      const response = this.responses[url] || this.getDefaultResponse(url);
      
      res.writeHead(response.status || 200, response.headers || { 'Content-Type': 'text/html' });
      res.end(response.body);
    });
  }

  private getDefaultResponse(url: string) {
    if (url.includes('product')) {
      return {
        status: 200,
        body: `
          <html>
            <head><title>Test Product Page</title></head>
            <body>
              <div class="product-info">
                <h1 class="product-title">Test Product</h1>
                <span class="price">$99.99</span>
                <div class="rating" data-rating="4.5">★★★★☆</div>
                <img class="product-images" src="/image1.jpg" alt="Product" />
                <div class="description">This is a test product description</div>
              </div>
              <div class="related-products">
                <a href="/product/2">Related Product 1</a>
                <a href="/product/3">Related Product 2</a>
              </div>
            </body>
          </html>
        `
      };
    }
    
    if (url.includes('news')) {
      return {
        status: 200,
        body: `
          <html>
            <head><title>Test News Page</title></head>
            <body>
              <article>
                <h1 class="headline">Test News Article</h1>
                <div class="author">John Doe</div>
                <time class="publish-date" datetime="2024-01-01T12:00:00Z">2024-01-01</time>
                <div class="article-content">This is test news content</div>
                <div class="tags">
                  <a href="/tag/tech">Technology</a>
                  <a href="/tag/web">Web</a>
                </div>
              </article>
              <div class="more-articles">
                <a href="/news/2">More Article 1</a>
                <a href="/news/3">More Article 2</a>
              </div>
            </body>
          </html>
        `
      };
    }
    
    return {
      status: 200,
      body: `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Test Content</h1>
            <p>This is a test page for crawling</p>
            <a href="/page2">Next Page</a>
            <a href="/page3">Another Page</a>
          </body>
        </html>
      `
    };
  }

  addResponse(path: string, response: any) {
    this.responses[path] = response;
  }

  async start(): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve(this.port);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }

  getUrl(path: string = '') {
    return `http://localhost:${this.port}${path}`;
  }
}