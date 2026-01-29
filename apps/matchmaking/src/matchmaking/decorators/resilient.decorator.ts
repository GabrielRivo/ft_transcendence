/**
 * Options de configuration pour le décorateur Resilient.
 * Le type générique T représente le type de retour de la méthode décorée.
 * On définit T = any par défaut pour éviter l'erreur TS2314 si le type n'est pas spécifié.
 */
export interface ResilientOptions<T = any> {
  /**
   * Nom du service ou du contexte pour les logs (ex: 'UserService').
   */
  context: string;

  /**
   * Valeur de retour par défaut en cas d'échec ou de timeout.
   * Peut être une valeur statique ou une fonction retournant une valeur.
   */
  fallback: T | (() => T);

  /**
   * Durée maximale en millisecondes avant d'abandonner l'exécution.
   * @default 5000
   */
  timeoutMs?: number;

  /**
   * Si true, l'erreur originale sera loggée en 'error' au lieu de 'warn'.
   * Utile pour les appels critiques qui ne devraient jamais échouer.
   * @default false
   */
  logAsError?: boolean;
}

/**
 * Décorateur de méthode pour ajouter de la résilience (Timeout + Fallback).
 * Enveloppe la méthode originale dans un try/catch avec gestion de timeout.
 */
export function Resilient<T>(options: ResilientOptions) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const timeoutMs = options.timeoutMs ?? 5000;

    descriptor.value = async function (...args: any[]) {
      const getFallbackValue = (): T => {
        if (typeof options.fallback === 'function') {
          return (options.fallback as Function)();
        }
        return options.fallback;
      };

      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      try {
        const result = await Promise.race([
          originalMethod.apply(this, args),
          timeoutPromise,
        ]);

        clearTimeout(timeoutId!);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId!);
        return getFallbackValue();
      }
    };
    
    return descriptor;
  };
}