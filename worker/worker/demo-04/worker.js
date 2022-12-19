importScripts('./util.js');

self.addEventListener('message', function(messageEvent) {
    const {start, range, key} = messageEvent.data;
    console.log(start, range, key);
    console.time(key);
    const result = generatePrimes(start, range);
    console.timeEnd(key);

    self.postMessage(result);
})
