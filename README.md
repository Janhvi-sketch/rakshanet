# RakshaNet

Disaster alert and response application.

## Run The App

1. Start the backend from the repository root: `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`.
2. In `rakshanet`, install dependencies with `npm install`.
3. Start the app with `npm run dev`, or build it with `npm run build`.

RakshaNet polls the backend for active alerts for the signed-in user's village. The six priority Shivgaon residents are included in both app and backend data. Their profiles include a friend relationship so the family view can display it.

## Real SMS And WhatsApp

The backend always creates an in-app alert record. Real SMS and WhatsApp delivery requires a Twilio account, an approved sender, and these environment variables from `backend/.env.example`:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SMS_FROM`
- `TWILIO_WHATSAPP_FROM`

WhatsApp recipients must opt in and Twilio template approval may be required for messages outside the customer-service window. Phone numbers must be stored in valid international format. Never commit the real auth token.

Native push notifications additionally require Firebase Cloud Messaging setup and a real device token; the current app notification works through the authenticated app's live polling path.

## Connect A Phone To Your Local Server

Find the computer's LAN IPv4 address with `ipconfig`, for example `192.168.1.20`. Start the backend on all network interfaces with `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000`, allow Python through Windows Firewall, and build RakshaNet with `VITE_API_BASE_URL=http://192.168.1.20:8000 npm run build`. The phone and computer must be on the same Wi-Fi. `127.0.0.1` inside an APK means the phone itself.

For notification-bar delivery, place `google-services.json` from the Firebase Android app at `rakshanet/android/app/google-services.json`, set `GOOGLE_APPLICATION_CREDENTIALS` on the backend to a Firebase service-account JSON path, then rebuild with `npx cap sync android`. FCM can deliver while the app is backgrounded or closed; the local server still needs internet access to reach Firebase and the phone needs a valid FCM token. The APK currently allows local HTTP for development; use HTTPS in production.

## Share The APK

Run `npm run build`, then sync Capacitor with `npx cap sync android`. Open the Android project with `npx cap open android`, select a connected device or emulator, and run it from Android Studio. For a distributable APK use Android Studio's Build > Generate App Bundles or APKs. Configure the backend URL for the device instead of `127.0.0.1`, because that address points to the phone itself.
