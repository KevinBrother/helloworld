const useState = function (initData) {
  let data = initData;

  const setState = function (newData) {
    data = newData;
    render();
  };

  return [data, setState];
};

function renderList() {
  const [data, setData] = useState();

  fetch('https://yapi.datagrand.com/mock/669/v2/robot/groups')
    .then((response) => response.json())
    .then((json) => {
      const listHtml = json.items.map((item) => {
        return `
        <li>
          <a href="${item.id}">${item.name}</a>
        </li>
        `;
      });

      function render() {
        document.write(`
        <ul>
          ${listHtml}
        </ul>
      `);
      }
    });
}

renderList();
