// Profile → Payment: the handles riders use to pay you.

import { router } from 'expo-router';

import { Body, Button, Card, IconRow, Screen } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function MyPaymentScreen() {
  const { payment } = useAuth();
  return (
    <Screen edges={['bottom']}>
      <Card>
        {payment ? (
          <>
            {payment.venmo_username ? <IconRow icon="wallet-outline" text={`Venmo @${payment.venmo_username}`} /> : null}
            {payment.cashapp_cashtag ? <IconRow icon="cash-outline" text={`Cash App $${payment.cashapp_cashtag}`} /> : null}
            {payment.paypal_username ? <IconRow icon="logo-paypal" text={`PayPal.me/${payment.paypal_username}`} /> : null}
          </>
        ) : (
          <Body muted>Add Venmo, Cash App or PayPal so riders can pay you in one tap.</Body>
        )}
      </Card>
      <Body muted style={{ fontSize: 14 }}>
        Private: only riders on your trips see these, once it&apos;s time to pay.
      </Body>
      <Button title={payment ? 'Change payment handles' : 'Add payment handles'} variant="secondary" onPress={() => router.push('/edit-profile')} />
    </Screen>
  );
}
