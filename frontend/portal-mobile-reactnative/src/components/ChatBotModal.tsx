import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FAQ_CHIPS, WELCOME_TEXT, replyTo } from '../utils/karenBot';
import { notify } from '../utils/dialogs';
import { colors, fonts, radius, themed } from '../theme/tokens';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface ChatBotModalProps {
  visible: boolean;
  onClose: () => void;
}

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const welcome = (): ChatMessage => ({ id: 'welcome', sender: 'bot', text: WELCOME_TEXT, time: now() });

/** KarenBot: preguntas frecuentes y paso a un asesor por WhatsApp. */
export const ChatBotModal: React.FC<ChatBotModalProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome()]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const counter = useRef(0);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (replyTimer.current) clearTimeout(replyTimer.current); }, []);

  const send = (value?: string) => {
    const text = (value ?? input).trim();
    if (!text || typing) return;
    const id = counter.current++;
    setMessages(prev => [...prev, { id: `user-${id}`, sender: 'user', text, time: now() }]);
    if (value === undefined) setInput('');
    setTyping(true);
    replyTimer.current = setTimeout(() => {
      const reply = replyTo(text);
      setMessages(prev => [...prev, { id: `bot-${id}`, sender: 'bot', time: now(), ...reply }]);
      setTyping(false);
    }, 600);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => notify('No pudimos abrir el enlace', 'Inténtalo de nuevo desde tu navegador.'));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={styles.column} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.head}>
            <View style={styles.avatar}><Ionicons name="chatbubbles" size={20} color="#FFFFFF" /></View>
            <View style={styles.flex}>
              <Text style={styles.title}>KarenBot</Text>
              <Text style={styles.subtitle}>Te respondo al instante</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar chat de ayuda">
              <Ionicons name="close" size={26} color={colors.mora} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map(message => (
              <View key={message.id} style={[styles.row, message.sender === 'user' && styles.rowUser]}>
                <View style={[styles.bubble, message.sender === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                  <Text style={[styles.text, message.sender === 'user' && styles.textUser]}>{message.text}</Text>
                  {message.actionUrl ? (
                    <TouchableOpacity
                      style={styles.action}
                      onPress={() => openLink(message.actionUrl as string)}
                      accessibilityRole="link"
                    >
                      <Text style={styles.actionText}>{message.actionLabel || 'Abrir enlace'}</Text>
                      <Ionicons name="open-outline" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : null}
                  <Text style={[styles.time, message.sender === 'user' && styles.timeUser]}>{message.time}</Text>
                </View>
              </View>
            ))}
            {typing && (
              <View style={styles.row}>
                <View style={[styles.bubble, styles.bubbleBot]} accessibilityLabel="KarenBot está escribiendo" accessibilityLiveRegion="polite">
                  <Text style={styles.text}>···</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBar} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {FAQ_CHIPS.map(chip => (
              <TouchableOpacity key={chip.label} style={styles.chip} onPress={() => send(chip.label)} accessibilityRole="button">
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Escribe tu consulta aquí…"
              placeholderTextColor={colors.inkFaint}
              returnKeyType="send"
              onSubmitEditing={() => send()}
              accessibilityLabel="Mensaje para KarenBot"
            />
            <TouchableOpacity
              style={[styles.send, (!input.trim() || typing) && styles.sendDisabled]}
              onPress={() => send()}
              disabled={!input.trim() || typing}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  // En tabletas la conversación es una columna centrada, no una línea de texto de borde a borde.
  column: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  screen: { flex: 1, backgroundColor: colors.aisle },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.sticker,
    borderBottomWidth: 2, borderBottomColor: colors.mora, paddingHorizontal: 16, paddingVertical: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.mora, backgroundColor: colors.karen, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.tag, fontSize: 22, color: colors.mora },
  subtitle: { fontFamily: fonts.medium, fontSize: 13, color: colors.mora },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  messages: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.rule, borderTopLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.karen, borderTopRightRadius: 4 },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  textUser: { fontFamily: fonts.semibold, color: '#FFFFFF' },
  time: { fontFamily: fonts.body, fontSize: 11, color: colors.inkMuted, marginTop: 4 },
  timeUser: { color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  action: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 40, marginTop: 8,
    paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.mora, backgroundColor: '#0E7A43',
  },
  actionText: { fontFamily: fonts.tag, fontSize: 13, color: '#FFFFFF' },
  chipsBar: { flexGrow: 0, borderTopWidth: 2, borderTopColor: colors.rule, backgroundColor: colors.card },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.rule, backgroundColor: colors.card },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 2, borderTopColor: colors.rule, backgroundColor: colors.card },
  input: {
    flex: 1, minWidth: 0, minHeight: 46, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.ruleStrong,
    backgroundColor: colors.aisle, paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 15, color: colors.ink,
  },
  send: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.mora, backgroundColor: colors.karen, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
}));
