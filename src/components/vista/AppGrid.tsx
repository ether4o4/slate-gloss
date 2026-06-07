import React, {useCallback, memo} from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import {Vista} from '../../theme';
import {
  type AppInfo,
  launchApp,
  openAppInfo,
  uninstallApp,
} from '../../native/Launcher';

interface AppGridProps {
  apps: AppInfo[];
  ListHeaderComponent?: React.ComponentProps<typeof FlatList>['ListHeaderComponent'];
  ListEmptyComponent?: React.ComponentProps<typeof FlatList>['ListEmptyComponent'];
}

const NUM_COLUMNS = 4;

const AppTile = memo(({app}: {app: AppInfo}) => {
  const onLongPress = useCallback(() => {
    Alert.alert(app.label, undefined, [
      {text: 'App info', onPress: () => openAppInfo(app.packageName)},
      {
        text: 'Uninstall',
        style: 'destructive',
        onPress: () => uninstallApp(app.packageName),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  }, [app]);

  return (
    <Pressable
      style={({pressed}) => [styles.tile, pressed && styles.tilePressed]}
      onPress={() => launchApp(app.packageName)}
      onLongPress={onLongPress}
      delayLongPress={350}>
      <View style={styles.iconWrap}>
        {app.icon ? (
          <Image source={{uri: app.icon}} style={styles.icon} fadeDuration={0} />
        ) : (
          <View style={[styles.icon, styles.iconFallback]}>
            <Text style={styles.iconLetter}>{app.label.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {app.label}
      </Text>
    </Pressable>
  );
});

export const AppGrid: React.FC<AppGridProps> = ({
  apps,
  ListHeaderComponent,
  ListEmptyComponent,
}) => {
  const renderItem = useCallback(
    ({item}: {item: AppInfo}) => <AppTile app={item} />,
    [],
  );

  return (
    <FlatList
      data={apps}
      keyExtractor={item => item.packageName}
      renderItem={renderItem}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={20}
      maxToRenderPerBatch={16}
      windowSize={7}
    />
  );
};

const styles = StyleSheet.create({
  content: {paddingHorizontal: 12, paddingBottom: 88, paddingTop: 8},
  row: {justifyContent: 'flex-start'},
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  tilePressed: {backgroundColor: 'rgba(255,255,255,0.14)'},
  iconWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: {width: 52, height: 52, borderRadius: 12},
  iconFallback: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLetter: {color: Vista.text, fontSize: 22, fontWeight: '700'},
  label: {
    color: Vista.text,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 80,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
});

export default AppGrid;
