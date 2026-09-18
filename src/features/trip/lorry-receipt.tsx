/**
 * The Lorry Receipt card: the LR number plus the two things a driver does with
 * it — open it to show at a gate, or save a copy to the phone.
 *
 * Both buttons open the receipt itself at trip/lr/[id], so the driver always
 * ends up looking at the document. DOWNLOAD only differs in starting the save
 * on arrival, which is why saving never means missing the LR.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { TripDetailsData } from '@/types/trip';

export function LorryReceipt({ details }: { details: TripDetailsData | null }) {
  const router = useRouter();

  // The LR number is the one thing that must come from the office — without it
  // there is no receipt to render.
  if (!details?.lrNumber) return null;

  const open = (download: boolean) =>
    router.push(`/trip/lr/${details.id ?? ''}${download ? '?download=1' : ''}`);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={22} color={AppColors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.label}>{Strings.lorryReceipt}</Text>
            <Text style={styles.number}>{details?.lrNumber ?? ''}</Text>
          </View>
        </View>

        <Text style={styles.hint}>{Strings.lorryReceiptHint}</Text>

        <View style={styles.actions}>
          <Pressable
            onPress={() => open(false)}
            style={[styles.button, styles.buttonOutlined]}
          >
            <Ionicons name="eye-outline" size={18} color={AppColors.primary} />
            <Text style={styles.buttonOutlinedText}>{Strings.viewLr}</Text>
          </Pressable>
          <View style={styles.actionGap} />
          <Pressable
            onPress={() => open(true)}
            style={[styles.button, styles.buttonFilled]}
          >
            <Ionicons name="download-outline" size={18} color={AppColors.white} />
            <Text style={styles.buttonFilledText}>{Strings.downloadLr}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 15 },
  card: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.secondary100,
    padding: 15,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 12 },
  label: { ...Typography.body2.semiBold, color: TextShade.c700 },
  number: {
    ...Typography.body1.extraBold,
    color: AppColors.text,
    marginTop: 2,
  },
  hint: {
    ...Typography.body2.regular,
    color: TextShade.c700,
    marginTop: 12,
  },
  actions: { flexDirection: 'row', marginTop: 15 },
  actionGap: { width: 12 },
  button: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonOutlined: {
    borderWidth: 1.5,
    borderColor: Primary.c300,
    backgroundColor: AppColors.white,
  },
  buttonOutlinedText: { ...Typography.button2.extraBold, color: AppColors.primary },
  buttonFilled: { backgroundColor: AppColors.primary },
  buttonFilledText: { ...Typography.button2.extraBold, color: AppColors.white },
});
