
// worker.js
const channel = new BroadcastChannel('worker_channel');
channel.onmessage = ({data}) => {
    console.log(`heard ${data} on page`);
    channel.postMessage('bar');
}