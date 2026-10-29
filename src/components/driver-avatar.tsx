/**
 * The driver's photo when one was uploaded (admin Add New Driver Info, the
 * app's registration or Profile), else the stock avatar.
 *
 * The stock avatar is always drawn underneath, so the frame is never empty
 * while the photo loads - opening the sidebar re-reads the profile and used to
 * leave a blank circle until the download finished. A link that no longer
 * loads (an expired signature on a profile cached from days ago) leaves just
 * the stock avatar showing.
 */
import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp, StyleSheet, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { useSession } from '@/core/session';

export function DriverAvatar({ style }: { style: StyleProp<ImageStyle> }) {
  const url = useSession((s) => s.user?.profilePhotoUrl);
  const [failed, setFailed] = useState(false);
  // A fresh profile brings a fresh link, worth trying again.
  useEffect(() => setFailed(false), [url]);

  return (
    <View>
      <Image source={Images.avatar} style={style} />
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          style={[style, styles.over]}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  over: { position: 'absolute', top: 0, left: 0 },
});
