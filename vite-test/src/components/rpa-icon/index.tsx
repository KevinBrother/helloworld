import * as React from 'react';
import { svgModule } from '../../assets/icons';

interface IProps {
  icon: string;
  color?: string;
  className?: string;
  width?: string;
  height?: string;
  style?: React.CSSProperties;
  size?: string;
  onClick?(): void;
}

function RpaIcon(props: IProps) {
  const icon = svgModule[props.icon];
  console.log(icon);
  const style: React.CSSProperties = {
    height: props.height ? props.height : props.size || '16px',
    width: props.width ? props.width : props.size || '16px',
    fill: 'currentcolor',
    ...props.style || {}
  };
  if (props.color) {
    style.fill = props.color;
    style.stroke = props.color;
  }
  return (
    <img src={icon} style={style} onClick={props.onClick} className={props.className} />
    // <svg style={style} onClick={props.onClick} className={props.className}>
    //   <use xlinkHref={icon} />
    // </svg>
  );
}

export default React.memo(RpaIcon);