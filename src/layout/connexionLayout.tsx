import { Element, createElement } from 'my-react'; // Ou ton import spécifique 'my-react'
import { CardStyle1 } from '../components/ui/card/style1';

export function ConnexionLayout({ children }: { children: Element }) {
	return <CardStyle1>{children}</CardStyle1>;
}
