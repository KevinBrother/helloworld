import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function DrawEchart(props) {
  const { option = {}, width = 500, height = 500 } = props;

  const chartDomRef = useRef(null);

  useEffect(() => {
    console.log(
      '%c [ option ]-21',
      'font-size:13px; background:pink; color:#bf2c9f;',
      option
    );

    if (!chartDomRef.current || !option.series) {
      return;
    }

    const chart = echarts.init(chartDomRef.current);

    chart.setOption(option);
  }, [option]);

  return;
  <div ref={chartDomRef} style={{ width, height }}></div>;
}
