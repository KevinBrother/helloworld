import React, { useState, useEffect, useLayoutEffect } from 'react';
import { usePieChartData } from '../hooks/usePieChartData';
import { DrawEchart } from '../components';

export default function Echarts() {
  const { option } = usePieChartData();
  console.log(
    '%c [ option ]-7',
    'font-size:13px; background:pink; color:#bf2c9f;',
    option
  );

  return (
    <div>
      <DrawEchart option={option} />
      <DrawEchart option={option} />
    </div>
  );
}
