import { PaginatorFrancais } from './paginator-francais';

describe('PaginatorFrancais', () => {
  const paginator = new PaginatorFrancais();

  it('affiche la plage en francais', () => {
    expect(paginator.getRangeLabel(0, 20, 7)).toBe('1 – 7 sur 7');
    expect(paginator.getRangeLabel(1, 20, 45)).toBe('21 – 40 sur 45');
    expect(paginator.getRangeLabel(0, 20, 0)).toBe('0 sur 0');
  });

  it('traduit les libelles', () => {
    expect(paginator.itemsPerPageLabel).toBe('Éléments par page');
  });
});
