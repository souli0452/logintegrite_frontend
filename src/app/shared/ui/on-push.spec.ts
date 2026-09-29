import { StatusBadge } from './status-badge/status-badge';
import { EmptyState } from './empty-state/empty-state';
import { ConfirmDialog } from './confirm-dialog/confirm-dialog';

/** Definition interne Angular (ɵcmp) : onPush vaut true quand changeDetection = OnPush. */
const estOnPush = (composant: unknown): boolean =>
  (composant as { ɵcmp: { onPush: boolean } }).ɵcmp.onPush;

describe('Composants partages', () => {
  it.each([
    ['StatusBadge', StatusBadge],
    ['EmptyState', EmptyState],
    ['ConfirmDialog', ConfirmDialog]
  ])('%s utilise la detection de changements OnPush', (_nom, composant) => {
    expect(estOnPush(composant)).toBe(true);
  });
});
