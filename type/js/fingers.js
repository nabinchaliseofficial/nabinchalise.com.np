/* Finger Placement Guide: draws a left and a right hand; each finger shows its name and the keys it presses.
   Finger numbers match js/keyboard.js (0-3 left pinky..index, 4-7 right index..pinky). */
(() => {
  const host = document.getElementById('fingerGuide');
  if (!host) return;

  // key = [main, shifted symbol (optional)]
  const L = (k, s) => ({ k, s });
  const hands = [
    {
      id: 'left', title: '🖐️ देब्रे हात', en: 'Left Hand',
      fingers: [
        { c: 0, np: 'कान्छी औँला', en: 'Pinky', h: 340, w: .86, nums: [L('1', '!')], keys: [L('Q'), L('A'), L('Z')], extra: [L('`', '~')] },
        { c: 1, np: 'साइँली औँला', en: 'Ring', h: 380, w: .9, nums: [L('2', '@')], keys: [L('W'), L('S'), L('X')] },
        { c: 2, np: 'माझी औँला', en: 'Middle', h: 408, w: .95, nums: [L('3', '#')], keys: [L('E'), L('D'), L('C')] },
        { c: 3, np: 'चोर औँला', en: 'Index', h: 380, w: 1.55, wide: true, nums: [L('4', '$'), L('5', '%')], keys: [L('R'), L('T'), L('F'), L('G'), L('V'), L('B')] }
      ],
      thumbSide: 'right'
    },
    {
      id: 'right', title: '🖐️ दाहिने हात', en: 'Right Hand',
      fingers: [
        { c: 4, np: 'चोर औँला', en: 'Index', h: 380, w: 1.55, wide: true, nums: [L('6', '^'), L('7', '&')], keys: [L('Y'), L('U'), L('H'), L('J'), L('N'), L('M')] },
        { c: 5, np: 'माझी औँला', en: 'Middle', h: 408, w: .95, nums: [L('8', '*')], keys: [L('I'), L('K'), L(',', '<')] },
        { c: 6, np: 'साइँली औँला', en: 'Ring', h: 380, w: .9, nums: [L('9', '(')], keys: [L('O'), L('L'), L('.', '>')] },
        { c: 7, np: 'कान्छी औँला', en: 'Pinky', h: 340, w: 1.05, nums: [L('0', ')'), L('-', '_'), L('=', '+')], keys: [L('P'), L(';', ':'), L('/', '?')], extra: [L('[', '{'), L(']', '}'), L('\\', '|'), L("'", '"')] }
      ],
      thumbSide: 'left'
    }
  ];
  const HOME = new Set(['A', 'S', 'D', 'F', 'J', 'K', 'L', ';']);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const chip = (o, cls) => `<span class="fg-key ${cls || ''} ${HOME.has(o.k) ? 'home' : ''}">${o.s ? `<small>${esc(o.s)}</small>` : ''}${esc(o.k)}</span>`;

  const handHtml = h => {
    const fingers = h.fingers.map(f => `
      <div class="fg-finger${f.wide ? ' wide' : ''}" style="--c:var(--f${f.c});--h:${f.h}px;flex:${f.w}" tabindex="0"
           aria-label="${h.en} ${f.en}: ${[...f.nums, ...f.keys, ...(f.extra || [])].map(o => o.k).join(' ')}">
        <i class="fg-nail"></i>
        <div class="fg-name"><b>${f.np}</b><span>${h.en} ${f.en}</span></div>
        <div class="fg-grp fg-nums">${f.nums.map(o => chip(o, 'num')).join('')}</div>
        <div class="fg-grp fg-letters">${f.keys.map(o => chip(o)).join('')}</div>
        ${f.extra ? `<div class="fg-grp fg-extra">${f.extra.map(o => chip(o, 'ex')).join('')}</div>` : ''}
      </div>`).join('');
    const thumb = `
      <div class="fg-thumb" style="--c:var(--fth)"><i class="fg-nail"></i>
        <div class="fg-name"><b>बुढी औँला</b><span>${h.en} Thumb</span></div>
        <span class="fg-key space">Space</span>
      </div>`;
    const row = h.thumbSide === 'right' ? fingers + thumb : thumb + fingers;
    return `<article class="fg-hand fg-${h.id}" aria-label="${h.en}">
      <h3>${h.title} <span>${h.en}</span></h3>
      <div class="fg-fig"><div class="fg-row">${row}</div><div class="fg-palm"><span>${h.en}</span></div></div>
    </article>`;
  };

  host.innerHTML = `<div class="fg-hands">${hands.map(handHtml).join('')}</div>
    <div class="fg-space"><span class="fg-space-bar">SPACEBAR</span><p>👍 दुवै हातका बुढी औँलाहरू <b>Spacebar</b> (खाली ठाउँ) थिच्न मात्र प्रयोग हुन्छन्।</p></div>
    <p class="fg-note">साना अक्षर = Shift सँग थिचिने चिन्ह · बाक्लो घेरा = Home row key · धर्सा भएका (\` [ ] \\ ') अतिरिक्त चिन्हहरू कान्छी औँलाले थिच्ने हुन्।</p>`;
})();
