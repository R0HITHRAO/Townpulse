import React from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Animates route changes by re-mounting the page subtree keyed on the pathname,
 * which re-triggers the `animate-page-in` entrance (fade + lift + de-blur).
 * The motion itself is disabled automatically for `prefers-reduced-motion` users.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="flex-1 flex flex-col animate-page-in">
      {children}
    </div>
  );
};

export default PageTransition;
