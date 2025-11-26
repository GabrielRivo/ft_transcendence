import { useState, useEffect, useContext, createElement } from 'my-react';
import { ThemeContext, ThemeContextType } from './ThemeProvider';

export default function Counter() {
    const [count, setCount] = useState<number>(0);
    const [name, setName] = useState<string>('');
    const {theme, setTheme} = useContext(ThemeContext) as ThemeContextType;
    useEffect(() => {
      console.log('Count changed:', count);
      document.title = `Count: ${count}`;
      return () => {
        console.log('Cleanup for count:', count);
      };
    }, [count]);
    useEffect(() => {
      console.log('Name changed:', name);
    }, [name]);
    const themeClasses = theme === 'dark'
      ? 'bg-gray-800 text-white'
      : 'bg-white text-gray-900';

    return (
      <div className={`p-8 rounded-lg shadow-lg ${themeClasses} max-w-md mx-auto`}>
        <h1 className="text-3xl font-bold mb-4">Count: {count}</h1>
        <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl">Theme: {theme} </h2>
        <button
            className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            Basculer vers le thème {theme === 'light' ? 'sombre' : 'clair'}
          </button>
        </div>
        <div className="space-x-4 mb-6">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => setCount(count + 1)}
          >
            +1
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            onClick={() => setCount(count - 1)}
          >
            -1
          </button>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            onClick={() => setCount(0)}
          >
            Reset
          </button>
        </div>
        <div className="mb-4">
          <input
            type="text"
            value={name}
            onInput={(e: Event) => setName((e.target as HTMLInputElement).value)}
            placeholder="Votre nom..."
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
        {name && (
          <p className="text-lg">
            Bonjour, <span className="font-bold text-blue-500">{name}</span>! 👋
          </p>
        )}
      </div>
    );
  }