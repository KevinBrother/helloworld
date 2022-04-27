export const ToDoApi = {
  requestList: () => {
    return fetch('https://yapi.datagrand.com/mock/879/v2/actions')
      .then((response) => response.json())
      .then((json) => json);
  }
};
