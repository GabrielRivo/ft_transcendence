import { createContext, useState, createElement } from 'my-react';

export type ThemeContextType = {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
};

export const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
    setTheme: () => {}
});


export default function ThemeProvider({ children, value }: { children?: any, value?: ThemeContextType}) {
    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}