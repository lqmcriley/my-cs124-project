// Screen 1: Welcome / Sign in.
// Step 1: enter an @illinois.edu email -> Supabase emails a 6-digit code.
// Step 2: enter the code -> you're signed in. The root layout then moves you on.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Body, Button, ErrorText, Heading, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isIllinoisEmail, normalizeEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';

const NOT_UIUC_MESSAGE = 'Halfsies is only for UIUC students. Please use your @illinois.edu email.';

// Turn Supabase's technical errors into something a person can act on.
function friendlyError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('illinois.edu') || text.includes('database error')) return NOT_UIUC_MESSAGE;
  if (text.includes('rate limit') || text.includes('security purposes')) {
    return 'Too many codes requested. Please wait a minute and try again.';
  }
  if (text.includes('expired') || text.includes('invalid')) {
    return "That code didn't work. Check it, or tap \"Send a new code\".";
  }
  if (text.includes('network')) return "Can't reach the internet. Check your connection and try again.";
  return message;
}

export default function SignInScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function sendCode() {
    setError('');
    setNotice('');
    if (!isIllinoisEmail(email)) {
      setError(NOT_UIUC_MESSAGE);
      return;
    }
    setBusy(true);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: normalizeEmail(email),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (sendError) {
      setError(friendlyError(sendError.message));
      return;
    }
    setCode('');
    setStep('code');
    setNotice(`We sent a 6-digit code to ${normalizeEmail(email)}.`);
  }

  async function verifyCode(token: string) {
    setError('');
    setBusy(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token,
      type: 'email',
    });
    setBusy(false);
    if (verifyError) {
      setError(friendlyError(verifyError.message));
    }
    // On success there's nothing to do here: the auth provider sees the new
    // session and the root layout switches to the next screen.
  }

  function onCodeChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verifyCode(digits);
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Logo />
        <Heading style={styles.center}>Split the ride.{'\n'}Split the gas.</Heading>
        <Body muted style={styles.center}>
          Carpools for UIUC students. Share trips you&apos;re already taking and split the cost of gas fairly.
        </Body>
      </View>

      {step === 'email' ? (
        <View style={styles.form}>
          <TextField
            label="Your Illinois email"
            placeholder="netid@illinois.edu"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={sendCode}
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Send me a code" onPress={sendCode} loading={busy} disabled={!email.trim()} />
        </View>
      ) : (
        <View style={styles.form}>
          <Body>{notice}</Body>
          <TextField
            label="6-digit code"
            placeholder="123456"
            value={code}
            onChangeText={onCodeChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            style={styles.codeInput}
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Sign in" onPress={() => verifyCode(code)} loading={busy} disabled={code.length !== 6} />
          <Button title="Send a new code" variant="ghost" onPress={sendCode} disabled={busy} />
          <Button
            title="Use a different email"
            variant="ghost"
            onPress={() => {
              setStep('email');
              setError('');
            }}
            disabled={busy}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.md,
  },
  codeInput: {
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
});
