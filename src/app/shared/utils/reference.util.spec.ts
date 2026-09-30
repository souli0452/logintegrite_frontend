import { referencePersonne } from './reference.util';

describe('referencePersonne', () => {
  it('distingue deux fiches creees a la meme seconde (meme debut d identifiant)', () => {
    const a = referencePersonne('01a0f150-94f9-7c5c-8f6b-88bdec7da51d', 'PHYSIQUE');
    const b = referencePersonne('01a0f150-94f9-7c5c-8f6b-11aa22bb33cc', 'PHYSIQUE');
    expect(a).toBe('PERS-7DA51D');
    expect(b).toBe('PERS-BB33CC');
    expect(a).not.toBe(b);
  });

  it('utilise ORG pour une personne morale', () => {
    expect(referencePersonne('01a0f150-94f9-7c5c-8f6b-88bdec7da51d', 'MORALE')).toBe('ORG-7DA51D');
  });
});
