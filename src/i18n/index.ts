import { Platform, NativeModules, I18nManager } from 'react-native';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import ar from './locales/ar';
import tr from './locales/tr';
import id from './locales/id';
import ur from './locales/ur';
import fr from './locales/fr';
import de from './locales/de';

I18nManager.allowRTL(true);

export { i18n };

export const SUPPORTED_LANGS = ['en', 'ar', 'tr', 'id', 'ur', 'fr', 'de'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export const isRtl = (lang: string) => lang === 'ar' || lang === 'ur';

function getDeviceLang(): string {
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;
  return (locale ?? 'en').replace('_', '-').split('-')[0].toLowerCase();
}

const deviceLang = getDeviceLang();
const initialLang = SUPPORTED_LANGS.includes(deviceLang as AppLang) ? deviceLang : 'en';

export function changeLanguage(lang: AppLang) {
  i18n.changeLanguage(lang);
}

export function initI18n(persistedLang: string | null) {
  const lang = persistedLang ?? initialLang;
  return i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      tr: { translation: tr },
      id: { translation: id },
      ur: { translation: ur },
      fr: { translation: fr },
      de: { translation: de },
    },
    lng: lang,
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
  });
}
