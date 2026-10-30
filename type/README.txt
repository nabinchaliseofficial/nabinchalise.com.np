GALKOT TECH TYPING PRACTICE - UPDATED

PAGES
- index.html: typing practice.
- race.html: separate multiplayer race page, opens in a new tab.
- typeadmin.html: protected admin dashboard (not linked publicly).

FEATURES
- Admin button opens a login popup. Shortcut: Ctrl + Shift + A. Successful admin role check redirects to typeadmin.html.
- Wrong characters are rejected, a popup shows expected vs pressed character, and the bottom panel counts each wrong character.
- Live WPM uses a rolling 10-second window, so it rises while typing and naturally falls during pauses.
- Caps Lock ON toast appears briefly; it does not intercept or alter typed characters.
- Your own text is held in sessionStorage only, not uploaded to Supabase; it is cleared when the browser tab session ends.
- AI Type displays 5-7 character groups per visual line (42 characters total, arranged in 6-7 groups). It uses letters, digits and special symbols; after 20 correct characters it biases the next group toward the most frequently missed characters.
- Prompt list is shuffled on each load.
- Result JPG is generated locally and not saved to the database.
- Footer branding: ... by Galkot Tech.

SUPABASE
1. Run the new supabase.sql in SQL Editor.
2. Create Auth user pilotprosoft@gmail.com. If created after SQL execution, run the admin grant statement at end of SQL.
3. Check Realtime is enabled for typing_race_rooms and typing_race_participants.
4. Keep js/config.js project URL and publishable key. Never put a service-role key in browser code.

IMPORTANT ABOUT THE 5,000 WORD BANK
The SQL creates 5,000 generated, distinct computer-science vocabulary compounds in typing_word_bank and inserts 50 additional sample prompts (10 per core category). The Words category reads and shuffles this bank.

LATEST UPDATE (Typing Error + AI Type + Race)
- Character mistakes are shown inline directly under the typing box; no error popup interrupts typing.
- Error history records the key pressed and the expected key, with counts. The history remains visible after the passage is completed.
- AI Type starts with the full lowercase alphabet, uppercase alphabet, digits, and special characters. It then drills the keys the learner missed and repeats any newly missed keys until corrected, then shows Congratulations.
- Typing Race starts automatically when the first player joins. John Doe is a virtual system opponent whose displayed pace changes through 40, 50, and 70 WPM segments. Up to four human players can join the active 60-second race (five racers total including John Doe).
- Run the complete updated supabase.sql in the Supabase SQL Editor to apply the latest race-joining function and existing schema/data setup. Upload the updated website files to hosting after SQL succeeds.
