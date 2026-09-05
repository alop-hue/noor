import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

const NISAB_GOLD_GRAMS = 85;
const NISAB_SILVER_GRAMS = 595;
const ZAKAT_RATE = 0.025;

interface Asset {
  id: string;
  label: string;
  labelAr: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit: string;
}

export default function ZakatScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rtl = i18n.dir() === 'rtl';
  const isArabic = i18n.language.startsWith('ar');

  const [goldPrice, setGoldPrice] = useState('75');
  const [silverPrice, setSilverPrice] = useState('0.90');
  const [assets, setAssets] = useState<Asset[]>([
    { id: 'cash', label: 'Cash & Bank', labelAr: 'نقود وبنوك', icon: 'wallet-outline', value: '', unit: '' },
    { id: 'gold', label: 'Gold', labelAr: 'ذهب', icon: 'color-fill-outline', value: String(NISAB_GOLD_GRAMS), unit: 'g' },
    { id: 'silver', label: 'Silver', labelAr: 'فضة', icon: 'diamond-outline', value: String(NISAB_SILVER_GRAMS), unit: 'g' },
    { id: 'stocks', label: 'Stocks & Investments', labelAr: 'أسهم واستثمارات', icon: 'trending-up-outline', value: '', unit: '' },
    { id: 'business', label: 'Business Inventory', labelAr: 'بضاعة تجارية', icon: 'storefront-outline', value: '', unit: '' },
    { id: 'property', label: 'Rental Income', labelAr: 'دخل إيجار', icon: 'home-outline', value: '', unit: '' },
    { id: 'debts', label: 'Money Owed to You', labelAr: 'أموال عليم', icon: 'people-outline', value: '', unit: '' },
    { id: 'gold_jewelry', label: 'Gold Jewelry', labelAr: 'مجوهرات ذهب', icon: 'finger-print-outline', value: '', unit: 'g' },
  ]);
  const [deductions, setDeductions] = useState('');
  const [showNisabInfo, setShowNisabInfo] = useState(false);

  const goldGramPrice = parseFloat(goldPrice) || 0;
  const silverGramPrice = parseFloat(silverPrice) || 0;
  const nisabGold = NISAB_GOLD_GRAMS * goldGramPrice;
  const nisabSilver = NISAB_SILVER_GRAMS * silverGramPrice;
  const nisab = Math.min(nisabGold, nisabSilver);

  const total = useMemo(() => {
    let sum = 0;
    for (const a of assets) {
      const v = parseFloat(a.value) || 0;
      if (a.id === 'gold' || a.id === 'silver' || a.id === 'gold_jewelry') {
        const price = a.id === 'silver' ? silverGramPrice : goldGramPrice;
        sum += v * price;
      } else {
        sum += v;
      }
    }
    const ded = parseFloat(deductions) || 0;
    return Math.max(0, sum - ded);
  }, [assets, goldGramPrice, silverGramPrice, deductions]);

  const zakat = total >= nisab ? total * ZAKAT_RATE : 0;
  const meetsNisab = total >= nisab;

  const updateAsset = (id: string, value: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, value } : a)));
  };

  const l = (en: string, ar: string) => (isArabic ? ar : en);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { backgroundColor: colors.bgElevated, borderBottomColor: colors.hairline, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={24} color={colors.text} />
        </Pressable>
        <Text variant="subheading" font="uiBold">{isArabic ? 'حاسبة الزكاة' : 'Zakat Calculator'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space[4], paddingBottom: insets.bottom + space[8] }}>
        <View style={[styles.nisabCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
          <Pressable onPress={() => setShowNisabInfo(!showNisabInfo)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text variant="body" font="uiBold">{isArabic ? 'النصاب' : 'Nisab Threshold'}</Text>
            </View>
            <Ionicons name={showNisabInfo ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
          </Pressable>
          {showNisabInfo ? (
            <View style={{ marginTop: space[3] }}>
              <Text variant="caption" color="secondary" style={{ lineHeight: 18 }}>
                {isArabic
                  ? 'النصاب هو الحد الأدنى لملك الزكاة. يُحسب من قيمة 85 جراماً من الذهب أو 595 جراماً من الفضة.'
                  : 'Nisab is the minimum wealth threshold for zakat. It is calculated from the value of 85g of gold or 595g of silver.'}
              </Text>
              <View style={{ marginTop: space[2] }}>
                <Text variant="caption" color="tertiary">
                  {isArabic ? `ذهب: ${nisabGold.toFixed(2)}$ · فضة: ${nisabSilver.toFixed(2)}$` : `Gold: $${nisabGold.toFixed(2)} · Silver: $${nisabSilver.toFixed(2)}`}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.nisabCard, { backgroundColor: colors.card, borderColor: colors.hairline, marginTop: space[3] }]}>
          <Text variant="caption" font="uiBold" color="tertiary" style={{ marginBottom: space[2] }}>
            {isArabic ? 'أسعارocks اليوم (بالجرام)' : 'Current prices per gram'}
          </Text>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <View style={{ flex: 1 }}>
              <Text variant="micro" color="secondary">{isArabic ? 'الذهب $' : 'Gold $'}</Text>
              <TextInput
                value={goldPrice}
                onChangeText={setGoldPrice}
                keyboardType="decimal-pad"
                style={[styles.priceInput, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.bgElevated }]}
                placeholder="75"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="micro" color="secondary">{isArabic ? 'الفضة $' : 'Silver $'}</Text>
              <TextInput
                value={silverPrice}
                onChangeText={setSilverPrice}
                keyboardType="decimal-pad"
                style={[styles.priceInput, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.bgElevated }]}
                placeholder="0.90"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>
        </View>

        <Text variant="caption" font="uiBold" color="tertiary" style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {isArabic ? 'الأصول' : 'ASSETS'}
        </Text>

        {assets.map((a) => {
          const isWeight = a.id === 'gold' || a.id === 'silver' || a.id === 'gold_jewelry';
          const price = a.id === 'silver' ? silverGramPrice : goldGramPrice;
          const numVal = parseFloat(a.value) || 0;
          const dollarVal = isWeight ? numVal * price : numVal;
          return (
            <View key={a.id} style={[styles.assetRow, { borderBottomColor: colors.hairline }]}>
              <View style={styles.assetIcon}>
                <Ionicons name={a.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" font="uiBold">{isArabic ? a.labelAr : a.label}</Text>
                {dollarVal > 0 ? (
                  <Text variant="micro" color="secondary">${dollarVal.toFixed(2)}</Text>
                ) : null}
              </View>
              <View style={styles.valueRow}>
                <TextInput
                  value={a.value}
                  onChangeText={(v) => updateAsset(a.id, v)}
                  keyboardType="decimal-pad"
                  style={[styles.assetInput, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.bgElevated }]}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                />
                {isWeight ? (
                  <Text variant="micro" color="tertiary" style={{ width: 20 }}>{a.unit}</Text>
                ) : (
                  <Text variant="micro" color="tertiary" style={{ width: 12 }}>$</Text>
                )}
              </View>
            </View>
          );
        })}

        <Text variant="caption" font="uiBold" color="tertiary" style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {isArabic ? 'الخصومات' : 'DEDUCTIONS'}
        </Text>
        <View style={[styles.assetRow, { borderBottomColor: colors.hairline }]}>
          <View style={styles.assetIcon}>
            <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" font="uiBold">{isArabic ? 'ديون ونفقات' : 'Debts & Expenses'}</Text>
          </View>
          <View style={styles.valueRow}>
            <TextInput
              value={deductions}
              onChangeText={setDeductions}
              keyboardType="decimal-pad"
              style={[styles.assetInput, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.bgElevated }]}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
            />
            <Text variant="micro" color="tertiary" style={{ width: 12 }}>$</Text>
          </View>
        </View>

        <View style={[styles.resultCard, { backgroundColor: meetsNisab ? colors.primarySoft : colors.card, borderColor: meetsNisab ? colors.primary : colors.hairline }]}>
          <View style={styles.resultRow}>
            <Text variant="bodySmall" color="secondary">{isArabic ? 'إجمالي الأصول' : 'Total Assets'}</Text>
            <Text variant="body" font="uiBold">${total.toFixed(2)}</Text>
          </View>
          <View style={[styles.resultRow, { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text variant="bodySmall" color="secondary">{isArabic ? 'النصاب' : 'Nisab'}</Text>
            <Text variant="bodySmall" color={meetsNisab ? 'primary' : 'tertiary'}>
              ${nisab.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.resultRow, { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View>
              <Text variant="subheading" font="uiBold" color={meetsNisab ? 'primary' : 'tertiary'}>
                {isArabic ? 'زكاة' : 'ZAKAT DUE'}
              </Text>
              {!meetsNisab && total > 0 ? (
                <Text variant="micro" color="tertiary">
                  {isArabic ? 'لم reaching النصاب' : 'Below nisab threshold'}
                </Text>
              ) : null}
            </View>
            <Text variant="heading" font="uiBold" color={meetsNisab ? 'primary' : 'tertiary'}>
              ${zakat.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: space[4], lineHeight: 18 }}>
          {isArabic
            ? 'هذه الحاسبة للأغراض التعليمية فقط. استشر عالماً مؤهلاً لحساب زكاتك بدقة.'
            : 'This calculator is for educational purposes only. Consult a qualified scholar for accurate zakat calculation.'}
        </Text>
      </ScrollView>
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
  nisabCard: { padding: space[4], borderRadius: radius.lg, borderWidth: 1 },
  sectionTitle: { marginTop: space[5], marginBottom: space[2], textTransform: 'uppercase', letterSpacing: 1 },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth },
  assetIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,162,39,0.1)' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assetInput: { width: 80, textAlign: 'right', borderWidth: 1, borderRadius: radius.md, paddingVertical: space[1], paddingHorizontal: space[2], fontSize: 14 },
  priceInput: { borderWidth: 1, borderRadius: radius.md, paddingVertical: space[2], paddingHorizontal: space[3], fontSize: 14, textAlign: 'center' },
  resultCard: { marginTop: space[5], padding: space[4], borderRadius: radius.lg, borderWidth: 1 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space[3] },
});
