import { colorizeWords, splitWords } from '../tajweed';

describe('splitWords', () => {
  it('splits ayah text into words', () => {
    expect(splitWords('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ')).toHaveLength(4);
    expect(splitWords('بِسْمِ اللَّهِ')).toEqual(['بِسْمِ', 'اللَّهِ']);
  });
});

describe('colorizeWords', () => {
  it('marks madd words', () => {
    const spans = colorizeWords(['قَالَ', 'آمَنَّا']);
    const flat = spans.flat();
    expect(flat.find((s) => s.text === 'قَالَ')?.color).toBe('madd');
  });

  it('marks qalqalah words', () => {
    const qal = colorizeWords(['قُلْ'])[0][0];
    expect(qal.color).toBe('qalqalah');
  });

  it('marks ghunnah (shadda on noon/meem) but hamza wins', () => {
    const spans = colorizeWords(['ثُمَّ', 'إِنَّ']);
    expect(spans[0][0].color).toBe('ghunnah');
    expect(spans[1][0].color).toBe('hamzat');
  });

  it('keeps plain words default', () => {
    const spans = colorizeWords(['ذَلِكَ']);
    expect(spans[0][0].color).toBe('default');
  });
});
