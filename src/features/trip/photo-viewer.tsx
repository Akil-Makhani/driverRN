/**
 * A trip photo full screen: swipe between the photos of a slot, a counter on
 * top, and a close button. Drawn as an overlay rather than a Modal so it also
 * opens from inside the Confirm Load / Delivered sheets (themselves Modals).
 * Render <PhotoViewer /> as the last child of a full-screen root; open it from
 * anywhere with openPhotoViewer().
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { AppColors } from '@/core/constants/colors';
import { Typography } from '@/core/constants/typography';
import type { TripAttachment } from './trip-detail-store';

interface ViewerState {
  title: string;
  photos: TripAttachment[];
  index: number;
  visible: boolean;
}

const useViewerStore = create<ViewerState>(() => ({
  title: '',
  photos: [],
  index: 0,
  visible: false,
}));

export function openPhotoViewer(title: string, photos: TripAttachment[], index = 0) {
  if (!photos.length) return;
  useViewerStore.setState({ title, photos, index, visible: true });
}

/** Closes the viewer if it is open; says whether it was. */
export function closePhotoViewer(): boolean {
  if (!useViewerStore.getState().visible) return false;
  useViewerStore.setState({ visible: false });
  return true;
}

export function PhotoViewer() {
  const { title, photos, index, visible } = useViewerStore();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(index);

  useEffect(() => {
    if (visible) setPage(index);
  }, [visible, index]);

  // Outside a Modal the hardware back closes the viewer, not the screen.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => closePhotoViewer());
    return () => sub.remove();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <FlatList
        data={photos}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <Photo uri={item.uri} width={width} height={height} />}
      />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {photos.length > 1 ? (
            <Text style={styles.counter}>
              {page + 1} / {photos.length}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={closePhotoViewer} style={styles.close} hitSlop={10}>
          <Ionicons name="close" size={26} color={AppColors.white} />
        </Pressable>
      </View>

      {photos.length > 1 ? (
        <View style={[styles.dots, { bottom: insets.bottom + 24 }]}>
          {photos.map((p, i) => (
            <View key={p.key} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Photo({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [loading, setLoading] = useState(true);
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={{ uri }}
        style={{ width, height }}
        resizeMode="contain"
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={AppColors.white} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: 'rgba(0,0,0,0.96)', zIndex: 20, elevation: 20 },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  titleBox: { flex: 1 },
  title: { ...Typography.subtitle1.extraBold, color: AppColors.white },
  counter: { ...Typography.body2.medium, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: AppColors.white, width: 18 },
});
