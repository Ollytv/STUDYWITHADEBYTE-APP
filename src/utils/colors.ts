import { ColorLabel } from '../types';

export const COLOR_MAP: Record<ColorLabel, { bg: string; text: string; border: string; dot: string; light: string }> = {
  green:  { bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/40',  dot: 'bg-green-500',  light: '#22c55e' },
  blue:   { bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/40',   dot: 'bg-blue-500',   light: '#3b82f6' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', dot: 'bg-purple-500', light: '#a855f7' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', dot: 'bg-orange-500', light: '#f97316' },
  red:    { bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/40',    dot: 'bg-red-500',    light: '#ef4444' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40', dot: 'bg-yellow-500', light: '#eab308' },
  pink:   { bg: 'bg-pink-500/20',   text: 'text-pink-400',   border: 'border-pink-500/40',   dot: 'bg-pink-500',   light: '#ec4899' },
  cyan:   { bg: 'bg-cyan-500/20',   text: 'text-cyan-400',   border: 'border-cyan-500/40',   dot: 'bg-cyan-500',   light: '#06b6d4' },
  teal:   { bg: 'bg-teal-500/20',   text: 'text-teal-400',   border: 'border-teal-500/40',   dot: 'bg-teal-500',   light: '#14b8a6' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40', dot: 'bg-indigo-500', light: '#6366f1' },
};

export function getColorClasses(label: ColorLabel) {
  return COLOR_MAP[label] || COLOR_MAP.green;
}

export const COLOR_OPTIONS: { value: ColorLabel; label: string; hex: string }[] = [
  { value: 'green',  label: 'Green',  hex: '#22c55e' },
  { value: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { value: 'purple', label: 'Purple', hex: '#a855f7' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
  { value: 'red',    label: 'Red',    hex: '#ef4444' },
  { value: 'yellow', label: 'Yellow', hex: '#eab308' },
  { value: 'pink',   label: 'Pink',   hex: '#ec4899' },
  { value: 'cyan',   label: 'Cyan',   hex: '#06b6d4' },
  { value: 'teal',   label: 'Teal',   hex: '#14b8a6' },
  { value: 'indigo', label: 'Indigo', hex: '#6366f1' },
];
