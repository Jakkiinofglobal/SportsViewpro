import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import SignupPage from '@/pages/SignupPage';
import LoginPage from '@/pages/LoginPage';
import SportSelectPage from '@/pages/SportSelectPage';
import AppShell from '@/shell/AppShell';
import { useAuth } from '@/context/auth';
import { useUserPrefs } from '@/context/userPrefs';

const GuardAuth: React.FC<{children:React.ReactNode}> = ({children}) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signup" replace />;
  return <>{children}</>;
};

const GuardSport: React.FC<{children:React.ReactNode}> = ({children}) => {
  const { prefs } = useUserPrefs();
  if (!prefs.selectedSport) return <Navigate to="/select-sport" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  { path: '/signup', element: <SignupPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/select-sport', element: <GuardAuth><SportSelectPage/></GuardAuth> },
  { path: '/', element:
      <GuardAuth>
        <GuardSport>
          <AppShell/>
        </GuardSport>
      </GuardAuth>
  },
]);
