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

VERSION 3 ADDITIONS
- Name popup when the site opens (practice + race). The name is kept in this tab only until the page is refreshed
  (refresh = asked again). It is never saved permanently. The race uses the same name as display name.
- Dark / Light mode (remembered), Fullscreen button, on-screen keyboard (next key highlighted, correct = green,
  wrong = red, finger colour strip; show/hide with the keyboard button).
- Real-time: Live WPM (last 10 s), Net WPM, Gross WPM, Accuracy, Correct and Wrong counters. Wrong key flashes red
  on the passage and keyboard and the status line says which key was expected.
  Gross WPM = (all typed characters / 5) per minute.  Net WPM = Gross - mistakes per minute.
- Race page shows your own Net/Gross/Accuracy/Correct/Wrong live, plus the keyboard.
- Files: js/common.js (theme, fullscreen, name), js/keyboard.js (new).

SUPABASE SETUP (supabase.sql)
1. Supabase -> Authentication -> Users -> Add user (admin e-mail + password, Auto confirm).
2. SQL Editor -> paste the whole supabase.sql -> Run. (Safe to run again. If your admin e-mail is not
   pilotprosoft@gmail.com change it in the last statement.)
3. js/config.js keeps your project URL + publishable key. Never put a service-role key in browser code.
The SQL creates: typing_admin, typing_prompts, typing_word_bank, typing_race_rooms, typing_race_participants,
Row Level Security policies, join_typing_race() / finish_typing_race(), realtime, and starter texts/words.

VERSION 4 ADDITIONS
- Admin button/hint removed; Ctrl+Shift+A opens admin login. Name is remembered (editable via name chip).
- Finger Guide is now its own page: fingers.html (menu link "Finger Guide").
- Live hand guide (js/handguide.js): with the keyboard visible, shows the next key, the finger/hand to use (Nepali + English
  guidance, Shift finger included), both hands dim except the active finger, and a press animation per keystroke
  (green = correct, red = wrong). Works on practice and race pages. Race keyboard is hidden until the keyboard icon is clicked.

VERSION 6 ADDITIONS
- New category "Single character": one big character at a time. "Words" is now "Easy Words" and "Hard Words".
- Duration "Unlimited": time counts up; press Finish to see the result.
- Typing is accepted without clicking the box (practice + race). After a result: Enter = Practice again / Race again (race auto-joins).
- Hand guide: no text on the hands; the key to press appears on the active fingertip (Shift finger shows a shift mark).
- Typewriter lines under "GALKOT TECH PRESENTS" (incl. "Concept by Nabin Chalise") are editable in Admin -> "Typewriter text".
- DATABASE: run the whole supabase.sql again (safe). It adds typing_headlines, word-bank "level" (easy/hard),
  moves old "words" texts to "easy_words", and adds update rights for the word bank.
