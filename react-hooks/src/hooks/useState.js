export function useState(initialValue) {
  let value = initialValue;

  function setValue(data) {
    value = data;
    console.log(
      '%c [ data ]-6',
      'font-size:13px; background:pink; color:#bf2c9f;',
      data
    );
  }

  return [value, setValue];
}
