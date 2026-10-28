# गलकोट नगरपालिका — योजना भुक्तानी Dashboard

## Files
- `index.html` — Admin dashboard and print page.
- `yojana_schema.sql` — Initial database schema for a fresh setup.
- `yojana_update_migration.sql` — Additive migration for an existing setup; run after a backup.
- `yojana sample.pdf` — User-provided print reference.

## Nepali calendar fix
The Nepali date converter now supports multiple UMD export shapes and has a fallback CDN URL (`unpkg`) if jsDelivr fails. The date picker and AD/BS conversion need the converter script to load; the dashboard also uses Supabase, Chart.js, XLSX and QRCode libraries from CDNs, so the browser must have internet access for those dependencies.

## Supabase setup
1. Open your Supabase project SQL Editor.
2. For a new project, run `yojana_schema.sql` once.
3. For an existing dashboard, back up your database first, then run `yojana_update_migration.sql`.
4. In Authentication > Users, create or confirm `planning.galkotmunicipality@gmail.com`. The schema trigger/backfill sets this account's role to admin.
5. Host `index.html` over HTTPS and test sign-in, date selection, save, and print.

## Important
- Use only the Supabase publishable/anon key in browser code. Never put the `service_role` key in HTML.
- This package has not been deployed to the user's Supabase project from this environment.
- The migration adds `total_tax_amount` and restricts new/updated records to ward 1–11. It deliberately does not validate old rows with wards 12–14; review those before applying a validated constraint.


## Latest fixes (calendar, print, signatures)
- Nepali date converter script URL is corrected to the package root (`/ndc-browser.js`) and pinned to version 1.2.5, with jsDelivr and unpkg fallback.
- Both “आजको मिति” and “सम्झौता मिति” use the same Nepali calendar picker. Current date is based on Asia/Kathmandu.
- Print layout uses A4 portrait with larger text, dynamic QR on the left and a small municipal logo on the right. `logo.png` is included; the logo is also embedded in the print HTML.
- Settings now store name and पद separately for पेश गर्ने, सिफारिस गर्ने and सदर गर्ने. Printed names appear in brackets with पद below.
- Run `yojana_update_migration.sql` to add the three पद fields to an existing database. Existing Supabase login is not altered.

If the date converter is still blocked by a network policy, allow access to `cdn.jsdelivr.net` or `unpkg.com`; the correct package URL is now used.


## नवीनतम गणना र प्रिन्ट अपडेट
- प्रिन्टमा नगरपालिका लोगो बायाँ र योजनाको Dynamic QR दायाँ राखिएको छ।
- जम्मा कर स्वतः गणना हुन्छ: (VAT बिल / 1.13 × 0.015) + (बिल × 0.15) + (डोर हाजिरी × 0.01) + (भाडा × 0.10)।
- भुक्तानी रकम स्वतः गणना हुन्छ: कुल भुक्तानी रकम − कन्टिन्जेन्सी − म्यानुअल पेश्की − रनिङ बिल भुक्तानी − जम्मा कर।
- भुक्तानी रकमको इनपुट read-only गरिएको छ ताकि हातैले बदल्दा स्वतः गणना नमेटियोस्।
- VAT बिल, बिल, डोर हाजिरी र भाडाका रकम पङ्क्ति थप्दा कर र भुक्तानी रकमको देखिने गणना तुरुन्त अपडेट हुन्छ।


## पछिल्लो संशोधन
- ड्यासबोर्डको कुल देय + पेश्की कार्डले कुल भुक्तानीयोग्य रकम र म्यानुअल पेश्कीको योग देखाउँछ। बाँकी भुक्तानी कार्ड हटाइएको छ।
- कन्टिन्जेन्सी रकम अब आफैँ प्रविष्ट गर्नुपर्छ; प्राविधिक मूल्याङ्कनबाट स्वतः भरिँदैन।
- बिल पङ्क्तिमा प्रत्येक रकम र कर देखिन्छ, साथै प्रकारअनुसार जम्मा रकम/कर देखिन्छ। जम्मा करको मूल सूत्र यथावत् छ।
- सम्झौता मितिसँगै निवेदन मिति र सम्पादन गर्न मिल्ने खातामा नाम थपिएको छ। प्रिन्टमा निवेदन मिति प्रयोग हुन्छ र रकम/मिति नेपाली अंकमा देखाइन्छ।
- पुरानो परियोजनाका लागि `yojana_update_migration.sql` Backup लिएपछि चलाउनुहोस्।
