//

/**
 * rgba(255, 255, 255,1) => 1, 1, 1,1
 * @param {*} rgba
 * @returns string
 */
function css2webglRGBA(rgba) {
  const reg = RegExp(/\((.*)\)/);
  const regStr = reg.exec(rgba)[1];

  const webglRGBA = regStr.split(',').map((num) => parseInt(num));

  const r = webglRGBA[0] / 255;
  const g = webglRGBA[1] / 255;
  const b = webglRGBA[2] / 255;
  const a = webglRGBA[3];

  console.log(
    '%c [ [r, g, b, a] ]-11',
    'font-size:13px; background:pink; color:#bf2c9f;',
    [r, g, b, a]
  );
  return [r, g, b, a];
}

css2webglRGBA('rgba(255, 25, 55,1)');
