import React, { useContext, useRef, useState } from 'react';

const themes = {
  light: {
    foreground: '#000000',
    background: '#eeeeee'
  },
  dark: {
    foreground: '#ffffff',
    background: '#222222'
  }
};

const ContextTheme = React.createContext();

export default function ContextDemo() {
  const [themeStyle, setThemeStyle] = useState('light');

  const changeTheme = () => {
    setThemeStyle(themeStyle === 'light' ? 'dark' : 'light');
  };

  return (
    <ContextTheme.Provider value={themes[themeStyle]}>
      <div>current themes {themeStyle}</div>
      <Toolbar></Toolbar>
      <button className="btn btn-primary" onClick={changeTheme}>
        改变主题颜色
      </button>
    </ContextTheme.Provider>
  );
}

function Toolbar() {
  return <ButtonStyle></ButtonStyle>;
}

function ButtonStyle() {
  const themes = useContext(ContextTheme);
  return <button style={themes}>good!!!</button>;
}
