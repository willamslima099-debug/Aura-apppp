
import React, { useState, useEffect } from 'react';
import { AppState, User } from './types';
import { dbService } from './services/db';
import Auth from './components/Auth';
import AuraMain from './components/AuraMain';
import Landing from './components/Landing';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false
  });
  const [showAuth, setShowAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await dbService.init();
        const savedUser = localStorage.getItem('aura_current_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setState({ user, isAuthenticated: true });
        }
      } catch (error) {
        console.error("Erro ao inicializar banco de dados local:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem('aura_current_user', JSON.stringify(user));
    setState({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_current_user');
    setState({ user: null, isAuthenticated: false });
    setShowAuth(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[#050505]">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
          </div>
          <div className="animate-pulse flex flex-col items-center space-y-2">
            <span className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px]">Iniciando Sistemas</span>
            <span className="text-blue-400/60 font-medium text-xs">Aura está se despertando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#050505]">
      {state.isAuthenticated && state.user ? (
        <AuraMain user={state.user} onLogout={handleLogout} />
      ) : showAuth ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Landing onStart={() => setShowAuth(true)} />
      )}
    </div>
  );
};

export default App;
