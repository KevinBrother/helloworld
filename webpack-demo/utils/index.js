export function component(str) {
  const element = document.createElement('div');

  element.innerHTML = str;

  return element;
}
