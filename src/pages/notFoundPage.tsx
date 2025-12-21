import { createElement } from "my-react";
import { Link } from "my-react-router";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 text-white text-center">
      <div>
        <h1 className="text-9xl m-0">404</h1>
        <h2 className="text-3xl mt-4">Page non trouvée</h2>
        <p className="text-xl text-gray-400 mt-4">
          Oups! La page que vous cherchez n'existe pas.
        </p>
        <Link to="/" className="inline-block mt-8 px-8 py-4 bg-blue-600 text-white no-underline rounded-lg font-bold hover:bg-blue-700 transition-colors">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}