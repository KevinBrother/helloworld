import React from 'react';

export default function Input(props) {
  const { className, name, value, onChange } = props;

  return (
    <input
      className={className ? className : 'form-control'}
      type="text"
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/* export default function Input(props) {
  const { className, value, onChange } = props;
  let curValue = value;

  function handleChange(event) {
    curValue = event.target.value;
    onChange(curValue);
  }

  return (
    <input
      className={className ? className : 'form-control'}
      type="text"
      value={curValue}
      onChange={handleChange}
    />
  );
} */
