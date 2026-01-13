
import React, { useState } from 'react';
import Layout from './components/Layout';
import { Dashboard } from './components/Dashboard';
import AIChat from './components/AIChat';
import Attendance from './components/Attendance';
import Sliks from './components/Sliks';
import Profile from './components/Profile';
import History from './components/History';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import { AppView } from './types';
import { useAuth } from './contexts/AuthContext';
import Spinner from './components/Spinner';


const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-[#0f172a]">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return showLogin 
      ? <LoginPage onSwitchToRegister={() => setShowLogin(false)} /> 
      : <RegisterPage onSwitchToLogin={() => setShowLogin(true)} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <Dashboard isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} setActiveView={setActiveView} />;
      case 'ai-assistant':
        return <AIChat isDarkMode={isDarkMode} />;
      case 'attendance':
        return <Attendance isDarkMode={isDarkMode} setActiveView={setActiveView} />;
      case 'sliks':
        return <Sliks isDarkMode={isDarkMode} setActiveView={setActiveView} />;
      case 'profile':
        return <Profile isDarkMode={isDarkMode} setActiveView={setActiveView} />;
      case 'history':
        return <History isDarkMode={isDarkMode} setActiveView={setActiveView} />;
      default:
        return <Dashboard isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} setActiveView={setActiveView} />;
    }
  };

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} isDarkMode={isDarkMode}>
      {renderView()}
    </Layout>
  );
};

export default App;
