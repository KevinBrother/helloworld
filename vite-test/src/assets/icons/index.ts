
const files = import.meta.globEager('/src/assets/icons/**/*.svg');

function getSVGModule() {
  const result = {};
  Object.keys(files).forEach(key => {
    const arr = key.split('/');
    const rName = arr[arr.length - 1] as string;
    result[rName.replace(/\.svg/g, '')] = files[key].default;
  });
  return result;
}

const svgModule = getSVGModule();

export { svgModule };
