export default function getWebglOrigin(ele) {
  const eleRect = ele.getBoundingClientRect();
  console.log(
    '%c [ eleRect ]-3',
    'font-size:13px; background:pink; color:#bf2c9f;',
    eleRect
  );

  const { left, top, width, height } = eleRect;

  // 获取webgl 的坐标系原点
  return {
    left,
    top,
    originalWidth: left + width / 2,
    originalHeight: top + height / 2
  };
}
