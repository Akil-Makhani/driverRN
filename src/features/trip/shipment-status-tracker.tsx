/**
 * Port of lib/screens/trip_detail/subview/shipment_status_tracker.dart.
 *
 * Flutter drew the connectors with a CustomPainter looping drawLine. RN has no
 * canvas, so each dashed run is a row of small filled Views — same 4px dash /
 * 3px gap, and it lays out with flexbox instead of needing a measured width.
 *
 * The Dart node labels were absolutely positioned with hand-tuned ±50 offsets
 * to fake centring. Here the node is a flex column with the label centred
 * under the icon, so it stays aligned at any width; the first and last labels
 * are pulled to the outer edges as they were.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Images } from '@/core/constants/assets';
import { AppColors, Primary, TextShade } from '@/core/constants/colors';
import { TripStatusNumber } from '@/core/constants/enums';
import { Strings } from '@/core/constants/strings';

const ACTIVE_COLOR = '#1E4E62';
const INACTIVE_COLOR = '#9E9E9E';

interface Props {
  /** 1 assigned · 2 accepted · 3 pickup · 4 in transit · 5 delivered. */
  status: number;
}

export function ShipmentStatusTracker({ status }: Props) {
  return (
    <View style={styles.container}>
      <Node
        label={Strings.statusAccept}
        active={status >= TripStatusNumber.accepted}
        align="start"
      />
      <Connector
        active={status >= TripStatusNumber.accepted}
        truckHere={status === TripStatusNumber.accepted}
      />

      <Node
        label={Strings.statusPickup}
        active={status >= TripStatusNumber.pickup}
        align="center"
      />
      <Connector
        active={status >= TripStatusNumber.pickup}
        truckHere={status === TripStatusNumber.pickup}
      />

      <Node
        label={Strings.statusInTransit}
        active={status >= TripStatusNumber.inTransit}
        align="center"
      />
      <Connector
        active={status >= TripStatusNumber.inTransit}
        truckHere={status === TripStatusNumber.inTransit}
      />

      <Node
        label={Strings.statusDelivered}
        active={status >= TripStatusNumber.delivered}
        align="end"
      />
    </View>
  );
}

function Node({
  label,
  active,
  align,
}: {
  label: string;
  active: boolean;
  align: 'start' | 'center' | 'end';
}) {
  return (
    <View style={styles.node}>
      {/* NOTE: 'disable.png' is the ACTIVE artwork — the two filenames are
          swapped in the source assets. Preserved from the Flutter mapping. */}
      <Image source={active ? Images.disable : Images.enable} style={styles.nodeIcon} />
      <Text
        numberOfLines={1}
        style={[
          styles.nodeLabel,
          { color: active ? ACTIVE_COLOR : INACTIVE_COLOR },
          align === 'start' && styles.labelStart,
          align === 'end' && styles.labelEnd,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * The dashed run between two nodes. When the truck sits on this segment the
 * line is split: the half behind the truck is coloured, the half ahead is grey.
 */
function Connector({ active, truckHere }: { active: boolean; truckHere: boolean }) {
  return (
    <View style={styles.connector}>
      <DashedLine color={active ? AppColors.primary : TextShade.c300} />
      {truckHere && (
        <>
          <Ionicons name="bus" size={22} color={AppColors.primary} />
          <DashedLine color={TextShade.c300} />
        </>
      )}
    </View>
  );
}

/** A run of 4px dashes with 3px gaps, filling the space it is given. */
function DashedLine({ color }: { color: string }) {
  return (
    <View style={styles.dashRow}>
      {/* 24 dashes covers the widest segment on a tablet; overflow is clipped. */}
      {Array.from({ length: 24 }, (_, i) => (
        <View key={i} style={[styles.dash, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  node: { width: 30, alignItems: 'center' },
  nodeIcon: { width: 30, height: 30, resizeMode: 'contain' },
  nodeLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
    width: 90,
    textAlign: 'center',
  },
  // Pull the outermost labels back inside the screen edges.
  labelStart: { textAlign: 'left', marginLeft: 60 },
  labelEnd: { textAlign: 'right', marginRight: 60 },
  connector: {
    flex: 1,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dashRow: { flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  dash: { width: 4, height: 2, marginRight: 3 },
});
