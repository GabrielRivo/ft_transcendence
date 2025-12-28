import { z, ZodSchema } from 'zod';

/**
 * Décorateur pour valider automatiquement le résultat d'une méthode asynchrone
 * par rapport à un schéma Zod.
 *
 * Si la validation échoue, une erreur explicite est levée.
 * Cette erreur peut être capturée par un décorateur de résilience parent (ex: @Resilient).
 *
 * @param schema - Le schéma Zod à appliquer sur la valeur de retour.
 */
export function ValidateResult(schema: ZodSchema) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const methodName = propertyKey;
      const context = target.constructor.name; // Ex: 'UserService'

      // 1. Exécution de la méthode originale (récupération des données brutes)
      const result = await originalMethod.apply(this, args);

      // 2. Validation des données
      const validation = schema.safeParse(result);

      if (!validation.success) {
        console.warn(
          `[ValidateResult] [${context}] [${methodName}] Validation Failed | Issues: ${JSON.stringify(validation.error.issues)}`
        );
        // On lève une erreur pour signaler que le contrat d'interface n'est pas respecté.
        // Cela permet aux mécanismes de fallback (ex: @Resilient) de prendre le relais.
        throw new Error(`Data validation failed for ${methodName}`);
      }

      console.debug(
        `[ValidateResult] [${context}] [${methodName}] Validation Success.`
      );

      // 3. Retourne les données validées (et potentiellement transformées/nettoyées par Zod)
      return validation.data;
    };

    return descriptor;
  };
}