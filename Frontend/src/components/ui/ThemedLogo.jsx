/**
 * @file ThemedLogo.jsx
 * Renders the Prepper logo PNG that matches the current theme.
 * - Light mode → /logo-light.png  (dark ink on transparent bg)
 * - Dark mode  → /logo-dark.png   (white/yellow ink on transparent bg)
 */

import React from 'react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemedLogo({ className = '', alt = 'Prepper Logo' }) {
  const { isDark } = useTheme();

  return (
    <img
      src={isDark ? '/logo-dark.png' : '/logo-light.png'}
      alt={alt}
      className={className}
    />
  );
}
