import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function DrawEchart({ option = {} }) {
  const chartRef = useRef(null);

  useEffect(() => {
    console.log(
      '%c [ option ]-21',
      'font-size:13px; background:pink; color:#bf2c9f;',
      option
    );
    if (!option.series) {
      return;
    }
    const chartDom = document.getElementById('chartDom');
    // TODO echarts实例需要判断是否存在
    const chart = echarts.init(chartDom);
    chart.clear();
    chart.setOption(option);
  }, [option]);

  return (
    <div ref={chartRef} id="chartDom" style={{ width: 500, height: 500 }}></div>
  );
}
