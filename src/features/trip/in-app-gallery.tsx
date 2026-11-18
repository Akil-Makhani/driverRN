/**
 * The phone's photos inside the app, as a bottom sheet over the Confirm Load /
 * Delivered sheet: a grid of the newest photos, tap to tick several (numbered
 * in the order picked), ADD to upload them. Tapping outside the sheet closes
 * it - the system photo picker this replaces could only be closed with back.
 *
 * An overlay rather than a Modal, for the same reason as TripPhotoPicker: it
 * opens from inside a Modal. Photos are shrunk before upload so a weak signal
 * at the pickup or the drop still gets them through.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { Strings } from '@/core/constants/strings';
import { Typography } from '@/core/constants/typography';
import type { PickedPhoto } from './trip-detail-store';

const PAGE = 60;
const COLUMNS = 3;
const GAP = 3;
/** Longest side after shrinking: plenty to read a slip or an invoice. */
const MAX_SIDE = 1600;

type Access = 'checking' | 'granted' | 'limited' | 'denied';

interface Props {
  visible: boolean;
  title: string;
  /** How many more photos this slot can take. */
  limit: number;
  onClose: () => void;
  onPicked: (photos: PickedPhoto[]) => void;
}

export function InAppGallery({ visible, title, limit, onClose, onPicked }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [access, setAccess] = useState<Access>('checking');
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const cursor = useRef<{ after?: string; hasMore: boolean }>({ hasMore: true });
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const tile = (width - GAP * (COLUMNS + 1)) / COLUMNS;

  /** In step with `loading`, but readable from a stale callback. */
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || !cursor.current.hasMore) return;
    busy.current = true;
    setLoading(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE,
        after: cursor.current.after,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      cursor.current = { after: page.endCursor, hasMore: page.hasNextPage };
      setAssets((prev) => [...prev, ...page.assets]);
    } catch (e) {
      if (__DEV__) console.log('gallery load failed:', e);
      cursor.current.hasMore = false;
    }
    busy.current = false;
    setLoading(false);
  }, []);

  const start = useCallback(async () => {
    cursor.current = { hasMore: true };
    setAssets([]);
    setAccess('checking');
    const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    if (!permission.granted) {
      setAccess('denied');
      return;
    }
    setAccess(permission.accessPrivileges === 'limited' ? 'limited' : 'granted');
    await loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (visible) {
      setSelected([]);
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
      void start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
        setMounted(false),
      );
    }
  }, [visible, anim, start]);

  if (!mounted) return null;

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= limit ? prev : [...prev, id],
    );

  const add = async () => {
    if (!selected.length || preparing) return;
    setPreparing(true);
    const chosen = selected
      .map((id) => assets.find((a) => a.id === id))
      .filter((a): a is MediaLibrary.Asset => a != null);
    const photos: PickedPhoto[] = [];
    for (const asset of chosen) {
      photos.push(await shrink(asset));
    }
    setPreparing(false);
    onPicked(photos);
  };

  const sheetHeight = Math.min(height * 0.82, height - insets.top - 24);

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <Animated.View style={[styles.scrim, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={Strings.registerPhotoCancel} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { height: sheetHeight },
          {
            transform: [
              {
                translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] }),
              },
            ],
          },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{Strings.galleryTitle}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {title} · {Strings.galleryHint}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.close} hitSlop={10}>
            <Ionicons name="close" size={22} color={AppColors.text} />
          </Pressable>
        </View>

        {access === 'limited' ? (
          <Pressable
            style={styles.banner}
            onPress={() =>
              void MediaLibrary.presentPermissionsPickerAsync(['photo']).then(() => void start())
            }
          >
            <Ionicons name="information-circle" size={18} color={AppColors.primary} />
            <Text style={styles.bannerText}>{Strings.galleryLimited}</Text>
          </Pressable>
        ) : null}

        {access === 'denied' ? (
          <View style={styles.center}>
            <Ionicons name="images-outline" size={44} color={TextShade.c500} />
            <Text style={styles.emptyText}>{Strings.galleryNoAccess}</Text>
            <Pressable style={styles.settings} onPress={() => void Linking.openSettings()}>
              <Text style={styles.settingsText}>{Strings.galleryOpenSettings}</Text>
            </Pressable>
          </View>
        ) : access === 'checking' || (loading && assets.length === 0) ? (
          <View style={styles.center}>
            <ActivityIndicator color={AppColors.primary} size="large" />
          </View>
        ) : assets.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="images-outline" size={44} color={TextShade.c500} />
            <Text style={styles.emptyText}>{Strings.galleryEmpty}</Text>
          </View>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(a) => a.id}
            numColumns={COLUMNS}
            style={styles.grid}
            contentContainerStyle={{ padding: GAP / 2, paddingBottom: 90 + insets.bottom }}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.6}
            ListFooterComponent={
              loading ? <ActivityIndicator style={styles.more} color={AppColors.primary} /> : null
            }
            renderItem={({ item }) => {
              const order = selected.indexOf(item.id);
              const isOn = order >= 0;
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  style={{ width: tile, height: tile, margin: GAP / 2 }}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={[styles.photo, isOn && styles.photoOn]}
                    contentFit="cover"
                    recyclingKey={item.id}
                    transition={120}
                  />
                  <View style={[styles.check, isOn && styles.checkOn]}>
                    {isOn ? <Text style={styles.checkText}>{order + 1}</Text> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.count}>
            {selected.length}/{limit} {Strings.gallerySelected}
          </Text>
          <Pressable
            onPress={() => void add()}
            disabled={!selected.length || preparing}
            style={[styles.addButton, (!selected.length || preparing) && styles.addButtonOff]}
          >
            {preparing ? (
              <ActivityIndicator color={AppColors.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={AppColors.white} />
                <Text style={styles.addText}>
                  {Strings.galleryAdd}
                  {selected.length ? ` (${selected.length})` : ''}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/** A gallery photo as a small JPEG in the app's cache, ready to upload. */
async function shrink(asset: MediaLibrary.Asset): Promise<PickedPhoto> {
  const base = (asset.filename || 'photo').replace(/\.[^.]+$/, '');
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    const longest = Math.max(asset.width || 0, asset.height || 0);
    if (longest > MAX_SIDE) {
      context.resize(
        (asset.width || 0) >= (asset.height || 0) ? { width: MAX_SIDE } : { height: MAX_SIDE },
      );
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
    return { uri: result.uri, fileName: `${base}.jpg`, mimeType: 'image/jpeg' };
  } catch (e) {
    // Shrinking failed (an odd format): send the original rather than nothing.
    if (__DEV__) console.log('shrink failed:', e);
    return { uri: asset.uri, fileName: asset.filename };
  }
}

const styles = StyleSheet.create({
  layer: { zIndex: 15, elevation: 15 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Primary.c300,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerText: { flex: 1 },
  title: { ...Typography.subtitle1.extraBold, color: AppColors.text },
  subtitle: { ...Typography.body2.medium, color: TextShade.c700, marginTop: 1 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Primary.c100,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Primary.c100,
  },
  bannerText: { ...Typography.body2.medium, color: AppColors.primary, flex: 1 },
  grid: { flex: 1 },
  photo: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: TextShade.c100 },
  photoOn: { opacity: 0.75, borderWidth: 3, borderColor: AppColors.primary },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.white,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: AppColors.primary },
  checkText: { ...Typography.caption.regular, color: AppColors.white, fontWeight: '800' },
  more: { marginVertical: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: {
    ...Typography.body1.medium,
    color: TextShade.c700,
    textAlign: 'center',
    marginTop: 10,
  },
  settings: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
  },
  settingsText: { ...Typography.button2.extraBold, color: AppColors.white },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: AppColors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Primary.c300,
  },
  count: { ...Typography.body2.extraBold, color: TextShade.c700, flex: 1 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 150,
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
  },
  addButtonOff: { opacity: 0.45 },
  addText: { ...Typography.button2.extraBold, color: AppColors.white },
});
