/**
 * Performance Benchmarks for KJSON
 *
 * Compares KJSON performance against native JSON
 */

import { stringify, parse } from '../src';

describe('Performance Benchmarks', () => {
  // Small dataset
  const smallObject = {
    name: 'Tom',
    age: 18,
    email: 'tom@example.com',
    active: true,
  };

  // Medium dataset
  const mediumObject = {
    id: 1,
    user: {
      name: 'Tom',
      age: 18,
      email: 'tom@example.com',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
      },
    },
    posts: [
      { id: 1, title: 'First Post', content: 'Hello World', likes: 10 },
      { id: 2, title: 'Second Post', content: 'KJSON is cool', likes: 25 },
      { id: 3, title: 'Third Post', content: 'TypeScript rocks', likes: 15 },
    ],
    settings: {
      theme: 'dark',
      notifications: true,
      language: 'en',
    },
  };

  // Large dataset - create an array of many users
  const largeArray = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 18 + (i % 50),
    active: i % 2 === 0,
    tags: ['tag1', 'tag2', 'tag3'],
  }));

  // Complex nested structure
  const deepObject = {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              data: 'deep value',
              array: [1, 2, 3, 4, 5],
            },
          },
        },
      },
    },
  };

  describe('Stringify Performance', () => {
    test('small object - stringify vs JSON.stringify', () => {
      const iterations = 10000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        stringify(smallObject);
        JSON.stringify(smallObject);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        stringify(smallObject);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(smallObject);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nSmall object stringify (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);

      // KJSON should be reasonably close (within 20x for this educational implementation)
      expect(kjsonTime / nativeTime).toBeLessThan(20);
    });

    test('medium object - stringify vs JSON.stringify', () => {
      const iterations = 1000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        stringify(mediumObject);
        JSON.stringify(mediumObject);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        stringify(mediumObject);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(mediumObject);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nMedium object stringify (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);
    });

    test('large array - stringify vs JSON.stringify', () => {
      const iterations = 100;

      // Warm up
      for (let i = 0; i < 10; i++) {
        stringify(largeArray);
        JSON.stringify(largeArray);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        stringify(largeArray);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(largeArray);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nLarge array stringify (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);
    });

    test('deep object - stringify vs JSON.stringify', () => {
      const iterations = 1000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        stringify(deepObject);
        JSON.stringify(deepObject);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        stringify(deepObject);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(deepObject);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nDeep object stringify (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);
    });
  });

  describe('Parse Performance', () => {
    test('small object - parse vs JSON.parse', () => {
      const json = JSON.stringify(smallObject);
      const iterations = 10000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        parse(json);
        JSON.parse(json);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        parse(json);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.parse(json);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nSmall object parse (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);

      // KJSON should be reasonably close (within 20x for this educational implementation)
      expect(kjsonTime / nativeTime).toBeLessThan(20);
    });

    test('medium object - parse vs JSON.parse', () => {
      const json = JSON.stringify(mediumObject);
      const iterations = 1000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        parse(json);
        JSON.parse(json);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        parse(json);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.parse(json);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nMedium object parse (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);
    });

    test('large array - parse vs JSON.parse', () => {
      const json = JSON.stringify(largeArray);
      const iterations = 100;

      // Warm up
      for (let i = 0; i < 10; i++) {
        parse(json);
        JSON.parse(json);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        parse(json);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.parse(json);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nLarge array parse (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);
    });

    test('deep object - parse vs JSON.parse', () => {
      const json = JSON.stringify(deepObject);
      const iterations = 1000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        parse(json);
        JSON.parse(json);
      }

      // Benchmark KJSON
      const kjsonStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        parse(json);
      }
      const kjsonTime = performance.now() - kjsonStart;

      // Benchmark native JSON
      const nativeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.parse(json);
      }
      const nativeTime = performance.now() - nativeStart;

      console.log(`\nDeep object parse (${iterations} iterations):`);
      console.log(`  KJSON:     ${kjsonTime.toFixed(2)}ms`);
      console.log(`  Native:    ${nativeTime.toFixed(2)}ms`);
      console.log(`  Ratio:     ${(kjsonTime / nativeTime).toFixed(2)}x`);
    });
  });

  describe('Correctness Verification', () => {
    test('stringify produces correct output', () => {
      expect(stringify(smallObject)).toBe(JSON.stringify(smallObject));
      expect(stringify(mediumObject)).toBe(JSON.stringify(mediumObject));
      expect(stringify(deepObject)).toBe(JSON.stringify(deepObject));
    });

    test('parse produces correct output', () => {
      const smallJson = JSON.stringify(smallObject);
      expect(parse(smallJson)).toEqual(JSON.parse(smallJson));

      const mediumJson = JSON.stringify(mediumObject);
      expect(parse(mediumJson)).toEqual(JSON.parse(mediumJson));

      const deepJson = JSON.stringify(deepObject);
      expect(parse(deepJson)).toEqual(JSON.parse(deepJson));
    });

    test('round-trip serialization', () => {
      const objects = [smallObject, mediumObject, deepObject, largeArray];

      for (const obj of objects) {
        const serialized = stringify(obj);
        const deserialized = parse(serialized);
        expect(deserialized).toEqual(obj);
      }
    });
  });
});
