/**
 * Ports the three smaller dashboard sub-views:
 *   dashboard_deliver_all_cell.dart, dashboard_top_view.dart,
 *   dashboard_emptyview.dart.
 */
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LanguageButton } from '@/components/language-button';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { useSession } from '@/core/session';
import { DriverAvatar } from '@/components/driver-avatar';
import { useProfilePhoto } from '@/features/profile/use-profile-photo';

/**
 * The batch "DELIVER ALL" button, shown below the in-transit trips. Those
 * trips render as full cards above it, so it no longer repeats their names.
 */
export function DeliverAllCell({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View>
      <View style={styles.deliverBody}>
        <Pressable onPress={onPress} style={styles.deliverButton}>
          <Text style={styles.deliverButtonText}>{label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Driver avatar, name and completed-trip count. */
export function DashboardTopView({ completedTripCount }: { completedTripCount: number }) {
  const user = useSession((s) => s.user);
  const photo = useProfilePhoto();
  return (
    <View style={styles.topView}>
      {/* Same as on Profile: the photo opens large, the badge changes it. */}
      <View>
        <Pressable onPress={photo.showPhoto} accessibilityLabel={Strings.profilePhotoTitle}>
          <DriverAvatar style={styles.topAvatar} />
          {photo.busy ? (
            <View style={styles.topAvatarBusy}>
              <ActivityIndicator color={AppColors.white} />
            </View>
          ) : null}
        </Pressable>
        <Pressable onPress={photo.choosePhoto} style={styles.topCameraBadge} hitSlop={8}>
          <Ionicons name="camera" size={12} color={AppColors.primary} />
        </Pressable>
      </View>
      <View style={styles.topText}>
        {/* A brand, so the same in every language. */}
        <Text style={styles.topBrand} numberOfLines={1}>
          Tiles Drop Saathi
        </Text>
        <Text style={styles.topName} numberOfLines={1}>
          {user?.name ?? ''}
        </Text>
        <View style={styles.topCountRow}>
          <Ionicons name="checkmark-circle" size={16} color={AppColors.success300} />
          <Text style={styles.topCount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {`${Strings.tripComplete} : ${completedTripCount}`}
          </Text>
        </View>
      </View>
      <LanguageButton />
      {photo.overlays}
    </View>
  );
}

/** Shown when there are no active or in-transit trips. */
export function DashboardEmptyView() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyCircle}>
        <Text style={styles.emptyCircleText}>{Strings.noTripAssigned}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  deliverBody: { paddingHorizontal: 10, paddingVertical: 5 },
  deliverButton: {
    height: 42,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliverButtonText: { ...Typography.button2.extraBold, color: AppColors.primary },

  topView: {
    // Grows rather than clips: a long name, Gujarati script or a large system
    // font size all made a fixed height spill on small phones.
    minHeight: 84,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: AppColors.white,
    backgroundColor: Primary.c300,
    resizeMode: 'cover',
  },
  topAvatarBusy: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topCameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.white,
    borderWidth: 1,
    borderColor: Primary.c300,
  },
  topText: { marginLeft: 12, marginRight: 8, justifyContent: 'center', flex: 1 },
  topBrand: { ...Typography.caption.extraBold, letterSpacing: 0, color: AppColors.white, marginBottom: 2 },
  topName: { ...Typography.subtitle1.extraBold, color: AppColors.white },
  topCountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  topCount: { ...Typography.body2.medium, color: Primary.c100, marginLeft: 4, flexShrink: 1 },

  empty: { flex: 1, padding: 10, justifyContent: 'space-between' },
  emptyCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    marginTop: 100,
    alignSelf: 'center',
    backgroundColor: TextShade.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircleText: {
    ...Typography.h1.extraBold,
    color: TextShade.c400,
    textAlign: 'center',
  },
});
