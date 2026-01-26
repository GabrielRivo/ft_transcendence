import { createElement, Element } from 'my-react';
import { OTPGuard } from '../components/guards';

interface OTPLayoutProps {
	children?: Element;
}

export function OTPLayout({ children }: OTPLayoutProps) {
	return <OTPGuard>{children}</OTPGuard>;
}
