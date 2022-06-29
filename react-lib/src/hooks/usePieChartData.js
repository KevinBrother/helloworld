import { useState, useEffect } from 'react';
import _ from 'lodash-es';

const initOption = {
  title: {
    text: '100',
    subtext: '作业总数',
    textStyle: {
      fontFamily: 'DIN-Medium,DIN',
      fontWeight: 'bold',
      fontSize: 24,
      color: ['#fff']
    },
    subtextStyle: {
      fontSize: 12,
      color: ['#697683']
    },
    itemGap: 5,
    x: 'center',
    y: 82
  },
  series: {
    type: 'pie',
    radius: [42, 70],
    top: '0%',
    height: '100%',
    left: 'center',
    width: 400,
    label: {
      alignTo: 'edge',
      formatter: '{value|{c}}\n{name|{b}}',
      minMargin: 5,
      edgeDistance: 50,
      lineHeight: 15,
      rich: {
        name: {
          fontSize: 10,
          color: 'rgba(211,224,255, 0.6)'
        },
        value: {
          fontSize: 14
        }
      }
    },
    labelLine: {
      length: 15,
      length2: 0,
      maxSurfaceAngle: 80,
      lineStyle: {
        color: 'rgba(155,155,155,0.2)'
      }
    },
    labelLayout: function (params) {
      const isLeft =
        params.labelRect.x < (this.chartInstance?.getWidth() || 0) / 2;
      const points = params.labelLinePoints;

      // Update the end point.
      try {
        points[2][0] = isLeft
          ? params.labelRect.x
          : params.labelRect.x + params.labelRect.width;
        // tslint:disable-next-line: no-empty
      } catch {}

      return {
        labelLinePoints: points
      };
    },
    data: []
  }
};

// 返回饼状图希望格式数据
function handleData(data) {
  // 兼容返回的任务为 null 的情况
  data = data || {
    faulted: 10,
    pending: 20,
    running: 30,
    stopped: 40,
    stopping: 50,
    successful: 10,
    terminating: 20
  };
  // 调整返回的顺序
  const _data = {
    faulted: data.faulted,
    pending: data.pending,
    running: data.running,
    stopped: data.stopped,
    stopping: data.stopping,
    successful: data.successful,
    terminating: data.terminating
  };
  const pieData = { title: '作业总数', data: [], totalNum: 0 };
  const dataArr = [];
  let totalNum = 0;

  _.forEach(_data, (val, key) => {
    const arrItem = {
      name: '',
      value: 0,
      label: { color: '#2ACB84' },
      itemStyle: { normal: { color: '#2ACB84' } }
    };
    // eslint-disable-next-line default-case
    switch (key) {
      case 'faulted':
        arrItem.name = '异常';
        arrItem.label.color = '#EC7174';
        arrItem.itemStyle.normal.color = '#EC7174';
        break;
      case 'pending':
        arrItem.name = '待处理';
        arrItem.label.color = '#FCC900';
        arrItem.itemStyle.normal.color = '#FCC900';
        break;
      case 'running':
        arrItem.name = '正在运行';
        arrItem.label.color = '#2196F3';
        arrItem.itemStyle.normal.color = '#2196F3';
        break;
      case 'stopped':
        arrItem.name = '已停止';
        arrItem.label.color = '#436582';
        arrItem.itemStyle.normal.color = '#6386A4';
        break;
      case 'stopping':
        arrItem.name = '正在停止';
        arrItem.label.color = '#767DF7';
        arrItem.itemStyle.normal.color = '#767DF7';
        break;
      case 'successful':
        arrItem.name = '成功';
        arrItem.label.color = '#2ACB84';
        arrItem.itemStyle.normal.color = '#2ACB84';
        break;
      case 'terminating':
        arrItem.name = '正在终止';
        arrItem.label.color = '#B05FF6';
        arrItem.itemStyle.normal.color = '#B05FF6';
        break;
    }
    arrItem.value = val || 0;
    dataArr.push(arrItem);
    totalNum += arrItem.value;
    pieData.totalNum = totalNum;
    pieData.data = dataArr;
  });

  return pieData;
}

function mergeOption(option, newV) {
  option.series.data = newV.data;
  option.title.text = String(newV.totalNum);
  option.title.subtext = newV.title;
  option.series.radius = newV.radius || [42, 70];
  option.series.label.rich.value.fontSize = newV.labelValueFontSize || 14;
  option.series.label.rich.name.fontSize = newV.labelNameFontSize || 10;
  option.series.width = newV.width || 400;
  return { ...option };
}

export function usePieChartData() {
  const [option, setOption] = useState();

  useEffect(() => {
    fetch('https://yapi.datagrand.com/mock/226/v1/stats/todayJobs')
      .then((res) => res.json())
      .then((json) => {
        let data = json.data;
        data = handleData(data);
        const option = mergeOption(initOption, data);
        console.log(
          '%c [ option ]-176',
          'font-size:13px; background:pink; color:#bf2c9f;',
          option
        );
        setOption(option);
      });
  }, []);

  return { option };
}
