/**
 * "Take photo / Choose from gallery" as a bottom sheet, in place of the plain
 * system dialog: two large cards a driver can hit with a thumb, each with an
 * icon and a line saying what it does, and the name of the document being
 * added at the top so it is clear which slot the photo goes into.
 *
 * Controlled: the screen keeps which slot is being filled and passes `visible`.
 */
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';

export type PhotoSourceChoice = 'camera' | 'library';

interface Props {
  visible: boolean;
  /** What is being added, e.g. "Licence — Front". */
  label?: string;
  onPick: (source: PhotoSourceChoice) => void;
  onClose: () => void;
}

export function PhotoSourceSheet({ visible, label, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* Tapping above the sheet closes it, as a cancel. */}
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <Text style={styles.title}>{label || Strings.registerPhotoSourceTitle}</Text>
          <Text style={styles.subtitle}>{Strings.photoSourceSubtitle}</Text>

          <View style={styles.options}>
            <SourceCard
              icon="camera"
              title={Strings.registerPhotoCamera}
              note={Strings.photoSourceCameraNote}
              onPress={() => onPick('camera')}
            />
            <SourceCard
              icon="images"
              title={Strings.registerPhotoGallery}
              note={Strings.photoSourceGalleryNote}
              onPress={() => onPick('library')}
            />
          </View>

          <Pressable onPress={onClose} style={styles.cancel} hitSlop={6}>
            <Text style={styles.cancelText}>{Strings.registerPhotoCancel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SourceCard({
  icon,
  title,
  note,
  onPress,
}: {
  icon: 'camera' | 'images';
  title: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      android_ripple={{ color: Primary.c100 }}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={AppColors.white} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.cardNote} numberOfLines={2}>
        {note}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: TextShade.c200,
    marginBottom: 16,
  },
  title: { ...Typography.h4.extraBold, color: AppColors.text },
  subtitle: { ...Typography.body2.regular, color: TextShade.c700, marginTop: 4 },
  options: { flexDirection: 'row', gap: 12, marginTop: 18 },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Primary.c300,
    backgroundColor: AppColors.secondary100,
  },
  cardPressed: { backgroundColor: Primary.c100 },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...Typography.body2.bold,
    color: AppColors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  cardNote: {
    ...Typography.caption.regular,
    color: TextShade.c700,
    marginTop: 4,
    textAlign: 'center',
  },
  cancel: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TextShade.c200,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelText: { ...Typography.button2.extraBold, color: TextShade.c700 },
});
