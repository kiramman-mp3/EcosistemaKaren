import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

export type IllustrationName = 'basket' | 'ticket' | 'offline' | 'search' | 'expired' | 'thanks';

/** Ilustraciones de trazo grueso con los colores de pasillo, las mismas del portal web. */
export const Illustration: React.FC<{ name: IllustrationName; size?: number }> = ({ name, size = 120 }) => {
  const stroke = { stroke: colors.mora, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <Ellipse cx="60" cy="108" rx="34" ry="5" fill={colors.mora} opacity={0.12} />
      {name === 'basket' && (
        <G {...stroke}>
          <Path d="M30 52 L40 22 M90 52 L80 22" />
          <Path d="M18 52 H102 L94 100 H26 Z" fill={colors.sticker} />
          <Path d="M40 66 V86 M60 66 V86 M80 66 V86" />
          <Circle cx="86" cy="30" r="9" fill={colors.karen} />
          <Circle cx="38" cy="32" r="7" fill="#2FBF71" />
        </G>
      )}
      {name === 'ticket' && (
        <G {...stroke}>
          <Path d="M24 28 H96 V58 a8 8 0 0 0 0 16 V98 H24 V74 a8 8 0 0 0 0 -16 Z" fill={colors.card} />
          <Path d="M38 46 H82 M38 86 H70" />
          <Rect x="38" y="58" width="22" height="16" rx="3" fill={colors.guayaba} />
          <Circle cx="84" cy="30" r="10" fill={colors.sticker} />
          <Path d="M80 30 l3 3 l6 -7" />
        </G>
      )}
      {name === 'offline' && (
        <G {...stroke}>
          <Path d="M20 54 a56 56 0 0 1 80 0" />
          <Path d="M32 68 a38 38 0 0 1 56 0" />
          <Path d="M45 82 a20 20 0 0 1 30 0" />
          <Circle cx="60" cy="94" r="5" fill={colors.naranja} />
          <Path d="M24 22 L96 100" stroke={colors.karen} />
        </G>
      )}
      {name === 'search' && (
        <G {...stroke}>
          <Circle cx="52" cy="52" r="26" fill={colors.stickerTint} />
          <Path d="M71 71 L96 96" strokeWidth={7} />
          <Path d="M42 46 q10 -10 20 0" />
          <Circle cx="44" cy="58" r="2" fill={colors.mora} />
          <Circle cx="60" cy="58" r="2" fill={colors.mora} />
        </G>
      )}
      {name === 'expired' && (
        <G {...stroke}>
          <Circle cx="60" cy="60" r="34" fill={colors.naranjaTint} />
          <Path d="M60 38 V62 L76 70" />
          <Circle cx="94" cy="26" r="9" fill={colors.karen} />
          <Path d="M91 23 l6 6 M97 23 l-6 6" stroke="#FFFFFF" />
        </G>
      )}
      {name === 'thanks' && (
        <G {...stroke}>
          <Circle cx="60" cy="62" r="34" fill="#2FBF71" />
          <Path d="M44 62 l12 12 l22 -26" stroke="#FFFFFF" strokeWidth={6} />
          <Path d="M20 28 l6 6 M100 24 l-7 7 M60 12 v8" stroke={colors.stickerDeep} />
        </G>
      )}
    </Svg>
  );
};
