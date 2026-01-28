import { createContext } from 'my-react';

export interface User {
	id: number;
	email: string;
	username: string;
	noUsername: boolean;
	suggestedUsername?: string;
	twoFA?: boolean;
	twoFAVerified?: boolean;
	isGuest?: boolean;
}

export interface AuthContextType {
	isAuthenticated: boolean;
	user: User | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<boolean>;
	register: (email: string, password: string) => Promise<boolean>;
	loginAsGuest: (username: string) => Promise<boolean>;
	logout: () => Promise<void>;
	checkAuth: () => Promise<void>;
	setUsername: (username: string) => Promise<boolean>;
	verify2FA: (code: string) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
