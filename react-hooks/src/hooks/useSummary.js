import React, { useEffect, useState, useCallback } from 'react';

const initialSummary = {
  staffNum: 0,
  robotNum: 0,
  flowNum: 0,
  taskNum: 0,
  jobNum: 0
};

export function useSummary(isSystemSummary) {
  const [summary, setSummary] = useState(initialSummary);
  const getSummary = useCallback(() => {
    console.log(isSystemSummary);
    fetch('https://yapi.datagrand.com/mock/874/v1/platform/dataMonitor/summary')
      .then((response) => response.json())
      .then((json) => {
        // console.log(json.data);
        console.log(json.data[isSystemSummary].flowNum);
        setSummary(json.data[isSystemSummary]);
      });
  }, [isSystemSummary]);

  useEffect(() => {
    getSummary();
  }, [getSummary]);

  return { summary };
}
