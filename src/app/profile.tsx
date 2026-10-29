/**
 * The driver's profile: their photo (add, change or remove it here), who they
 * are, and the tempo and licence they drive on.
 *
 * The language is no longer picked here - the dashboard's language button
 * does that.
 */
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { type ComponentProps, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppBar } from '@/components/app-bar';
import { DriverAvatar } from '@/components/driver-avatar';
import { Sidebar } from '@/components/sidebar';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import { UserRepository } from '@/core/services/user-repository';
import { useSession } from '@/core/session';
import { type PhotoAction, PhotoOptionsSheet } from '@/features/profile/photo-options-sheet';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** The photo full screen; opened by tapping it. */
  const [viewerOpen, setViewerOpen] = useState(false);
  /** Take / choose / view / remove the photo. */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const user = useSession((s) => s.user);
  const insets = useSafeAreaInsets();
  // Phones shorter than ~760dp (most budget Androids at default zoom) get a
  // tighter header and a smaller photo, so the details are reached sooner.
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const photoSize = compact ? 92 : 112;
  const photoStyle = { width: photoSize, height: photoSize, borderRadius: photoSize / 2 };
  const hasPhoto = !!user?.profilePhotoUrl;

  /** Runs a photo change, with the spinner on the avatar and one failure message. */
  const runPhoto = async (work: () => Promise<boolean>) => {
    setPhotoBusy(true);
    try {
      if (!(await work())) Alert.alert(Strings.profilePhotoTitle, Strings.profilePhotoFailed);
    } catch {
      Alert.alert(Strings.profilePhotoTitle, Strings.profilePhotoFailed);
    } finally {
      setPhotoBusy(false);
    }
  };

  const pick = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(Strings.profilePhotoTitle, Strings.registerPhotoPermission);
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      // A face, cropped square: it is shown in a circle everywhere.
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    await runPhoto(() =>
      UserRepository.updateProfilePhoto(asset.uri, asset.mimeType ?? 'image/jpeg'),
    );
  };

  const choosePhoto = () => {
    if (!photoBusy) setSheetOpen(true);
  };

  const onPhotoAction = (action: PhotoAction) => {
    if (action === 'view') {
      setViewerOpen(true);
    } else if (action === 'remove') {
      void runPhoto(() => UserRepository.removeProfilePhoto());
    } else {
      // Let the sheet finish sliding away before the camera / gallery opens
      // over it.
      setTimeout(() => void pick(action), 300);
    }
  };

  return (
    <View style={styles.screen}>
      <AppBar
        title={Strings.sideBarProfile}
        leading="menu"
        onLeadingPress={() => setDrawerOpen(true)}
      />

      {/* The app draws edge to edge, so the system navigation bar sits over
          the bottom of the screen: pad past it, or the last card is cut off. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[AppColors.primary, '#0B7A6F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, compact ? styles.heroCompact : null]}
        >
          {/* Tapping the photo shows it full screen; the camera badge (or
              tapping when there is no photo yet) changes it. */}
          <View style={photoStyle}>
            <Pressable
              onPress={() => (hasPhoto && !photoBusy ? setViewerOpen(true) : choosePhoto())}
              accessibilityLabel={Strings.profilePhotoTitle}
            >
              <DriverAvatar style={[styles.photo, photoStyle]} />
              {photoBusy ? (
                <View style={[styles.photoBusy, { borderRadius: photoSize / 2 }]}>
                  <ActivityIndicator color={AppColors.white} />
                </View>
              ) : null}
            </Pressable>
            <Pressable onPress={choosePhoto} style={styles.cameraBadge} hitSlop={8}>
              <Ionicons name="camera" size={16} color={AppColors.primary} />
            </Pressable>
          </View>
          <Pressable onPress={choosePhoto} hitSlop={8}>
            <Text style={styles.photoAction}>
              {hasPhoto ? Strings.profilePhotoChange : Strings.profilePhotoAdd}
            </Text>
          </Pressable>

          <Text style={[styles.name, compact ? styles.nameCompact : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {user?.name ?? ''}
          </Text>
          <View style={styles.heroChips}>
            <View style={styles.chip}>
              <Ionicons name="call" size={13} color={AppColors.white} />
              <Text style={styles.chipText}>{`+${Strings.commonCountryCode} ${user?.mobileNumber ?? ''}`}</Text>
            </View>
            {user?.status === 'Active' ? (
              <View style={[styles.chip, styles.chipActive]}>
                <View style={styles.activeDot} />
                <Text style={styles.chipText}>{Strings.profileActive}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.stats}>
          <Stat icon="checkmark-done-circle" value={String(user?.completedTripCount ?? 0)} label={Strings.tripComplete} />
          <View style={styles.statDivider} />
          <Stat icon="calendar" value={formatDate(user?.createdAt) || '—'} label={Strings.profileMemberSince} />
        </View>

        <Section title={Strings.profileVehicleSection}>
          <Row icon="bus" label={Strings.tempoNumber} value={user?.vehicleNumber} />
          <Row icon="card" label={Strings.profileDrivingLicence} value={user?.driverLicenceNumber} />
          <Row icon="gift" label={Strings.registerDob} value={formatDate(user?.dob)} last />
        </Section>

        <Section title={Strings.profilePersonalSection}>
          <Row
            icon="call"
            label={Strings.mobileNumber}
            value={user?.mobileNumber ? `+${Strings.commonCountryCode} ${user.mobileNumber}` : undefined}
            last={!user?.adharNumber && !user?.panNumber}
          />
          {/* Market drivers never give these; only shown when on file. */}
          {user?.adharNumber ? (
            <Row icon="finger-print" label={Strings.aadharNumber} value={formatAadhar(user.adharNumber)} last={!user?.panNumber} />
          ) : null}
          {user?.panNumber ? <Row icon="document-text" label={Strings.panNumber} value={user.panNumber} last /> : null}
        </Section>

      </ScrollView>

      <Sidebar visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <PhotoOptionsSheet
        visible={sheetOpen}
        hasPhoto={hasPhoto}
        onClose={() => setSheetOpen(false)}
        onAction={onPhotoAction}
      />
      <PhotoViewer
        url={viewerOpen ? user?.profilePhotoUrl : undefined}
        onClose={() => setViewerOpen(false)}
        onChange={() => {
          setViewerOpen(false);
          choosePhoto();
        }}
      />
    </View>
  );
}

/** The driver's photo on black, as large as the screen allows, with a close button. */
function PhotoViewer({
  url,
  onClose,
  onChange,
}: {
  /** Shown while set. */
  url?: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!url} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.viewer}>
        {url ? <Image source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" /> : null}
        <Pressable
          onPress={onClose}
          style={[styles.viewerClose, { top: insets.top + 12 }]}
          hitSlop={12}
          accessibilityLabel={Strings.lrClose}
        >
          <Ionicons name="close" size={26} color={AppColors.white} />
        </Pressable>
        <Pressable onPress={onChange} style={[styles.viewerChange, { bottom: insets.bottom + 24 }]}>
          <Ionicons name="camera" size={18} color={AppColors.text} />
          <Text style={styles.viewerChangeText}>{Strings.profilePhotoChange}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={22} color={AppColors.success500} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ icon, label, value, last }: { icon: IconName; label: string; value?: string; last?: boolean }) {
  return (
    <View style={[styles.row, last ? null : styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={AppColors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} selectable>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

/** "1234-5678-9012" — groups of four, as profile_view.dart did. */
function formatAadhar(aadhar: string): string {
  return aadhar.replace(/[^0-9]/g, '').replace(/(\d{4})(?=\d)/g, '$1-');
}

/** 'YYYY-MM-DD…' (a date or an ISO timestamp) as DD-MM-YYYY. */
function formatDate(value?: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F9' },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 46,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroCompact: { paddingTop: 16, paddingBottom: 40 },
  nameCompact: { ...Typography.h4.extraBold, marginTop: 6 },
  photo: {
    borderWidth: 4,
    borderColor: AppColors.white,
    backgroundColor: Primary.c300,
  },
  photoBusy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppColors.white,
    borderWidth: 2,
    borderColor: Primary.c300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAction: { ...Typography.caption.extraBold, color: '#FFD54A', marginTop: 8 },
  name: { ...Typography.h3.extraBold, color: AppColors.white, marginTop: 8 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  chipActive: { backgroundColor: 'rgba(23,178,106,0.35)' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7CFF6B' },
  chipText: { ...Typography.body2.bold, color: AppColors.white },
  stats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -28,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: AppColors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  statDivider: { width: 1, backgroundColor: Primary.c200 },
  statValue: { ...Typography.subtitle1.extraBold, color: AppColors.text, marginTop: 4 },
  statLabel: { ...Typography.caption.bold, color: TextShade.c700, marginTop: 1 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { ...Typography.body2.extraBold, color: TextShade.c700, marginBottom: 8, marginLeft: 4 },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: AppColors.white,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Primary.c200,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Primary.c100 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Primary.c100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, marginLeft: 12 },
  rowLabel: { ...Typography.caption.bold, color: TextShade.c700 },
  rowValue: { ...Typography.body1.extraBold, color: AppColors.text, marginTop: 1 },
  viewer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerChange: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: AppColors.white,
  },
  viewerChangeText: { ...Typography.button2.extraBold, color: AppColors.text },
});
