#!/usr/bin/env node
/**
 * Master data build: downloads all Islamic datasets and compiles them into
 * a single gzipped SQLite seed database (assets/data/quran.db.gz).
 *
 * Sources:
 *  - Quran text + translations  : fawazahmed0/quran-api (master branch)
 *  - Tafsir (Ibn Kathir EN, Sa'di AR, Muyassar AR): sad-adnan/quran-tafsir-json
 *  - Tafsir Jalalayn AR         : fawazahmed0/quran-api (ara-jalaladdinalmah)
 *  - Hadith (9 collections)     : CheeseWithSauce/HadithsJSONFormat
 *  - Reciters + audio servers   : mp3quran.net API v3
 *  - Athan recordings           : archive.org (public recordings)
 *  - Surah metadata             : api.alquran.cloud
 *
 * Run: node scripts/build-data.mjs
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW = '/tmp/opencode/quran-data/raw';
const OUT = path.join(ROOT, 'assets', 'data');
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

let better;
try {
  better = (await import('better-sqlite3')).default;
} catch {
  console.log('installing better-sqlite3…');
  execSync('npm i -D better-sqlite3', { cwd: ROOT, stdio: 'inherit' });
  better = (await import('better-sqlite3')).default;
}

/* ----------------------------- helpers ----------------------------- */

async function fetchJson(url, name) {
  const file = path.join(RAW, name);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  console.log('  download', name);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  const text = buf.toString('utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}

async function fetchBuffer(url, name) {
  const file = path.join(RAW, name);
  if (existsSync(file)) return readFileSync(file);
  console.log('  download', name);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  return buf;
}

const u = (path) => `https://raw.githubusercontent.com/fawazahmed0/quran-api/master/editions/${path}`;
const hadithBase = 'https://raw.githubusercontent.com/CheeseWithSauce/HadithsJSONFormat/main/Sunnah/';
const tafsirBase = 'https://raw.githubusercontent.com/sad-adnan/quran-tafsir-json/main/minified/';

/* ------------------------- normalized arabic ------------------------ */

const DIACRITICS = /[\u064B-\u065F\u0670\u0640\u0656-\u065E\u06D6-\u06ED\u08D3-\u08E1]/g;
export function normalizeArabic(s) {
  return s
    .replace(DIACRITICS, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0649\u0624\u0626]/g, '\u064A')
    .replace(/\u0671/g, '\u0627')
    .trim();
}

function htmlToText(html) {
  return html
    .replace(/<h1[^>]*>/g, '\n\n')
    .replace(/<h2[^>]*>/g, '\n\n')
    .replace(/<h3[^>]*>/g, '\n\n')
    .replace(/<p[^>]*>/g, '\n')
    .replace(/<br[^>]*>/g, '\n')
    .replace(/<li[^>]*>/g, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ----------------------------- sources ------------------------------ */

const TRANSLATIONS = [
  { lang: 'en', edition: 'sahih', file: 'eng-muhammadtaqiudd.json', label: 'Saheeh International' },
  { lang: 'en', edition: 'yusufali', file: 'eng-abdullahyusufal.json', label: 'Yusuf Ali' },
  { lang: 'en', edition: 'maududi', file: 'eng-maududi.json', label: 'Tafhim al-Quran (Maududi)' },
  { lang: 'ur', edition: 'jalandhry', file: 'urd-ahmedali.json', label: 'Ahmed Ali (Urdu)' },
  { lang: 'tr', edition: 'diyanet', file: 'tur-alibulac.json', label: 'Ali Bulaç (Türkçe)' },
  { lang: 'id', edition: 'kemenag', file: 'ind-kingfahdcomplex.json', label: 'Kementerian Agama (Indonesia)' },
  { lang: 'fr', edition: 'hamidullah', file: 'fra-muhammadhamidul.json', label: 'Muhammad Hamidullah (Français)' },
  { lang: 'de', edition: 'aburida', file: 'deu-aburidamuhammad.json', label: 'Abu Rida (Deutsch)' },
  { lang: 'ru', edition: 'kuliev', file: 'rus-elmirkuliev.json', label: 'Elmir Kuliev (Русский)' },
];

const TAFSIRS = [
  { source: 'ibn-kathir-en', file: 'tafsir_169_Ibn_Kathir_Abridged__english.json', label: 'Tafsir Ibn Kathir (English, abridged)', language: 'en' },
  { source: 'saadi', file: 'tafsir_91__Al-Sa_di_arabic.json', label: 'Tafsir As-Sa\'di', language: 'ar' },
  { source: 'ibn-kathir-ur', file: 'tafsir_160_Tafsir_Ibn_Kathir_urdu.json', label: 'Tafsir Ibn Kathir (Urdu)', language: 'ur' },
];

const HADITH_BOOKS = [
  { slug: 'bukhari', title: 'Sahih al-Bukhari', arabic: 'صحيح البخاري', author: 'Muhammad al-Bukhari', author_arabic: 'محمد بن إسماعيل البخاري', match: /(?:^|\/)bukhari\// },
  { slug: 'muslim', title: 'Sahih Muslim', arabic: 'صحيح مسلم', author: 'Muslim ibn al-Hajjaj', author_arabic: 'مسلم بن الحجاج', match: /(?:^|\/)muslim\// },
  { slug: 'abudawud', title: 'Sunan Abi Dawud', arabic: 'سنن أبي داود', author: 'Abu Dawud as-Sijistani', author_arabic: 'أبو داود السجستاني', match: /(?:^|\/)abudawud\// },
  { slug: 'tirmidhi', title: 'Jami\' at-Tirmidhi', arabic: 'جامع الترمذي', author: 'Muhammad at-Tirmidhi', author_arabic: 'محمد بن عيسى الترمذي', match: /(?:^|\/)tirmidhi\// },
  { slug: 'nasai', title: 'Sunan an-Nasa\'i', arabic: 'سنن النسائي', author: 'Ahmad an-Nasa\'i', author_arabic: 'أحمد بن شعيب النسائي', match: /(?:^|\/)nasai\// },
  { slug: 'ibnmajah', title: 'Sunan Ibn Majah', arabic: 'سنن ابن ماجه', author: 'Muhammad ibn Majah', author_arabic: 'محمد بن يزيد ابن ماجه', match: /(?:^|\/)ibnmajah\// },
  { slug: 'malik', title: 'Muwatta Malik', arabic: 'موطأ مالك', author: 'Malik ibn Anas', author_arabic: 'مالك بن أنس', match: /(?:^|\/)malik\// },
  { slug: 'riyadussalihin', title: 'Riyad as-Salihin', arabic: 'رياض الصالحين', author: 'An-Nawawi', author_arabic: 'يحيى بن شرف النووي', match: /(?:^|\/)riyadussalihin\// },
  { slug: 'nawawi40', title: 'An-Nawawi\'s Forty Hadith', arabic: 'الأربعون النووية', author: 'An-Nawawi', author_arabic: 'يحيى بن شرف النووي', match: /(?:^|\/)forty\/forty_hadith_of_an-nawawi/ },
  { slug: 'adab', title: 'Al-Adab al-Mufrad', arabic: 'الأدب المفرد', author: 'Muhammad al-Bukhari', author_arabic: 'محمد بن إسماعيل البخاري', match: /(?:^|\/)adab\// },
  { slug: 'ahmad', title: 'Musnad Ahmad', arabic: 'مسند أحمد', author: 'Ahmad ibn Hanbal', author_arabic: 'أحمد بن حنبل', match: /(?:^|\/)ahmad\// },
  { slug: 'bulugh', title: 'Bulugh al-Maram', arabic: 'بلوغ المرام', author: 'Ibn Hajar al-Asqalani', author_arabic: 'ابن حجر العسقلاني', match: /(?:^|\/)bulugh\// },
  { slug: 'darimi', title: 'Sunan ad-Darimi', arabic: 'سنن الدارمي', author: 'Ad-Darimi', author_arabic: 'عبد الله بن عبد الرحمن الدارمي', match: /(?:^|\/)darimi\// },
  { slug: 'mishkat', title: 'Mishkat al-Masabih', arabic: 'مشكاة المصابيح', author: 'Al-Khatib at-Tabrizi', author_arabic: 'الخطيب التبريزي', match: /(?:^|\/)mishkat\// },
  { slug: 'shamail', title: 'Ash-Shama\'il al-Muhammadiyya', arabic: 'الشمائل المحمدية', author: 'Muhammad at-Tirmidhi', author_arabic: 'محمد بن عيسى الترمذي', match: /(?:^|\/)shamail\// },
];

const RECITERS = [
  { id: 'mishary_alafasy', name: 'Mishary Rashid Alafasy', style: 'Makkah', server: 'https://server8.mp3quran.net/afs/' },
  { id: 'abdul_basit', name: 'Abdul Basit Abdus-Samad', style: 'Egypt', server: 'https://server7.mp3quran.net/basit/' },
  { id: 'maher_almuaiqly', name: 'Maher Al-Muaiqly', style: 'Makkah', server: 'https://server12.mp3quran.net/maher/' },
  { id: 'saad_alghamdi', name: 'Saad Al-Ghamdi', style: 'Saudi', server: 'https://server7.mp3quran.net/s_gmd/' },
  { id: 'yasser_aldosari', name: 'Yasser Al-Dosari', style: 'Makkah', server: 'https://server11.mp3quran.net/yasser/' },
  { id: 'saud_alshuraim', name: 'Saud Al-Shuraim', style: 'Makkah', server: 'https://server7.mp3quran.net/shur/' },
  { id: 'fares_abbad', name: 'Fares Abbad', style: 'Yemen', server: 'https://server8.mp3quran.net/frs_a/' },
  { id: 'hani_arifai', name: 'Hani Ar-Rifai', style: 'Madinah', server: 'https://server8.mp3quran.net/hani/' },
  { id: 'nasser_alqatami', name: 'Nasser Al-Qatami', style: 'Kuwait', server: 'https://server6.mp3quran.net/qtm/' },
  { id: 'ali_jaber', name: 'Ali Jaber', style: 'Saudi', server: 'https://server11.mp3quran.net/a_jbr/' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', style: 'Egypt', server: 'https://server13.mp3quran.net/husr/' },
  { id: 'minshawi', name: 'Muhammad Siddiq Al-Minshawi', style: 'Egypt', server: 'https://server10.mp3quran.net/minsh/' },
];

const ATHANS = [
  { id: 'makkah', label: 'Makkah (Alafasy)', url: 'https://archive.org/download/AzanAl3fasy/AZAN.mp3', file: 'athan-makkah.mp3' },
  { id: 'hejaz', label: 'Hejazi style', url: 'https://archive.org/download/alomrany_azan/Azan_Al-Hejaz.mp3', file: 'athan-hejaz.mp3' },
  { id: 'ajam', label: 'Ajam (Turkish) style', url: 'https://archive.org/download/alomrany_azan/Azan_Ajam.mp3', file: 'athan-ajam.mp3' },
  { id: 'fajr', label: 'Fajr adhan', url: 'https://archive.org/download/alomrany_azan/Azan_Al-Fajr.mp3', file: 'athan-fajr.mp3' },
  { id: 'alafasy_hd', label: 'Alafasy HD (Fajr, Maqam Hijaz)', url: 'https://archive.org/download/adhan-call-to-prayer-mishary-rashid-alafasy-fajr-maqam-hijaz-hd-320-kbps-1/' + encodeURIComponent('Adhan (Call to prayer) _ Mishary Rashid Alafasy _ Fajr _ Maqam Hijaz ᴴᴰ (320 kbps) (1).mp3'), file: 'athan-alafasy-hd.mp3' },
  { id: 'alafasy_1431', label: 'Alafasy 1431', url: 'https://archive.org/download/Athan-AlafasyByDarifton/Athan-Alafasy1431.mp3', file: 'athan-alafasy-1431.mp3' },
];

/* --------------------------- adhkar data ---------------------------- */

const ADHKAR = [
  { category: 'morning', arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', transliteration: 'Asbahna wa asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah', translation: 'We have entered the morning, and all dominion belongs to Allah. Praise be to Allah. There is none worthy of worship but Allah alone, with no partner.', count: 1, source: 'Muslim 2723' },
  { category: 'morning', arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', transliteration: 'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namut, wa ilaykan-nushur', translation: 'O Allah, by You we have entered the morning, and by You we enter the evening, by You we live, by You we die, and to You is the final return.', count: 1, source: 'Tirmidhi 3391' },
  { category: 'morning', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'Subhanallahi wa bihamdih', translation: 'Glory be to Allah, and all praise is due to Him.', count: 100, source: 'Muslim 2692' },
  { category: 'morning', arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', transliteration: 'Bismillahil-ladhi la yadurru ma\'asmihi shay\'un fil-ardi wa la fis-sama\'i wa huwas-Sami\'ul-\'Alim', translation: 'In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, All-Knowing.', count: 3, source: 'Abu Dawud 5088' },
  { category: 'morning', arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا', transliteration: 'Raditu billahi rabban, wa bil-islami dinan, wa bi-Muhammadin sallallahu \'alayhi wa sallam nabiyyan', translation: 'I am pleased with Allah as my Lord, Islam as my religion, and Muhammad (peace be upon him) as my Prophet.', count: 3, source: 'Abu Dawud 5072' },
  { category: 'morning', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', transliteration: 'Allahumma inni as\'alukal-\'afwa wal-\'afiyah fid-dunya wal-akhirah', translation: 'O Allah, I ask You for pardon and well-being in this world and the Hereafter.', count: 1, source: 'Abu Dawud 5074' },
  { category: 'morning', arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', transliteration: 'Hasbiyallahu la ilaha illa huwa, \'alayhi tawakkaltu wa huwa Rabbul-\'arshil-\'azim', translation: 'Allah is sufficient for me; there is none worthy of worship but Him. Upon Him I rely, and He is the Lord of the Mighty Throne.', count: 7, source: 'Abu Dawud 5081' },
  { category: 'morning', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', transliteration: 'A\'udhu bikalimatillahit-tammati min sharri ma khalaq', translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', count: 3, source: 'Muslim 2708' },
  { category: 'morning', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', transliteration: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, wa huwa \'ala kulli shay\'in qadir', translation: 'There is none worthy of worship but Allah alone, with no partner. His is the dominion and His is the praise, and He is capable of all things.', count: 4, source: 'Bukhari 3293' },
  { category: 'morning', arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', transliteration: 'Ya Hayyu ya Qayyumu birahmatika astaghith, aslih li sha\'ni kullahu, wa la takilni ila nafsi tarfata \'ayn', translation: 'O Ever-Living, O Self-Sustaining, by Your mercy I seek help. Set right all my affairs, and do not leave me to myself even for the blink of an eye.', count: 1, source: 'Hakim, sahih' },
  { category: 'morning', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ', transliteration: 'Subhanallahi wa bihamdih, \'adada khalqih, wa rida nafsih, wa zinata \'arshih, wa midada kalimatih', translation: 'Glory be to Allah and praise is due to Him, as many times as the number of His creation, as much as pleases Him, the weight of His Throne, and the ink of His words.', count: 3, source: 'Muslim 2726' },
  { category: 'evening', arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', transliteration: 'Amsayna wa amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah', translation: 'We have entered the evening, and all dominion belongs to Allah. Praise be to Allah. There is none worthy of worship but Allah alone, with no partner.', count: 1, source: 'Muslim 2723' },
  { category: 'evening', arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', transliteration: 'Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namut, wa ilaykal-masir', translation: 'O Allah, by You we enter the evening, and by You we enter the morning, by You we live, by You we die, and to You is the final destination.', count: 1, source: 'Tirmidhi 3391' },
  { category: 'evening', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', transliteration: 'A\'udhu bikalimatillahit-tammati min sharri ma khalaq', translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', count: 3, source: 'Muslim 2708' },
  { category: 'evening', arabic: 'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ: أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ', transliteration: 'Allahumma inni amsaytu ush-hiduka, wa ush-hidu hamalata \'arshika, wa mala\'ikataka, wa jami\'a khalqika: annaka antallahu la ilaha illa ant, wa anna Muhammadan \'abduka wa rasuluk', translation: 'O Allah, I enter the evening calling You to witness, and the bearers of Your Throne, Your angels, and all of creation, that You are Allah, none worthy of worship but You, and that Muhammad is Your servant and Messenger.', count: 4, source: 'Abu Dawud 5069' },
  { category: 'evening', arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ', transliteration: 'Bismillahil-ladhi la yadurru ma\'asmihi shay\'', translation: 'In the name of Allah, with whose name nothing can cause harm.', count: 3, source: 'Abu Dawud 5088' },
  { category: 'evening', arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ', transliteration: 'Allahumma \'afini fi badani, Allahumma \'afini fi sam\'i, Allahumma \'afini fi basari, la ilaha illa ant', translation: 'O Allah, grant my body well-being. O Allah, grant my hearing well-being. O Allah, grant my sight well-being. None worthy of worship but You.', count: 3, source: 'Abu Dawud 5090' },
  { category: 'after-prayer', arabic: 'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah, astaghfirullah, astaghfirullah', translation: 'I seek Allah\'s forgiveness (three times).', count: 3, source: 'Muslim 591' },
  { category: 'after-prayer', arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', transliteration: 'Allahumma antas-Salam, wa minkas-Salam, tabarakta ya Dhal-Jalali wal-Ikram', translation: 'O Allah, You are Peace, and from You comes peace. Blessed are You, O Possessor of Majesty and Honour.', count: 1, source: 'Muslim 591' },
  { category: 'after-prayer', arabic: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ', transliteration: 'Subhanallah, wal-hamdu lillah, wallahu akbar', translation: 'Glory be to Allah, praise be to Allah, Allah is the Greatest.', count: 33, source: 'Muslim 596' },
  { category: 'after-prayer', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', transliteration: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, wa huwa \'ala kulli shay\'in qadir', translation: 'There is none worthy of worship but Allah alone, with no partner. His is the dominion and His is the praise, and He is capable of all things.', count: 1, source: 'Bukhari 844' },
  { category: 'after-prayer', arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', transliteration: 'Allahumma a\'inni \'ala dhikrika wa shukrika wa husni \'ibadatik', translation: 'O Allah, help me to remember You, to thank You, and to worship You in the best manner.', count: 1, source: 'Abu Dawud 1522' },
  { category: 'sleep', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', transliteration: 'Bismika Allahumma amutu wa ahya', translation: 'In Your name, O Allah, I die and I live.', count: 1, source: 'Bukhari 6324' },
  { category: 'sleep', arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', transliteration: 'Allahumma qini \'adhabaka yawma tab\'athu \'ibadak', translation: 'O Allah, protect me from Your punishment on the day You resurrect Your servants.', count: 3, source: 'Abu Dawud 5045' },
  { category: 'sleep', arabic: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ', transliteration: 'Bismika Rabbi wada\'tu janbi, wa bika arfa\'uh, fa-in amsakta nafsi farhamha, wa-in arsaltaha fahfazha bima tahfazu bihi \'ibadakas-salihin', translation: 'In Your name, my Lord, I lay down my side, and by You I raise it. If You take my soul, have mercy on it, and if You send it back, protect it as You protect Your righteous servants.', count: 1, source: 'Bukhari 6320' },
  { category: 'sleep', arabic: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ', transliteration: 'Subhanallah, wal-hamdu lillah, wallahu akbar', translation: 'Glory be to Allah, praise be to Allah, Allah is the Greatest.', count: 33, source: 'Bukhari 6318' },
  { category: 'sleep', arabic: 'آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ', transliteration: 'Amanar-rasulu bima unzila ilayhi min Rabbihi wal-mu\'minun', translation: 'The Messenger has believed in what was revealed to him from his Lord, and the believers (too). (Recite the last two verses of al-Baqarah.)', count: 1, source: 'Bukhari 4009' },
  { category: 'travel', arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', transliteration: 'Allahu akbar, Allahu akbar, Allahu akbar, Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa-inna ila Rabbina lamunqalibun', translation: 'Allah is the Greatest (three times). Glory be to Him who has subjected this to us, and we were not able to do it without Him. And to our Lord we will surely return.', count: 1, source: 'Muslim 1342' },
  { category: 'travel', arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى', transliteration: 'Allahumma inna nas\'aluka fi safarina hadhal-birra wat-taqwa, wa minal-\'amali ma tarda', translation: 'O Allah, we ask You in this journey of ours for righteousness and piety, and deeds that please You.', count: 1, source: 'Muslim 1342' },
  { category: 'general', arabic: 'سَيِّدُ الِاسْتِغْفَارِ: اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ', transliteration: 'Allahumma anta Rabbi la ilaha illa ant, khalaqtani wa ana \'abduk, wa ana \'ala \'ahdika wa wa\'dika mastata\'t', translation: 'O Allah, You are my Lord, none worthy of worship but You. You created me, and I am Your servant, and I abide by Your covenant and promise as best I can. (Sayyid al-Istighfar, continued with: "I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You.")', count: 1, source: 'Bukhari 6306' },
  { category: 'general', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', transliteration: 'La hawla wa la quwwata illa billah', translation: 'There is no might and no power except with Allah.', count: 100, source: 'Bukhari 6684' },
  { category: 'general', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ', transliteration: 'Allahumma salli \'ala Muhammadin wa \'ala ali Muhammad, kama sallayta \'ala Ibrahima wa \'ala ali Ibrahim, innaka Hamidun Majid', translation: 'O Allah, send prayers upon Muhammad and upon the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy, Glorious.', count: 1, source: 'Bukhari 3370' },
  { category: 'general', arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ', transliteration: 'A\'udhu billahi minash-shaytanir-rajim', translation: 'I seek refuge in Allah from the accursed Satan.', count: 1, source: 'Quran 16:98' },
  { category: 'general', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina \'adhaban-nar', translation: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.', count: 1, source: 'Quran 2:201' },
  { category: 'general', arabic: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ', transliteration: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin', translation: 'There is none worthy of worship but You. Glory be to You. Indeed, I was among the wrongdoers.', count: 1, source: 'Quran 21:87' },
  { category: 'general', arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ', transliteration: 'Subhanallahi wal-hamdu lillahi wa la ilaha illallahu wallahu akbar', translation: 'Glory be to Allah, praise be to Allah, none worthy of worship but Allah, and Allah is the Greatest.', count: 33, source: 'Muslim 2737' },
  { category: 'general', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى', transliteration: 'Allahumma inni as\'alukal-huda wat-tuqa wal-\'afafa wal-ghina', translation: 'O Allah, I ask You for guidance, piety, chastity, and sufficiency.', count: 1, source: 'Muslim 2721' },
  { category: 'general', arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', transliteration: 'Hasbunallahu wa ni\'mal-wakil', translation: 'Allah is sufficient for us, and He is the best disposer of affairs.', count: 1, source: 'Quran 3:173' },
];

/* ------------------------------ main -------------------------------- */

async function main() {
  console.log('== 1/5 Surah metadata ==');
  const surahs = (await fetchJson('https://api.alquran.cloud/v1/surah', 'surahs.json')).data;
  writeFileSync(path.join(OUT, 'surahs.json'), JSON.stringify(surahs.map((s) => ({
    id: s.number, name: s.name, englishName: s.englishName, translation: s.englishNameTranslation,
    type: s.revelationType, ayahs: s.numberOfAyahs,
  }))));

  console.log('== 2/5 Quran text + translations ==');
  const arabic = await fetchJson(u('ara-quranuthmanihaf.json'), 'ara-quranuthmanihaf.json');
  const ayahRows = arabic.quran.map((v) => ({ surah: v.chapter, ayah: v.verse, text: v.text }));
  const transRows = [];
  for (const t of TRANSLATIONS) {
    const data = await fetchJson(u(t.file), t.file);
    for (const v of data.quran) transRows.push({ surah: v.chapter, ayah: v.verse, lang: t.lang, edition: t.edition, text: v.text });
  }

  console.log('== 3/5 Tafsir ==');
  const tafsirRows = [];
  for (const t of TAFSIRS) {
    const data = await fetchJson(tafsirBase + t.file, t.file);
    const list = Array.isArray(data) ? data : data.data;
    if (Array.isArray(list) && list.length && list[0] && list[0].groups) {
      for (const ch of list) {
        for (const g of ch.groups) {
          const text = htmlToText(g.tafseer);
          tafsirRows.push({ source: t.source, language: t.language, surah: ch.chapter, start: g.start, end: g.end, text });
        }
      }
    } else if (Array.isArray(list)) {
      for (const v of list) {
        const surah = v.chapter ?? v.surah;
        const ayah = v.verse ?? v.ayah;
        const text = v.text ?? v.tafsir;
        if (surah == null || ayah == null || !text) continue;
        tafsirRows.push({ source: t.source, language: t.language, surah, start: ayah, end: ayah, text });
      }
    } else {
      throw new Error('unexpected tafsir shape for ' + t.source);
    }
    console.log('  ', t.source, tafsirRows.filter((r) => r.source === t.source).length, 'rows');
  }
  const jalalayn = await fetchJson(u('ara-jalaladdinalmah.json'), 'ara-jalaladdinalmah.json');
  for (const v of jalalayn.quran) tafsirRows.push({ source: 'jalalayn', language: 'ar', surah: v.chapter, start: v.verse, end: v.verse, text: v.text });
  console.log('  jalalayn', tafsirRows.filter((r) => r.source === 'jalalayn').length, 'rows');

  console.log('== 4/5 Hadith (9 books) ==');
  const dbPath = path.join('/tmp/opencode/quran-data', 'seed.db');
  if (existsSync(dbPath)) execSync(`rm "${dbPath}"`);
  const db = new better(dbPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = OFF');
  db.exec(`
    CREATE TABLE surahs(id INTEGER PRIMARY KEY, name TEXT, english_name TEXT, translation TEXT, type TEXT, ayahs INTEGER);
    CREATE TABLE ayahs(id INTEGER PRIMARY KEY, surah INTEGER, ayah INTEGER, arabic TEXT, arabic_norm TEXT, juz INTEGER, page INTEGER, hizb INTEGER, sajda INTEGER);
    CREATE INDEX idx_ayahs_surah ON ayahs(surah, ayah);
    CREATE TABLE translations(id INTEGER PRIMARY KEY AUTOINCREMENT, surah INTEGER, ayah INTEGER, lang TEXT, edition TEXT, text TEXT);
    CREATE INDEX idx_trans ON translations(lang, edition, surah, ayah);
    CREATE TABLE tafsir(id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT, language TEXT, surah INTEGER, start_ayah INTEGER, end_ayah INTEGER, text TEXT, text_norm TEXT);
    CREATE INDEX idx_tafsir ON tafsir(source, surah, start_ayah);
    CREATE TABLE hadith_books(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, title TEXT, title_arabic TEXT, author TEXT, author_arabic TEXT);
    CREATE TABLE hadith(id INTEGER PRIMARY KEY AUTOINCREMENT, book_slug TEXT, chapter TEXT, number INTEGER, arabic TEXT, arabic_norm TEXT, english TEXT, grade TEXT, reference TEXT);
    CREATE INDEX idx_hadith_book ON hadith(book_slug, id);
    CREATE TABLE adhkar(id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, arabic TEXT, transliteration TEXT, translation TEXT, count INTEGER, source TEXT);
  `);
  db.pragma('user_version = 2');
  const insSurah = db.prepare('INSERT INTO surahs VALUES (?,?,?,?,?,?)');
  for (const s of surahs) insSurah.run(s.number, s.name, s.englishName, s.englishNameTranslation, s.revelationType, s.numberOfAyahs);

  const insAyah = db.prepare('INSERT INTO ayahs VALUES (?,?,?,?,?,?,?,?,?)');
  const insTrans = db.prepare('INSERT INTO translations (surah,ayah,lang,edition,text) VALUES (?,?,?,?,?)');
  const insTafsir = db.prepare('INSERT INTO tafsir (source,language,surah,start_ayah,end_ayah,text,text_norm) VALUES (?,?,?,?,?,?,?)');
  const insHadith = db.prepare('INSERT INTO hadith (book_slug,chapter,number,arabic,arabic_norm,english,grade,reference) VALUES (?,?,?,?,?,?,?,?)');
  const insAdhkar = db.prepare('INSERT INTO adhkar (category,arabic,transliteration,translation,count,source) VALUES (?,?,?,?,?,?)');

  const juzMap = new Map();
  const pageMap = new Map();
  for (let j = 1; j <= 30; j++) {
    const data = await fetchJson(`https://api.alquran.cloud/v1/juz/${j}`, `juz${j}.json`);
    const first = data.data.ayahs[0];
    juzMap.set(j, `${first.surah.number}:${first.numberInSurah}`);
  }
  for (let p = 1; p <= 604; p++) {
    const data = await fetchJson(`https://api.alquran.cloud/v1/page/${p}`, `page${p}.json`);
    const first = data.data.ayahs[0];
    pageMap.set(p, `${first.surah.number}:${first.numberInSurah}`);
  }
  const juzOf = (surah, ayah) => {
    let j = 1;
    for (const [jz, key] of juzMap) { const [s, a] = key.split(':').map(Number); if (surah > s || (surah === s && ayah >= a)) j = jz; }
    return j;
  };
  const pageOf = (surah, ayah) => {
    let p = 1;
    for (const [pg, key] of pageMap) { const [s, a] = key.split(':').map(Number); if (surah > s || (surah === s && ayah >= a)) p = pg; }
    return p;
  };
  const hizbOf = (juz, ayah) => 1;

  const SAJDA = new Set(['7:206','13:15','16:49','17:107','19:58','22:18','25:60','27:25','32:15','38:24','41:37','53:62','84:21','96:19']);

  const tx = db.transaction(() => {
    for (const [i, r] of ayahRows.entries()) {
      const juz = juzOf(r.surah, r.ayah);
      const page = pageOf(r.surah, r.ayah);
      insAyah.run(i + 1, r.surah, r.ayah, r.text, normalizeArabic(r.text), juz, page, hizbOf(juz, r.ayah), SAJDA.has(`${r.surah}:${r.ayah}`) ? 1 : 0);
    }
    for (const t of transRows) insTrans.run(t.surah, t.ayah, t.lang, t.edition, t.text);
    for (const t of tafsirRows) insTafsir.run(t.source, t.language, t.surah, t.start, t.end, t.text, normalizeArabic(t.text));
    for (const a of ADHKAR) insAdhkar.run(a.category, a.arabic, a.transliteration, a.translation, a.count, a.source);
  });
  tx();

  for (const book of HADITH_BOOKS) {
    const stmt = db.prepare('INSERT OR IGNORE INTO hadith_books (slug,title,title_arabic,author,author_arabic) VALUES (?,?,?,?,?)');
    stmt.run(book.slug, book.title, book.arabic, book.author, book.author_arabic);
    const files = await fetchJson('https://api.github.com/repos/CheeseWithSauce/HadithsJSONFormat/git/trees/main?recursive=1', 'hadith_tree.json');
    const list = files.tree.filter((t) => t.path.endsWith('.json') && book.match.test(t.path));
    let count = 0;
    for (const f of list) {
      const data = await fetchJson(hadithBase + f.path.replace('Sunnah/', ''), 'h_' + book.slug + '_' + f.path.split('/').pop());
      for (const h of data) {
        insHadith.run(book.slug, h.book || '', h.id || null, h.arabic || '', normalizeArabic(h.arabic || ''), h.english || '', h.grade || '', h.reference || '');
        count++;
      }
    }
    console.log('  ', book.slug, count, 'hadiths');
  }

  const counts = {};
  for (const t of ['surahs', 'ayahs', 'translations', 'tafsir', 'hadith_books', 'hadith', 'adhkar']) {
    counts[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  }
  console.log('  DB rows:', counts);
  db.close();

  console.log('== 5/5 Assets ==');
  writeFileSync(path.join(OUT, 'reciters.json'), JSON.stringify(RECITERS, null, 1));
  writeFileSync(path.join(OUT, 'adhkar.json'), JSON.stringify(ADHKAR));
  const rawDir = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'raw');
  for (const a of ATHANS) {
    await fetchBuffer(a.url, a.file);
    const src = path.join(RAW, a.file);
    const dst = path.join(rawDir, a.file.replace(/-/g, '_'));
    if (!existsSync(dst)) copyFileSync(src, dst);
  }

  await pipeline(
    createReadStream(dbPath),
    createGzip({ level: 9 }),
    createWriteStream(path.join(OUT, 'quran.db.gz')),
  );
  const size = existsSync(path.join(OUT, 'quran.db.gz')) ? statSync(path.join(OUT, 'quran.db.gz')).size : 0;
  console.log('quran.db.gz:', (size / 1e6).toFixed(1), 'MB');
  console.log('DONE');
}

import { copyFileSync, statSync, createReadStream } from 'node:fs';
main().catch((e) => { console.error(e); process.exit(1); });
