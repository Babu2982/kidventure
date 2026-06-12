import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — KidVenture",
};

/**
 * Plain-language privacy policy. Accurate to how the app actually
 * works today: all data lives on the device; nothing is collected.
 * If you enable Supabase sync or add analytics later, UPDATE THIS
 * PAGE FIRST — Play Store Families policy requires it to be accurate.
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-slate-50 px-6 py-10">
      <article className="max-w-2xl mx-auto bg-white rounded-3xl shadow p-8 font-body text-slate-700 leading-relaxed">
        <h1 className="font-display text-3xl text-slate-800 mb-1">
          🎒 KidVenture — Privacy Policy
        </h1>
        <p className="text-sm text-slate-400 mb-6">Last updated: June 2026</p>

        <h2 className="font-display text-xl text-slate-800 mt-6 mb-2">
          The short version
        </h2>
        <p>
          KidVenture stores everything on your device and sends nothing
          anywhere. There are no accounts, no ads, no analytics, no tracking,
          and no third-party data sharing.
        </p>

        <h2 className="font-display text-xl text-slate-800 mt-6 mb-2">
          What the app stores, and where
        </h2>
        <p>
          Child profiles (a first name or nickname, an age, and a chosen
          cartoon avatar), game progress, stars, stickers, and activity-diary
          entries are saved only in the app&apos;s local storage on your own
          device. Deleting a profile from the Parent Dashboard, clearing the
          app&apos;s data, or uninstalling the app removes this information
          permanently. We have no copy of it and no way to access it.
        </p>

        <h2 className="font-display text-xl text-slate-800 mt-6 mb-2">
          What the app does not do
        </h2>
        <p>
          KidVenture does not collect personal information, does not require
          registration, does not show advertising, does not contain in-app
          purchases, does not use analytics or crash-reporting services, does
          not access the camera, microphone, contacts, or location, and does
          not include links that take children outside the app. The
          read-aloud feature uses your device&apos;s built-in text-to-speech
          engine; no audio or text leaves the device.
        </p>

        <h2 className="font-display text-xl text-slate-800 mt-6 mb-2">
          Fonts
        </h2>
        <p>
          The web version of KidVenture loads its display fonts from Google
          Fonts, which involves your browser requesting font files from
          Google&apos;s servers (a standard technical request that includes
          your IP address, as with any website resource). The Android app
          bundles everything and works fully offline.
        </p>

        <h2 className="font-display text-xl text-slate-800 mt-6 mb-2">
          Parental controls
        </h2>
        <p>
          Settings, progress reports, and profile deletion sit behind a
          Parent Gate (a multiplication puzzle) designed to keep young
          children in the play area. Parents can review and delete any
          child&apos;s data at any time from the Parent Dashboard.
        </p>

        <h2 className="font-display text-xl text-slate-800 mt-6 mb-2">
          Changes &amp; contact
        </h2>
        <p>
          If a future version adds optional cloud sync, this policy will be
          updated before that feature ships. Questions are welcome at the
          contact address listed on the app&apos;s store page.
        </p>

        <p className="mt-8">
          <Link href="/" className="text-sky-600 underline underline-offset-4">
            ← Back to KidVenture
          </Link>
        </p>
      </article>
    </main>
  );
}
