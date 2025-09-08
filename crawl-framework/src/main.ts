// For more information, see https://crawlee.dev/
import { AdaptivePlaywrightCrawler, ProxyConfiguration } from 'crawlee';

const crawler = new AdaptivePlaywrightCrawler({
    async requestHandler({ querySelector, pushData, enqueueLinks, request, log }) {
        // This function is called to extract data from a single web page
        const $prices = await querySelector('span.price')

        await pushData({
            url: request.url,
            price: $prices.filter(':contains("$")').first().text(),
        })

        await enqueueLinks({ selector: '.pagination a' })
    },
});

await crawler.run([
    'http://www.example.com/page-1',
    'http://www.example.com/page-2',
]);