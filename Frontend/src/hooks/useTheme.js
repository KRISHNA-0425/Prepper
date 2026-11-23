/**
 * @file useTheme.js
 * Custom React hook for accessing and toggling Prepper AI's global theme.
 */

import { useSelector, useDispatch } from 'react-redux';
import { setTheme, toggleTheme } from '../redux/themeSlice';

export function useTheme() {
  const dispatch = useDispatch();
  const currentTheme = useSelector((state) => state.theme?.current || 'light');

  const isDark = currentTheme === 'dark';

  const handleToggle = () => {
    dispatch(toggleTheme());
  };

  const handleSetTheme = (theme) => {
    dispatch(setTheme(theme));
  };

  return {
    theme: currentTheme,
    isDark,
    toggleTheme: handleToggle,
    setTheme: handleSetTheme,
  };
}

export default useTheme;
