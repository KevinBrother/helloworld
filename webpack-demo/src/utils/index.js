export function component(str) {
  const element = document.createElement('div');

  element.innerHTML = str + 'utils中的工具';

  return element;
}
