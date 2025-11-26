import { createElement, Fragment, render, useState, useEffect, useContext, createContext } from 'my-react';


import ThemeProvider, { ThemeContext, ThemeContextType } from './ui/ThemeProvider';
import InfoPanel from './ui/infoPanel';
import Counter from './ui/counter';


export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <ThemeProvider value={{theme, setTheme}}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Mini Test
            </h1>
            <InfoPanel />
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
              }`}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              Basculer vers le thème {theme === 'light' ? 'sombre' : 'clair'}
            </button>
          </header>
          <main>
            <Counter />
          </main>
          <footer className="text-center mt-8 text-gray-600">
            <p>Créé avec Amour !!!</p>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}