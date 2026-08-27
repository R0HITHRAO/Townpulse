import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin, isBusinessOwner } from '../services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireBusiness?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireBusiness = false,
}) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  if (requireBusiness && !isBusinessOwner()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
