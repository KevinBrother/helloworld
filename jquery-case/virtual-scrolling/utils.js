export function mockData(count = 1000) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      text: `${data.length} --- ${Math.random().toString(36)}`,
    });
  }
  return data;
}
