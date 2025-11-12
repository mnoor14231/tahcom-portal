# Push Notifications Setup

Web push is now enabled for Tahcom Portal. The app will prompt signed-in users to allow notifications so they can receive task updates even when the PWA is closed.

## Default VAPID keys

For convenience the project ships with a default VAPID key pair. You **should replace these keys** in production.

```
Public:  BBS-5m8-nZLTjJDmWEgTi4o65N1c9_ezF4MJHt2BQsHOEPmLiBwXxo9sQjt3I_l_eL_DvukgLIV9lm_HCodv92c
Private: Oc7ILnd1PtIHQmKURfQ73J7WNJwNy58ng3qqOJJOLDs
Contact: notifications@tahcom.com (configurable)
```

To rotate:

1. Run `npx web-push generate-vapid-keys`.
2. Set the environment variables:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - (Optional) `VAPID_CONTACT_EMAIL`
   - `VITE_VAPID_PUBLIC_KEY` (for the Vite front-end)
3. Redeploy the server and web app.

The defaults are only used if the environment variables are missing.

## Infrastructure requirements

- Supabase credentials must be configured so we can store push subscriptions in the `push_subscriptions` table.
- The Node API must expose `POST /api/push/send`. The client sends the user’s Supabase access token in the `Authorization` header.
- The Vite PWA service worker is extended with `public/push-handler.js` to render notifications and focus the app when opened.

## Local testing

1. `npm run dev` (frontend) and `npm run start` from `server/`.
2. Log in, accept the “Enable task alerts” prompt, and make sure notifications are allowed in your browser.
3. Assign a task to another account; the assignee’s browser (even if closed) should receive a push.

Safari on iOS requires installing the app to the home screen first; Chrome/Edge on desktop & Android work directly over HTTPS/localhost.


