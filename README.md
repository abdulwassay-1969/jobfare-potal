# C@SE Job Fair Portal

Production-ready Next.js + Firebase web app for students, companies, volunteers, and admins.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Firebase Auth + Firestore
- Tailwind CSS + shadcn/ui

## Local Development

1. Install dependencies:

	npm install

2. Start dev server:

	npm run dev

3. Open:

	http://localhost:9002

## Environment Variables

Create a `.env.local` file in the project root:

NEXT_PUBLIC_APP_URL=http://localhost:9002
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=

For production (Vercel), set:

NEXT_PUBLIC_APP_URL=https://jobfare-potal.vercel.app
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=your_recaptcha_v3_site_key

## Firebase Auth Setup (Required)

In Firebase Console:

1. Authentication → Sign-in method
	- Enable Email/Password
	- Enable Google

2. Authentication → Settings → Authorized domains
	- Add `localhost`
	- Add `jobfare-potal.vercel.app`
	- Add your custom domain if used

3. Google provider setup
	- Select support email
	- Save provider configuration

4. Admin account hardening
	- Create admin account manually in Firebase Authentication users
	- Do not rely on frontend auto-creation
	- Rotate admin password and keep it private

5. App Check (recommended)
	- Firebase Console → Build → App Check
	- Register your web app and choose reCAPTCHA v3
	- Add site key to `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY`
	- Enforce App Check for Firestore/Auth after testing in monitor mode

## Verification Email Branding

Verification emails now use app return URL settings from `NEXT_PUBLIC_APP_URL`.

For professional email appearance:

- Firebase Console → Authentication → Templates → Email address verification
- Customize subject/body/button text

## Build & Deploy

Build locally:

npm run build

Deploy from `main` to Vercel.
