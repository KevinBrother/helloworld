export const createIncreaseAction = (value) => ({
  type: 'increase',
  date: value
});

export const createDecreaseAction = (value) => ({
  type: 'decrease',
  date: value
});
