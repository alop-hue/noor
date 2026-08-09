import surahs from '@/assets/data/surahs.json';

const arabicNames = new Map(surahs.map((s) => [s.id, s.name]));

export function arabicSurahName(id: number): string {
  return arabicNames.get(id) ?? '';
}

export function surahDisplayName(id: number, name: string, language: string): string {
  return language.startsWith('ar') ? (arabicNames.get(id) ?? name) : name;
}
