import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { categoryLabelKey, pickableCategories } from './categoryDisplay';
import type { TransactionItem } from './transactionsApi';
import { getTransactionByDedupeKey } from './transactionsRepo';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { showToast } from '@/components/Toast';
import { familyProblem, listFamilies, shareTransaction } from '@/features/family/familyApi';
import { problemText } from '@/features/family/familyText';
import type { Family } from '@/features/family/types';
import { useLanguage } from '@/i18n/LanguageProvider';
import { colors, fontSizes, radius, sizes, spacing } from '@/theme';
import { intlLocale } from '@/utils/intl';
import { formatMoney } from '@/utils/money';

type Props = {
  item: TransactionItem | null;
  onClose: () => void;
  onChangeCategory: (item: TransactionItem, category: string) => Promise<void>;
  // Only cash expenses entered by hand can be deleted.
  onDelete: (item: TransactionItem) => void;
};

// The full transaction in a card over the list, with edit category and (for cash expenses) delete.
export function TransactionDetailCard({ item, onClose, onChangeCategory, onDelete }: Props) {
  const { language, t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Sharing with a family: null = not choosing; 'loading' while the families load; else the families to choose from.
  const [choosing, setChoosing] = useState<Family[] | 'loading' | null>(null);

  const close = () => {
    setEditing(false);
    setChoosing(null);
    onClose();
  };

  const shareWith = async (family: Family) => {
    if (!item) return;
    setChoosing('loading');
    try {
      await shareTransaction(item.id, family.id);
      showToast(t('family.share.done'));
      close();
    } catch (error) {
      showToast(problemText(familyProblem(error), 'share'));
      setChoosing(null);
    }
  };

  // Opt-in: nothing is shared until the person chooses. One family is shared with at once; several are listed.
  const startShare = async () => {
    setChoosing('loading');
    try {
      const families = await listFamilies();
      if (families.length === 0) {
        showToast(t('family.share.none'));
        setChoosing(null);
      } else if (families.length === 1) {
        await shareWith(families[0]);
      } else {
        setChoosing(families);
      }
    } catch (error) {
      showToast(problemText(familyProblem(error), 'share'));
      setChoosing(null);
    }
  };

  const labelOf = (category: string) => {
    const key = categoryLabelKey(category);
    return key ? t(key) : category;
  };

  const pick = async (category: string) => {
    if (!item || saving) return;
    if (category === item.category) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onChangeCategory(item, category);
      setEditing(false);
    } catch {
      showToast(t('transactions.detail.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // The balance after the payment is only in the SMS the phone read, so look up the phone's copy.
  const externalId = item?.externalId ?? null;
  // The SMS text is not stored by the app: it is read from the phone's inbox, so it is missing when the
  // message was deleted there (or on iOS and web).
  type Found = { externalId: string; balance: string | null; sms: { address: string; body: string } | null };
  const [found, setFound] = useState<Found | null>(null);
  useEffect(() => {
    if (!externalId?.startsWith('sms:')) return;
    let current = true;
    (async () => {
      const row = await getTransactionByDedupeKey(externalId.slice('sms:'.length));
      let sms: Found['sms'] = null;
      if (row && Platform.OS === 'android') {
        try {
          const { readSmsById } = await import('@/features/sms/smsReader');
          sms = await readSmsById(row.smsId);
        } catch {
          sms = null; // no permission or no inbox
        }
      }
      if (current) setFound({ externalId, balance: row?.balance ?? null, sms });
    })().catch(() => undefined); // no database on web
    return () => {
      current = false;
    };
  }, [externalId]);
  // A result for another transaction is ignored.
  const here = found && found.externalId === externalId ? found : null;
  const balance = here?.balance ?? null;
  const sms = here?.sms ?? null;

  const debit = item?.type === 'DEBIT';
  const rows: [string, string][] = [];
  if (item) {
    rows.push(
      [t('transactions.detail.type'), debit ? t('transactions.detail.expense') : t('transactions.detail.income')],
      [t('transactions.detail.category'), labelOf(item.category)],
      [
        t('transactions.detail.date'),
        new Intl.DateTimeFormat(intlLocale(language), { dateStyle: 'long', timeStyle: 'short' }).format(item.date),
      ],
      [t('transactions.detail.source'), item.manual ? t('transactions.cash.tag') : t('transactions.detail.sourceBank')],
    );
    if (item.description) rows.push([t('transactions.detail.description'), item.description]);
    if (balance) rows.push([t('transactions.detail.balance'), formatMoney(balance, item.currency, language)]);
    if (item.status) rows.push([t('transactions.detail.status'), item.status]);
    rows.push([t('transactions.detail.id'), item.id]);
  }

  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('transactions.detail.close')}>
        {item && (
          // An empty onPress keeps a tap on the card from closing it.
          <Pressable style={styles.card} onPress={() => undefined}>
            <View style={styles.head}>
              <AppText weight="bold" style={styles.title}>
                {t('transactions.detail.title')}
              </AppText>
              <Pressable
                onPress={close}
                hitSlop={spacing.sm}
                accessibilityRole="button"
                accessibilityLabel={t('transactions.detail.close')}>
                <Icon name="close" color={colors.textSecondary} size={sizes.icon} />
              </Pressable>
            </View>

            <AppText weight="semibold" style={styles.merchant} numberOfLines={2}>
              {item.merchant ?? t('transactions.unknownMerchant')}
            </AppText>
            <AppText weight="bold" style={[styles.amount, { color: debit ? colors.danger : colors.success }]}>
              {`${debit ? '-' : '+'} ${formatMoney(item.amount, item.currency, language)}`}
            </AppText>

            {Array.isArray(choosing) ? (
              <ScrollView style={styles.picker} contentContainerStyle={styles.pickerContent}>
                <AppText weight="semibold" style={styles.detailLabel}>
                  {t('family.share.title')}
                </AppText>
                {choosing.map((family) => (
                  <Pressable
                    key={family.id}
                    onPress={() => void shareWith(family)}
                    accessibilityRole="button"
                    style={styles.option}>
                    <AppText weight="medium" style={styles.optionLabel}>
                      {family.name}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : editing ? (
              <ScrollView style={styles.picker} contentContainerStyle={styles.pickerContent}>
                {pickableCategories(item.type).map((category) => {
                  const checked = category === item.category;
                  return (
                    <Pressable
                      key={category}
                      onPress={() => void pick(category)}
                      disabled={saving}
                      accessibilityRole="radio"
                      accessibilityState={{ checked }}
                      style={[styles.option, checked && styles.optionChecked]}>
                      <AppText weight={checked ? 'semibold' : 'regular'} style={styles.optionLabel}>
                        {labelOf(category)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.details}>
                {sms && (
                  <View style={styles.sms}>
                    <AppText weight="semibold" style={styles.smsFrom}>
                      {sms.address}
                    </AppText>
                    <AppText style={styles.smsBody} selectable>
                      {sms.body}
                    </AppText>
                  </View>
                )}
                {rows.map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <AppText style={styles.detailLabel}>{label}</AppText>
                    <AppText weight="medium" style={styles.detailValue}>
                      {value}
                    </AppText>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.actions}>
              <PrimaryButton
                label={editing || Array.isArray(choosing) ? t('notifications.cancel') : t('transactions.detail.edit')}
                onPress={() => (Array.isArray(choosing) ? setChoosing(null) : setEditing((on) => !on))}
                disabled={saving || choosing === 'loading'}
              />
              {!editing && !Array.isArray(choosing) && (
                <Pressable
                  onPress={() => void startShare()}
                  disabled={choosing === 'loading'}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
                  <AppText weight="semibold" style={styles.shareLabel}>
                    {t('family.share.button')}
                  </AppText>
                </Pressable>
              )}
              {item.manual && !editing && !Array.isArray(choosing) && (
                <Pressable
                  onPress={() => onDelete(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
                  <AppText weight="semibold" style={styles.deleteLabel}>
                    {t('transactions.cash.delete')}
                  </AppText>
                </Pressable>
              )}
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSizes.sm, color: colors.textSecondary },
  merchant: { fontSize: fontSizes.lg, color: colors.textPrimary },
  amount: { fontSize: fontSizes.xl },
  detailsScroll: { maxHeight: 360 },
  details: { gap: spacing.sm, paddingVertical: spacing.sm },
  sms: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgLight },
  smsFrom: { fontSize: fontSizes.xs, color: colors.textSecondary },
  smsBody: { fontSize: fontSizes.sm, color: colors.textPrimary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  detailLabel: { fontSize: fontSizes.sm, color: colors.textSecondary },
  detailValue: { flexShrink: 1, fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'right' },
  picker: { maxHeight: 280 },
  pickerContent: { gap: spacing.xs },
  option: {
    minHeight: sizes.touchMin,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChecked: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { fontSize: fontSizes.sm, color: colors.textPrimary },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  delete: {
    minHeight: sizes.button,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: {
    minHeight: sizes.button,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: { fontSize: fontSizes.md, color: colors.primary },
  pressed: { opacity: 0.6 },
  deleteLabel: { fontSize: fontSizes.md, color: colors.danger },
});
