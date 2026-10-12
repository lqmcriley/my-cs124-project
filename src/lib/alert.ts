// Pop-up messages that work on phones and in a web browser.
// Phones get the normal pop-up with buttons. Browsers get their built-in
// confirm box (React Native's Alert does nothing on the web).

import { Alert, AlertButton, Platform } from 'react-native';

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? []).filter((button) => button.style !== 'cancel');
  if (actions.length === 0) {
    window.alert(text);
  } else if (actions.length === 1) {
    if (window.confirm(text)) actions[0].onPress?.();
  } else {
    // Several choices: offer them one at a time (OK = pick it, Cancel = next one).
    for (const action of actions) {
      if (window.confirm(`${text}\n\n${action.text}?`)) {
        action.onPress?.();
        return;
      }
    }
  }
}
