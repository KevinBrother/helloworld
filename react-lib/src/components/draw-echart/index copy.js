import React, { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';

export default function DrawEchart({ option = {} }) {
  const chartDomRef = useRef(null);
  let chart = useRef(null);

  /*   const setSingleChart = useCallback(() => {
    const echart = echarts.getInstanceByDom(chartDomRef.current);
    if (chart.current) {
      chart.current = echart;
    } else {
      chart.current = echarts.init(chartDomRef.current);
    }
  }, []); */

  const setSingleChart = useCallback(() => {
    if (!chart.current) {
      chart.current = echarts.init(chartDomRef.current);
    }
  }, []);

  useEffect(() => {
    console.log(
      '%c [ option ]-21',
      'font-size:13px; background:pink; color:#bf2c9f;',
      option
    );

    const chart = echarts.init(chartDomRef.current);
    // setSingleChart();

    if (!option.series || chart === null) {
      return;
    }

    chart.setOption(option);
  }, [option]);

  return (
    <div
      ref={chartDomRef}
      id="chartDom"
      style={{ width: 500, height: 500 }}
    ></div>
  );
}
