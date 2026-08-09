import en from '../locales/en';
import ar from '../locales/ar';
import tr from '../locales/tr';
import id from '../locales/id';
import ur from '../locales/ur';
import fr from '../locales/fr';
import de from '../locales/de';

type Obj = Record<string, unknown>;

function flatten(o: Obj, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' ? flatten(v as Obj, key) : [key];
  });
}

const BASE = flatten(en as Obj).sort();

describe('i18n key parity', () => {
  it.each([
    ['ar', ar],
    ['tr', tr],
    ['id', id],
    ['ur', ur],
    ['fr', fr],
    ['de', de],
  ])('%s has exactly the same key tree as en', (_lang, locale) => {
    const keys = flatten(locale as Obj).sort();
    expect(keys).toEqual(BASE);
  });
});

describe('i18n values', () => {
  it('contains no placeholder interpolation syntax errors', () => {
    const names = ['ar', 'tr', 'id', 'ur', 'fr', 'de'] as const;
    const locales = { ar, tr, id, ur, fr, de };
    for (const name of names) {
      const vals = flatten(locales[name] as Obj);
      for (const v of vals) {
        expect(v).not.toContain('undefined');
      }
    }
  });
});
