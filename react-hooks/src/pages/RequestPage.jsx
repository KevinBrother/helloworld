import React from 'react';
import useAsync from '../hooks/useAsync';

export default function RequestPage() {
  const { data, options, setOptions } = useAsync('http://www.baidu.com');

  console.log('[ data, option ] >', data, options);
  return (
    <div>
      所有带数据是{data.total}---{data.list[0]}
      当前{options.current}页，一共{options.pageSize}页
      <br />
      全路径为 {options.url}
      <button
        onClick={() => setOptions((r) => ({ ...r, current: r.current + 1 }))}
      >
        current++
      </button>
    </div>
  );
}
