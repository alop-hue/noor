import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

interface Fatwa {
  id: string;
  topic: string;
  topicAr: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
  ruling: 'halal' | 'haram' | 'makruh' | 'mubah' | 'mustahabb' | 'langkah';
  rulingAr: string;
  source: string;
  sourceUrl: string;
  scholar: string;
  scholarAr: string;
  tags: string[];
}

const RULING_META: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string; labelAr: string }> = {
  halal:     { color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle',  label: 'Halal',     labelAr: 'حلال' },
  haram:     { color: '#dc2626', bg: '#fee2e2', icon: 'close-circle',     label: 'Haram',     labelAr: 'حرام' },
  makruh:    { color: '#d97706', bg: '#fef3c7', icon: 'warning',          label: 'Makruh',    labelAr: 'مكروه' },
  mubah:     { color: '#6b7280', bg: '#f3f4f6', icon: 'remove-circle',    label: 'Mubah',     labelAr: 'مباح' },
  mustahabb: { color: '#7c3aed', bg: '#ede9fe', icon: 'star',             label: 'Mustahabb', labelAr: 'مستحب' },
  langkah:   { color: '#0891b2', bg: '#cffafe', icon: 'help-circle',      label: 'Langkah',   labelAr: 'جائزة' },
};

const FATWAS: Fatwa[] = [
  {
    id: '1', topic: 'Conventional Insurance', topicAr: 'التأمين التقليدي',
    question: 'Is conventional car and health insurance halal or haram?',
    questionAr: 'هل تأمين السيارات والصحة التقليدي حلال أم حرام؟',
    answer: 'Conventional insurance involves gharar (excessive uncertainty) and riba (interest), making it haram according to the majority of scholars. Islamic takaful (cooperative insurance) is the halal alternative where participants mutually guarantee each other.',
    answerAr: 'التأمين التقليدي ينطوي على غرار (الجهل الشديد) وربا، مما يجعله حراماً بقول جمهور العلماء. التأمين التكافلي هو البديل الحلال حيث يضمن المساهمون بعضهم البعض.',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Islamic Fiqh Academy Resolution 10', sourceUrl: 'https://www.islamweb.net',
    scholar: 'Islamic Fiqh Academy', scholarAr: 'مجمع الفقه الإسلامي الدولي',
    tags: ['insurance', 'gharar', 'riba', 'takaful', 'مالية'],
  },
  {
    id: '2', topic: 'Music & Instruments', topicAr: 'الموسيقى والآلات الموسيقية',
    question: 'Is listening to music with instruments haram?',
    questionAr: 'هل الاستماع إلى الموسيقى بالآلات حرام؟',
    answer: 'The majority of scholars from the four madhabs consider musical instruments to be haram. Imam al-Qurtubi, Ibn Hazm (in his later view), and many others stated this clearly. The hadith in Sahih al-Bukhari mentions that Allah permits trade but prohibits riba, and scholars have cited this as evidence. Only the duff (tambourine without jingles) is permitted by some scholars for weddings and celebrations. Nasheed (vocal-only Islamic songs) without instruments is acceptable.',
    answerAr: 'يجري قول جمهور العلماء من المذاهب الأربعة على تحريم الآلات الموسيقية. قال الإمام القرطبي وابن حزم (في قوله الثاني) وغيرهم ذلك صراحة. ورد في صحيح البخاري أن الله أذن التجارة وحرم الربا، واستدل العلماء بهذا. فقط الدف (بدون جلاجل) جائز عند بعض العلماء لأعراس واحتفالات. النشيد الصوتي بدون آلات مقبول.',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Sahih al-Bukhari, al-Majmu by Imam al-Nawawi', sourceUrl: 'https://sunnah.com/bukhari:2117',
    scholar: 'Imam al-Nawawi, majority of scholars', scholarAr: 'الإمام النووي وجمهور العلماء',
    tags: ['music', 'instruments', 'haram', 'duff', 'nasheed', 'موسيقى'],
  },
  {
    id: '3', topic: 'Cryptocurrency', topicAr: 'العملات الرقمية',
    question: 'Is Bitcoin and cryptocurrency trading halal?',
    questionAr: 'هل تداول البيتكوين والعملات الرقمية حلال؟',
    answer: 'Scholars are divided. Cryptocurrency is considered haram if it involves gambling (maysir), excessive gharar (speculation), or riba. Some scholars permit it if used as a genuine medium of exchange without speculative trading. Spot trading with actual delivery may be permissible according to some scholars.',
    answerAr: 'اختلف العلماء. العملات الرقمية حرام إذا تضمنت ميسر أو غرار فاحش أو ربا. بعض العلماء يجيزونها إذا استُخدمت كوسيلة تبادل حقيقية بدون تداول مضاربي. البيع الآجل باعتبارات معينة.',
    ruling: 'langkah', rulingAr: 'جائزة باعتبارات',
    source: 'AAOIFI Shari\'ah Standard No. 21', sourceUrl: 'https://aaoifi.com',
    scholar: 'AAOIFI Shari\'ah Board', scholarAr: 'هيئة الشرعية لهيئة المحاسبة والمراجعة',
    tags: ['crypto', 'bitcoin', 'trading', 'gharar', 'عملات'],
  },
  {
    id: '4', topic: 'Dogs as Pets', topicAr: 'الكلاب كحيوانات أليفة',
    question: 'Can I keep a dog at home as a pet?',
    questionAr: 'هل يمكنني الاحتفاظ بكلاب كحيوان أليف في المنزل؟',
    answer: 'Keeping dogs for guarding property or hunting is permissible according to the Sunnah. However, keeping dogs inside the living area for companionship is considered makruh tanzeehi by most scholars, as angels do not enter a house with a dog. The Maliki school considers dogs to be najis (impure). Keep them outside if you must.',
    answerAr: 'الاحتفاظ بالكلاب لحراسة المال أو الصيد جائز حسب السنة. لكن الاحتفاظ بها داخل منطقة المعيشة للرفقة مكروه تنزيهي عند جمهور العلماء، لأن الملائكة لا تدخل بيتاً فيه كلب. مذهب مالك considers الكلاب نجسة. اجعلها في الخارج إذا اضطررت.',
    ruling: 'makruh', rulingAr: 'مكروه تنزيهي',
    source: 'Sahih Muslim 2013', sourceUrl: 'https://sunnah.com/muslim:2013',
    scholar: 'Imam Muslim, Imam Malik', scholarAr: 'الإمام مسلم والإمام مالك',
    tags: ['dogs', 'pets', 'najis', 'guard', 'كلاب'],
  },
  {
    id: '5', topic: 'Fasting Friday Alone', topicAr: 'صيام الجمعة منفرداً',
    question: 'Is it haram to fast on Friday alone?',
    questionAr: 'هل يحرم صيام يوم الجمعة منفرداً؟',
    answer: 'Fasting on Friday alone is makruh (disliked) according to the majority of scholars. It is not haram, but it is recommended to fast on Thursday or Saturday along with it. The Prophet ﷺ said: "Do not fast on Friday unless you fast a day before or after it."',
    answerAr: 'صيام الجمعة منفرداً مكروه عند جمهور العلماء. ليس حراماً لكن يُستحب صيام الخميس أو السبت معه. قال النبي ﷺ: "لا تُصَامَ الجمعة إلا أن يصوم قبله أو بعده".',
    ruling: 'makruh', rulingAr: 'مكروه',
    source: 'Sahih Muslim 1159', sourceUrl: 'https://sunnah.com/muslim:1159',
    scholar: 'Imam Muslim', scholarAr: 'الإمام مسلم',
    tags: ['friday', 'fasting', 'sunnah', 'jumuah', 'صيام'],
  },
  {
    id: '6', topic: 'Riba (Interest)', topicAr: 'الربا',
    question: 'Is taking or giving interest (riba) from a bank haram?',
    questionAr: 'هل أخذ أو دفع الربا من البنك حرام؟',
    answer: 'Yes, riba (interest) is unequivocally haram according to the Quran, Sunnah, and unanimous scholarly consensus (ijma). This includes interest on savings accounts, loans, credit cards, and mortgages. The Quran says: "Those who consume riba will not stand on the Day of Resurrection." (2:275)',
    answerAr: 'نعم، الربا حرام قطعاً حسب القرآن والسنة والإجماع. هذا يشمل الفوائد على حسابات التوفير والقروض والبطاقات الائتمانية والرهن العقاري. يقول الله تعالى: "الذين يأكلون الربا لا يقومون إلا كما يقوم الذي يتخبطه الشيطان".',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Quran 2:275-280', sourceUrl: 'https://quran.com/2/275',
    scholar: 'Allah Almighty', scholarAr: 'الله تعالى',
    tags: ['riba', 'interest', 'banking', 'loans', 'ربا'],
  },
  {
    id: '7', topic: 'Tattoos', topicAr: 'الوشم',
    question: 'Are tattoos haram in Islam?',
    questionAr: 'هل الوشم حرام في الإسلام؟',
    answer: 'Permanent tattoos are haram according to the unanimous agreement of scholars. The Prophet ﷺ cursed both the one who does tattoos and the one who has it done (Sahih al-Bukhari 5889). This is because it involves altering Allah\'s creation. Cosmetic henna (temporary) is permissible.',
    answerAr: 'الوشم الدائم حرام بإجماع العلماء. لعن النبي ﷺ الواشم والمستوشم (صحيح البخاري 5889). لأن فيه تغيير لخلق الله. الوشم بالحناء (المؤقت) جائز.',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Sahih al-Bukhari 5889', sourceUrl: 'https://sunnah.com/bukhari:5889',
    scholar: 'Prophet Muhammad ﷺ', scholarAr: 'النبي محمد ﷺ',
    tags: ['tattoos', 'body', 'alteration', 'creation', 'وشم'],
  },
  {
    id: '8', topic: 'Combining Prayers', topicAr: 'جمع الصلاتين',
    question: 'Can I combine Dhuhr and Asr prayers when travelling?',
    questionAr: 'هل يمكنني جمع الظهر والعصر عند السفر؟',
    answer: 'Yes, combining prayers during travel is permissible according to authentic hadith. You may pray Dhuhr early (at Asr time) or Asr late (at Dhuhr time). This applies when travelling a distance of approximately 80km or more. You may also combine Maghrib and Isha.',
    answerAr: 'نعم، الجمع بين الصلاتين عند السفر جائز حسب الحديث الصحيح. يمكنك صلاة الظهر مبكراً أو العصر متأخراً. هذا ينطبق على سفر حوالي 80 كم أو أكثر. يمكن أيضاً جمع المغرب والعشاء.',
    ruling: 'mustahabb', rulingAr: 'مستحب',
    source: 'Sahih Muslim 707', sourceUrl: 'https://sunnah.com/muslim:707',
    scholar: 'Imam Muslim', scholarAr: 'الإمام مسلم',
    tags: ['prayer', 'travel', 'qasr', 'combining', 'صلاة'],
  },
  {
    id: '9', topic: 'Zakat on Gold', topicAr: 'زكاة الذهب',
    question: 'How much zakat do I owe on gold jewelry I wear?',
    questionAr: 'كم أدفع زكاة على مجوهرات الذهب التي ألبسها؟',
    answer: 'Zakat is due on gold jewelry when it reaches the nisab threshold (approximately 85 grams) and has been held for one lunar year. The rate is 2.5% of the total value. According to the majority of scholars, zakat on jewelry is payable even if worn, as it is still wealth.',
    answerAr: 'الزكاة على مجوهرات الذهب واجبة عندما تصل إلى النصاب (حوالي 85 جراماً) ومضى عليها سنة هجرية. المعدل 2.5% من القيمة. بقول جمهور العلماء الزكاة واجبة على المجوهرات حتى لو كانت تُلبس.',
    ruling: 'mustahabb', rulingAr: 'واجب (فرض عين)',
    source: 'Sunan al-Tirmidhi 625', sourceUrl: 'https://sunnah.com/tirmidhi:625',
    scholar: 'Imam al-Tirmidhi', scholarAr: 'الإمام الترمذي',
    tags: ['zakat', 'gold', 'nisab', 'jewelry', 'زكاة'],
  },
  {
    id: '10', topic: 'Working in a Conventional Bank', topicAr: 'العمل في بنك تقليدي',
    question: 'Is it haram to work in a conventional bank?',
    questionAr: 'هل يحرم العمل في بنك تقليدي؟',
    answer: 'Working in a conventional bank is haram if your role directly involves riba (interest) transactions, such as being a loan officer or investment banker. According to the Prophet ﷺ\'s curse, both the one who pays riba and the one who receives it are cursed.',
    answerAr: 'العمل في بنك تقليدي حرام إذا كان دورك يتضمن معاملات ربا مباشرة، كالعمل في القروض أو الاستثمارات. حسب لعن النبي ﷺ، كل من يدفع الربا أو يأخذه ملعون.',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Sahih al-Bukhari 1340', sourceUrl: 'https://sunnah.com/bukhari:1340',
    scholar: 'Prophet Muhammad ﷺ', scholarAr: 'النبي محمد ﷺ',
    tags: ['employment', 'bank', 'riba', 'work', 'وظيفة'],
  },
  {
    id: '11', topic: 'Relationships Before Marriage', topicAr: 'العلاقات قبل الزواج',
    question: 'Is it haram to have a girlfriend/boyfriend before marriage?',
    questionAr: 'هل يحرم الزواج من شريكة الحياة قبل الزواج رسمياً؟',
    answer: 'Yes, any romantic relationship outside of marriage (zina) is haram. The Quran commands lowering gaze and guarding chastity (24:30-31). Islam encourages marriage (nikah) as soon as one is able.',
    answerAr: 'نعم، أي علاقة عاطفية خارج الزواج (زنا) حرام. القرآن يأمر بغض البصر وحفظ الفرج (24:30-31). الإسلام يحث على الزواج (النكاح) فور الإمكان.',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Quran 24:30-31', sourceUrl: 'https://quran.com/24/30',
    scholar: 'Allah Almighty', scholarAr: 'الله تعالى',
    tags: ['dating', 'zina', 'marriage', 'relationships', 'علاقات'],
  },
  {
    id: '12', topic: 'Halal Food', topicAr: 'الطعام الحلال',
    question: 'Is meat from non-Muslim countries halal?',
    questionAr: 'هل لحم البلدان غير الإسلامية حلال؟',
    answer: 'Meat is halal only if slaughtered according to Islamic guidelines (dhabiha): the name of Allah must be invoked, a sharp knife used, and the throat, windpipe, and blood vessels cut. Without proper slaughter, the meat is haram.',
    answerAr: 'اللحوم حلال فقط إذا ذُبحت حسب الأحكام الإسلامية (الذبحHalal): ذكر اسم الله، وسكين حاد، وقطع الحنجرة والشعيرات الدموية. بدون ذبح صحيح، اللحم حرام.',
    ruling: 'langkah', rulingAr: 'جائزة بشروط',
    source: 'Quran 5:3', sourceUrl: 'https://quran.com/5/3',
    scholar: 'Allah Almighty', scholarAr: 'الله تعالى',
    tags: ['food', 'meat', 'dhabiha', 'slaughter', 'طعام'],
  },
  {
    id: '13', topic: 'Raising Hands in Dua', topicAr: 'رفع اليدين في الدعاء',
    question: 'Is it sunnah to raise hands when making dua?',
    questionAr: 'هل رفع اليدين عند الدعاء سنة؟',
    answer: 'Yes, raising hands during dua is confirmed sunnah. The Prophet ﷺ would raise his hands when making supplication. It is mustahabb and shows humility before Allah.',
    answerAr: 'نعم، رفع اليدين أثناء الدعاء سنة مؤكدة. كان النبي ﷺ يرفع يديه عند الدعاء. هو مستحب ويُظهر التواضع بين يدي الله.',
    ruling: 'mustahabb', rulingAr: 'مستحب',
    source: 'Sahih al-Bukhari 6320', sourceUrl: 'https://sunnah.com/bukhari:6320',
    scholar: 'Prophet Muhammad ﷺ', scholarAr: 'النبي محمد ﷺ',
    tags: ['dua', 'hands', 'sunnah', 'worship', 'دعاء'],
  },
  {
    id: '14', topic: 'Backbiting', topicAr: 'الغيبة',
    question: 'Is backbiting (gheebah) haram in Islam?',
    questionAr: 'هل الغيبة حرام في الإسلام؟',
    answer: 'Yes, backbiting is clearly haram. Allah compares it to eating the flesh of one\'s dead brother (49:12). The Prophet ﷺ defined gheebah as mentioning your brother in a way he would dislike.',
    answerAr: 'نعم، الغيمة حرام صراحة. قارن الله تعالى الغيبة بأكل لحم أخيك الميت (49:12). وصف النبي ﷺ الغيبة بأنها ذكر أخاك بما يكره.',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Quran 49:12', sourceUrl: 'https://quran.com/49/12',
    scholar: 'Allah Almighty', scholarAr: 'الله تعالى',
    tags: ['backbiting', 'gheebah', 'tongue', 'ethics', 'غيبة'],
  },
  {
    id: '15', topic: 'Listening to Quran', topicAr: 'الاستماع إلى القرآن',
    question: 'What are the rewards of listening to the Quran?',
    questionAr: 'ما هي ثواب الاستماع إلى القرآن؟',
    answer: 'Listening to the Quran is a great act of worship. The Prophet ﷺ said: "Whoever listens to a letter from the Book of Allah will have a reward multiplied by ten." (Tirmidhi). Being attentive while listening increases khushoo (humility) in prayer.',
    answerAr: 'الاستماع إلى القرآن عبادة عظيمة. قال النبي ﷺ: "من سمع حرفاً من كتاب الله فله به أجر مضاعف" (الترمذي). الإصغاء أثناء الاستماع يزيد الخشوع في الصلاة.',
    ruling: 'mustahabb', rulingAr: 'مستحب',
    source: 'Sunan al-Tirmidhi 2910', sourceUrl: 'https://sunnah.com/tirmidhi:2910',
    scholar: 'Prophet Muhammad ﷺ', scholarAr: 'النبي محمد ﷺ',
    tags: ['quran', 'listening', 'reward', 'worship', 'قرآن'],
  },
  {
    id: '16', topic: 'Shaving the Beard', topicAr: 'حلق اللحية',
    question: 'Is it haram to shave the beard?',
    questionAr: 'هل يحرم حلق اللحية؟',
    answer: 'Shaving the beard is haram according to the majority of scholars (Hanafi, Maliki, Hanbali). Some Shafi\'i scholars consider it makruh. The Prophet ﷺ ordered to differ from the polytheists by keeping the beard. It is a sign of masculinity and following the Sunnah.',
    answerAr: 'حلق اللحية حرام بقول جمهور العلماء (الحنفية والمالكية والحنابلة). بعض علماء الشافعي considers مكروه. أمر النبي ﷺ بالاختلاف عن المشركين بإبقاء اللحية. هي علامة على الرجولة واتباع السنة.',
    ruling: 'haram', rulingAr: 'حرام',
    source: 'Sahih al-Bukhari 5892', sourceUrl: 'https://sunnah.com/bukhari:5892',
    scholar: 'Prophet Muhammad ﷺ', scholarAr: 'النبي محمد ﷺ',
    tags: ['beard', 'grooming', 'sunnah', 'men', 'لحية'],
  },
];

export default function FatawaScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rtl = i18n.dir() === 'rtl';
  const isArabic = i18n.language.startsWith('ar');
  const [query, setQuery] = useState('');
  const [activeRuling, setActiveRuling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rulings = useMemo(() => {
    const map = new Map<string, number>();
    FATWAS.forEach((f) => map.set(f.ruling, (map.get(f.ruling) ?? 0) + 1));
    return Array.from(map.entries());
  }, []);

  const filtered = useMemo(() => {
    let list = FATWAS;
    if (activeRuling) list = list.filter((f) => f.ruling === activeRuling);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((f) =>
        f.topic.toLowerCase().includes(q) ||
        f.topicAr.includes(q) ||
        f.question.toLowerCase().includes(q) ||
        f.questionAr.includes(q) ||
        f.tags.some((tag) => tag.includes(q))
      );
    }
    return list;
  }, [query, activeRuling]);

  const openSource = (url: string) => Linking.openURL(url).catch(() => {});

  const renderFatwa = useCallback(({ item }: { item: Fatwa }) => {
    const rm = RULING_META[item.ruling] ?? RULING_META.mubah;
    const isOpen = expanded === item.id;
    return (
      <Pressable
        onPress={() => setExpanded(isOpen ? null : item.id)}
        style={({ pressed }) => [styles.fatwaCard, { backgroundColor: colors.card, borderColor: colors.hairline }, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.fatwaHeader}>
          <View style={[styles.rulingBadge, { backgroundColor: rm.bg, borderColor: rm.color + '40' }]}>
            <Ionicons name={rm.icon} size={14} color={rm.color} />
            <Text variant="micro" font="uiBold" style={{ color: rm.color }}>{isArabic ? rm.labelAr : rm.label}</Text>
          </View>
          <Text variant="caption" color="tertiary" numberOfLines={1}>
            {isArabic ? item.scholarAr : item.scholar}
          </Text>
        </View>
        <Text variant="body" font="uiBold" style={{ marginTop: space[2] }}>
          {isArabic ? item.topicAr : item.topic}
        </Text>
        <Text variant="bodySmall" color="secondary" style={{ marginTop: space[2] }}>
          {isArabic ? item.questionAr : item.question}
        </Text>
        {isOpen ? (
          <View style={{ marginTop: space[3] }}>
            <Text variant="bodySmall" style={{ lineHeight: 22 }}>
              {isArabic ? item.answerAr : item.answer}
            </Text>
            <View style={[styles.sourceRow, { borderTopColor: colors.hairline }]}>
              <Text variant="caption" color="primary" onPress={() => openSource(item.sourceUrl)}>
                {item.source} ↗
              </Text>
              <Text variant="caption" color="tertiary">{item.rulingAr}</Text>
            </View>
          </View>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} style={{ marginTop: space[2] }} />
        )}
      </Pressable>
    );
  }, [expanded, isArabic, colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{isArabic ? 'فتاوى' : 'Fatawa'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ paddingHorizontal: space[4], paddingTop: space[3] }}>
        <View style={[styles.searchRow, { backgroundColor: colors.bgElevated, borderColor: colors.hairline }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={isArabic ? 'ابحث عن فتوى...' : 'Search fatwa...'}
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ paddingLeft: space[4], paddingVertical: space[3] }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2], paddingRight: space[4] }}>
          <Pressable
            onPress={() => setActiveRuling(null)}
            style={[styles.filterChip, { backgroundColor: activeRuling === null ? colors.primarySoft : colors.bgElevated, borderColor: activeRuling === null ? colors.primary : colors.hairline }]}
          >
            <Text variant="caption" font="uiBold" color={activeRuling === null ? 'primary' : 'secondary'}>{isArabic ? 'الكل' : 'All'}</Text>
          </Pressable>
          {rulings.map(([ruling, count]) => {
            const rm = RULING_META[ruling];
            if (!rm) return null;
            return (
              <Pressable
                key={ruling}
                onPress={() => setActiveRuling(activeRuling === ruling ? null : ruling)}
                style={[styles.filterChip, { backgroundColor: activeRuling === ruling ? rm.bg : colors.bgElevated, borderColor: activeRuling === ruling ? rm.color : colors.hairline }]}
              >
                <Ionicons name={rm.icon} size={13} color={activeRuling === ruling ? rm.color : colors.textTertiary} />
                <Text variant="caption" font="uiBold" style={{ color: activeRuling === ruling ? rm.color : colors.textSecondary }}>
                  {isArabic ? rm.labelAr : rm.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(f) => f.id}
        renderItem={renderFatwa}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[8] }}
        ListEmptyComponent={
          <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
            <Text variant="body" color="secondary" style={{ marginTop: space[3], textAlign: 'center' }}>
              {isArabic ? 'لا توجد نتائج' : 'No results found'}
            </Text>
            <Text variant="caption" color="tertiary" style={{ marginTop: space[2], textAlign: 'center' }}>
              {isArabic ? 'جرب البحث بكلمات مختلفة' : 'Try different search terms'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: space[1] },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  fatwaCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space[4],
    marginBottom: space[3],
  },
  fatwaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rulingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space[3],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
