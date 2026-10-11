# Hitch Illini setup guide

This guide lists every account and key the app needs, in the order you need them.

| Account | Needed for | Cost |
| --- | --- | --- |
| **Expo Go** app on your phone | Running the app (Phase 1) | Free, no account needed |
| **Supabase** | Login, database, photos, chat (Phase 1) | Free plan |
| **Google Cloud** (Maps key) | Address search + route distance (Phase 2) | Free monthly allowance; needs a card on file |
| Email-sending service, e.g. **Resend** (optional) | Letting *other* students sign in (before demos) | Free plan |

Venmo needs no developer account. The app just opens each rider's own Venmo app.

---

## Part 1: Expo Go (5 min)

1. On your phone, install **Expo Go** from the App Store (iPhone) or Google Play (Android).
2. That's it. You don't need to create an Expo account to test.

---

## Part 2: Supabase (15 min)

### 2a. Create the project

1. Go to <https://supabase.com> and click **Start your project**.
2. Sign up with any email (your `@illinois.edu` is easiest).
3. Click **New project**:
   - **Name:** `halfsies`
   - **Database password:** click *Generate*, then save it in a password manager. You won't need it in the app.
   - **Region:** the US region nearest you (e.g. East US / Ohio).
   - **Plan:** Free.
4. Wait about 2 minutes while it sets up.

### 2b. Copy your two keys into `.env`

1. In the project folder, copy the example file:
   ```bash
   cp .env.example .env
   ```
2. In Supabase, click the **Connect** button at the top of the project, or open **Project Settings → API Keys**.
3. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`) into `EXPO_PUBLIC_SUPABASE_URL`.
4. Copy the **Publishable key** (starts with `sb_publishable_`) into `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

> ⚠️ Never put the **secret** key (`sb_secret_…`) or the old `service_role` key in the app or in `.env`. Those keys can bypass all security rules. The publishable key is safe because the database's Row Level Security rules decide what each user can do.

`.env` is listed in `.gitignore`, so git will never commit it.

### 2c. Create the database tables

1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/migrations/20261003000000_phase1_profiles_and_cars.sql` from this project, copy everything, and paste it in.
3. Click **Run**. You should see *"Success. No rows returned."*
4. Check **Table Editor**: you should see `profiles` and `cars`. **Storage** should show an `avatars` bucket.

Each later phase adds one new migration file. Run them in filename order.

### 2d. Connect an email service (Resend)

Supabase's built-in email sender only allows **2 emails per hour**, and it **won't let you edit the email templates**. So connect a free email service first.

1. Sign up at <https://resend.com/signup> **using your `@illinois.edu` email**. Until you verify a domain you own, Resend only delivers to the address you signed up with, which is all you need for testing.
2. In Resend, go to **API Keys → Create API Key**, name it `halfsies`, and copy the key (starts with `re_`).
3. In Supabase, go to **Authentication → Emails → Set up SMTP** (button at the top right), turn on **Enable custom SMTP**, and enter:
   - Sender email: `onboarding@resend.dev`
   - Sender name: `Hitch Illini`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your `re_…` key
4. Click **Save**. You can now send about 30 emails per hour (**Authentication → Rate Limits**).

### 2e. Send a 6-digit code instead of a magic link

By default Supabase emails a clickable link. We want a code you can type. The templates are only editable after step 2d.

1. Go to **Authentication → Emails** (email templates).
2. Open the **Magic Link** template. Set the subject to `Your Hitch Illini code`, click **Source**, and replace the body with:
   ```html
   <h2>Your Hitch Illini sign-in code</h2>
   <p>Enter this code in the app:</p>
   <p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>It expires in 1 hour. If you didn't request it, you can ignore this email.</p>
   ```
   Save.
3. Do the same for the **Confirm signup** template. Brand-new users get this one on their first sign-in.
4. Go to **Authentication → Sign In / Providers → Email**. Make sure **Email** is enabled and **Email OTP Length** is `6`.

### Good to know: who can get codes

With Resend's free setup above, only **your own** email receives codes. Before friends or classmates try the app, verify a domain in Resend (Part 4).

---

## Part 3: Google Maps key (do this at the start of Phase 2)

1. Go to <https://console.cloud.google.com> and sign in with a Google account.
2. Click the project picker at the top, then **New project**, name it `Hitch Illini`, and click **Create**.
3. Open **Billing** and link a billing account. Google requires a card, but Maps has a free monthly allowance that a student project should stay under. Also go to **Billing → Budgets & alerts** and create a $5 budget alert so nothing surprises you.
4. Go to **APIs & Services → Library** and enable:
   - **Places API (New)**: address autocomplete.
   - **Routes API**: route distance. This is Google's replacement for the older Directions API, which new projects can no longer turn on.
5. Go to **APIs & Services → Credentials → Create credentials → API key**. Copy it into `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`.
6. Click the new key, then **API restrictions → Restrict key**, and tick only **Places API (New)** and **Routes API**. Save.

The map itself needs no key in Expo Go. iPhone uses Apple Maps, and Android uses Expo Go's built-in Google Maps setup.

---

## Part 4: Email for everyone (before other students use it)

1. Buy a cheap domain (about $10/year, e.g. a `halfsies.app`-style name).
2. In Resend, open **Domains → Add Domain** and follow the guide to verify it.
3. In Supabase, go to **Authentication → Emails → SMTP Settings** and change **Sender email** to an address on your domain, e.g. `login@yourdomain.com`.
4. Raise the limit under **Authentication → Rate Limits** if needed (e.g. 100 emails per hour).

---

## Run the app

```bash
npm install
npx expo start
```

- **iPhone:** open the Camera app and point it at the QR code in the terminal.
- **Android:** open Expo Go and tap **Scan QR code**.

On campus Wi-Fi (IllinoisNet), your phone often can't see your laptop. If the app won't load, use a tunnel instead:

```bash
npx expo start --tunnel
```

After editing `.env`, stop the server (Ctrl+C) and start it again.

---

## Phase 1 test checklist

- [ ] Type a Gmail address and tap **Send me a code**. You should see "Hitch Illini is only for UIUC students…"
- [ ] Type your `@illinois.edu` address. A 6-digit code arrives (check spam), and typing it signs you in.
- [ ] You land on **Set up your profile**. Tap **Save** with an empty name and you should see an error.
- [ ] Add a photo, name, year, bio, and chat preference.
- [ ] Turn on **I want to drive too**. Try MPG `2` (rejected), then a real car. Save.
- [ ] You land on **Find a ride**, which says "Hey <your first name> 👋".
- [ ] The **Profile** tab shows your photo, details, and car. **Edit profile** opens with everything filled in.
- [ ] Switch your phone to dark mode. Everything should stay readable.
- [ ] **Sign out**, then sign back in. You should skip profile setup and go straight to Find a ride.
- [ ] In Supabase, check **Table Editor** for your rows in `profiles` and `cars`, and **Storage → avatars** for your photo.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Red screen: "Missing Supabase keys" | Fill in `.env`, then restart `npx expo start`. |
| No code email | Check spam. Make sure Resend is connected (2d) and you're using the email you signed up to Resend with. Check **Authentication → Logs** in Supabase. |
| "email rate limit exceeded" | The built-in sender's 2-per-hour limit. Connect Resend (2d) or wait an hour. |
| The email has a link, not a code | Do step 2e for both templates (needs 2d first). |
| "Couldn't save your profile… row-level security" | The migration didn't fully run. Re-run step 2c. |
| QR code won't load on campus Wi-Fi | Use `npx expo start --tunnel`. |
