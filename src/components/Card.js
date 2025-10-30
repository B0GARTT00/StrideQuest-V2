import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/ThemeProvider';

export default function Card({ title, subtitle, style, compact = false, large = false, icon = null, children }) {
  const showChildren = children !== undefined && children !== null;

  // Safely wrap string/number children in Text to avoid RN runtime errors
  const renderChildren = () => {
    return React.Children.map(children, (child, idx) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return (
          <Text key={`txt-${idx}`} style={[styles.title, compact && styles.titleCompact, large && styles.titleLarge]}>
            {child}
          </Text>
        );
      }
      return child;
    });
  };

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        large && styles.wrapLarge,
        style,
        { backgroundColor: theme.colors.primary }
      ]}
    >
      <View style={[styles.cardInner, compact && styles.cardInnerCompact, large && styles.cardInnerLarge]}>
        {showChildren ? (
          renderChildren()
        ) : (
          <View style={styles.row}>
            {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
            <View style={{ flex: 1 }}>
              {title ? (
                <Text
                  style={[styles.title, compact && styles.titleCompact, large && styles.titleLarge]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text
                  style={[styles.subtitle, compact && styles.subtitleCompact, large && styles.subtitleLarge]}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    marginVertical: 8,
    padding: 2,
  },
  wrapCompact: {
    marginVertical: 2,
  },
  cardInner: {
    backgroundColor: theme.colors.card || theme.colors.dark,
    borderRadius: 10,
    padding: 16,
  },
  cardInnerCompact: {
    padding: 6,
  },
  cardInnerLarge: {
    padding: 28,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700'
  },
  titleCompact: {
    fontSize: 13,
  },
  titleLarge: {
    fontSize: 20,
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: 6,
  }
  ,
  subtitleCompact: {
    marginTop: 2,
    fontSize: 11
  }
  ,
  subtitleLarge: {
    marginTop: 8,
    fontSize: 15
  }
  ,
  row: { flexDirection: 'row', alignItems: 'center' }
});
