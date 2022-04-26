import React, { useState, useEffect, useLayoutEffect } from 'react';
import { usePieChartData } from '../hooks/usePieChartData';
import { DrawEchart } from '../components';

export default function Echarts() {
  const { option } = usePieChartData();

  return (
    <div>
      <DrawEchart option={option} />
    </div>
  );
}
