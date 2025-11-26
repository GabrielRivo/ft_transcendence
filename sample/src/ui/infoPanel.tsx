import { createElement } from 'my-react';

export default function InfoPanel() {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Mini Test
        </h3>
        <p className="text-gray-600 mb-4">
          Test de (useState, useEffect, useContext)
          et le rendu concurrent !
        </p>
      </div>
    );
  }