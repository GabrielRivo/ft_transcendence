import type { Fiber } from '../types';
import { getWipRoot, getDeletions, setCurrentRoot, setWipRoot } from '../component';
import { commitWork } from './commitWork';
import { checkPendingRender } from '../hooks/useState';

// Commit des changements dans le DOM
export function commitRoot(): void {
  const wipRoot = getWipRoot();
  if (!wipRoot) return;
  
  getDeletions().forEach(commitWork);
  if (wipRoot.child) {
    commitWork(wipRoot.child);
  }
  setCurrentRoot(wipRoot);
  setWipRoot(null);
  checkPendingRender();
} 