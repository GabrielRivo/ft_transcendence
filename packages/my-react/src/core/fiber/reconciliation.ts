import type { Fiber, Element } from '../types';
import { getDeletions } from '../component';

// Réconciliation des enfants
export function reconcileChildren(wipFiber: Fiber, elements: Element[]): void {
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling: Fiber | null = null;

  // 1. Indexer les anciens fibers par key (ou index si pas de key)
  const oldFibersMap = new Map<string | number, Fiber>();
  let tempOldFiber = oldFiber;
  let index = 0;
  
  while (tempOldFiber) {
    const key = tempOldFiber.props.key !== undefined ? tempOldFiber.props.key : index;
    oldFibersMap.set(key, tempOldFiber);
    tempOldFiber = tempOldFiber.sibling;
    index++;
  }

  // 2. Parcourir les nouveaux elements et reconcilie
  index = 0;
  for (const element of elements) {
    let newFiber: Fiber | null = null;
    
    // Key de l'element actuel
    const key = element.props.key !== undefined ? element.props.key : index;
    
    // Chercher une correspondance dans les anciens fibers
    const matchedFiber = oldFibersMap.get(key);
    const sameType = matchedFiber && matchedFiber.type === element.type;

    if (sameType && matchedFiber) {
      // UPDATE: On a trouve un fiber correspondant, on le met a jour
      newFiber = {
        type: matchedFiber.type,
        props: element.props,
        dom: matchedFiber.dom,
        parent: wipFiber,
        alternate: matchedFiber,
        effectTag: "UPDATE",
      };
      // On retire le fiber utilise de la map pour ne pas le supprimer plus tard
      oldFibersMap.delete(key);
    } else {
      // PLACEMENT: Pas de match ou type different, on creer un nouveau
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
      
      // Si on avait un match de key mais pas de type, l'ancien est invalide
      // Il restera dans la map et sera supprime a la fin, ou on peut le supprimer tout de suite si on veut etre strict sur la key unique.
      // Ici on laisse la map gérer les suppressions restantes.
    }

    // Securite pour les Providers/Portals
    if (newFiber && (newFiber.type === 'CONTEXT_PROVIDER' || newFiber.type === 'PORTAL')) {
      newFiber.dom = null;
    }

    // Chaining des freres
    if (index === 0) {
      wipFiber.child = newFiber || undefined;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber || undefined;
    }

    prevSibling = newFiber;
    index++;
  }

  // 3. Supprimer les anciens fibers restants (ceux qui n'ont pas ete reutilises)
  oldFibersMap.forEach((fiber) => {
    fiber.effectTag = "DELETION";
    getDeletions().push(fiber);
  });
}
