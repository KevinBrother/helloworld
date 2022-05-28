const useState = function (initData) {
  let data = initData;

  const setState = function (newData) {
    data = newData;
    render();
  };

  return [data, setState];
};

async function renderList() {
  const [data, setData] = useState();

  const response = await fetch(
    'https://yapi.datagrand.com/mock/669/v2/robot/groups'
  );

  const json = await response.json();
  setData(json);
  console.log('data====', data);

  console.log(1);

  function render() {
    console.log(data);
    console.log(
      '%c [ data ]-27',
      'font-size:13px; background:pink; color:#bf2c9f;',
      data
    );
    document.write(`
    <ul>
      <li>
      </li>
    </ul>
  `);
  }
}

renderList();
