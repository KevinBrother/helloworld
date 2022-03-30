export default function countReducer(preState, action) {
  console.log('[ preState, action ] >', preState, action);
  const { type, date } = action;
  switch (type) {
    case 'increase':
      console.log('-----');
      return preState + date * 1;
    case 'decrease':
      return preState - date * 1;
    default:
      return 0;
  }
}
