function generatePrimes(start, range) {
    let primes = [];
    let end = start + range;
    for (let i = start; i < end; i++) {
        let isPrime = true;
        for (let j = 2; j <= Math.sqrt(i); j++) {
            if (i !== j && i%j === 0) {
                isPrime = false;
                break;
            }
        }
        if (isPrime) {
            primes.push(i);
        }
    }
    return primes;
}
