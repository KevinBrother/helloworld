const initPersons = [{ id: 1, name: 'huhu', age: 36 }];

export default function personReducer(preState = initPersons, action) {
  const { type, date } = action;

  switch (type) {
    case 'addPerson':
      return [date, ...preState];

    default:
      return preState;
  }
}
