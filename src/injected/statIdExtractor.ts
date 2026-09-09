import { startStatIdObserver } from './statIdObserver';

// Runs in the page's MAIN world, where Vue filter IDs are accessible.
const statIds = startStatIdObserver();
const statIdDebugWindow = window as Window & { __extractStatIds?: () => void };
statIdDebugWindow.__extractStatIds = statIds.extract;
