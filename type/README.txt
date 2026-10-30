GALKOT TECH TYPING PRACTICE  (updated version)

FILES
- index.html      practice page            - race.html   multiplayer typing race
- typeadmin.html  admin dashboard          - supabase.sql  COMPLETE database setup (new)

WHAT CHANGED
1. "TYPE THE TEXT BELOW" passage: the blinking / fade-in animation is removed. The passage is now static;
   only the current character is highlighted. (Race page: the blinking current character is removed too.)
   The passage is no longer rebuilt on every key press, so there is no flicker.
2. Bug fixes
   - Backspacing to an empty box now updates the highlight correctly.
   - "Your own text" / admin texts with line breaks no longer make the test impossible (Enter is blocked).
   - Race: last keystrokes were sometimes never saved (throttle) -> now flushed; finish_typing_race is called once.
   - Race: server was polled 5x per second -> now once per ~0.8 s (bars still move smoothly).
   - Race: John Doe's progress bar jumped to 100% at the end; two players with the same name were both "(You)".
   - Race: final WPM is calculated from correct characters (no stale value for players who stopped typing).
   - Admin popup no longer crashes if the Supabase script fails to load; JPG export works on older Safari.
   - Admin e-mail is no longer pre-filled in the public HTML.
   - Duplicate CSS removed.
3. New features
   - Personal best WPM per category + duration (saved in this browser only) and "New personal best" message.
   - "Mistakes by character" list in the result popup.
   - Sound on/off button (remembered). Esc = restart.
   - Admin: "Word bank" tab (bulk add / search / delete words) and Cancel button while editing a text.

SUPABASE SETUP (supabase.sql)
1. Supabase -> Authentication -> Users -> Add user (admin e-mail + password, Auto confirm).
2. SQL Editor -> paste the whole supabase.sql -> Run. (Safe to run again. If your admin e-mail is not
   pilotprosoft@gmail.com change it in the last statement.)
3. js/config.js keeps your project URL + publishable key. Never put a service-role key in browser code.
The SQL creates: typing_admin, typing_prompts, typing_word_bank, typing_race_rooms, typing_race_participants,
Row Level Security policies, join_typing_race() / finish_typing_race(), realtime, and starter texts/words.
