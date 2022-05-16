import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const getOption = () => {
  let option = {
    title: {
      text: '用户骑行订单',
      x: 'center'
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'OFO订单量',
        type: 'line',   //这块要定义type类型，柱形图是bar,饼图是pie
        data: [1000, 2000, 1500, 3000, 2000, 1200, 800]
      }
    ]
  }
  return option
}

export default function DrawEchart(props) {
  const { option = getOption(), width = 500, height = 500 } = props;

  const chartDomRef = useRef(null);

  useEffect(() => {
    if (!chartDomRef.current || !option.series) {
      return;
    }

    const chart = echarts.init(chartDomRef.current);

    chart.setOption(option);
  }, [option]);

  return <div ref={chartDomRef} style={{ width, height }}></div>;
}
