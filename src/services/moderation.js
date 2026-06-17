import leoProfanity from 'leo-profanity';

// Distinctive multi-character terms — matched as substrings on normalized text.
// Keep these specific enough to avoid hitting innocent words.
const EXTRA_ES = [
  // Insultos directos
  'puta','puto','mierda','coño','joder','hostia','gilipollas','idiota','imbécil','imbecil',
  'estúpido','estupido','pendejo','culero','verga','chinga','pinche','cabrón','cabron',
  'marica','maricón','maricon','perra','zorra','prostituta','inútil','inutil',
  'basura','maldito','hdp','ctm','fk','fck','wtf','stfu','psd','ptm','csm','cstm',
  // Variaciones con números/símbolos
  'put4','put@','m13rda','v3rga','c4bron','c0ño','p3ndejo','est0pid',
  'weon','huevon','huevón','conchetumare','ctmre','weón','maraco','boludo',
  'pelotudo','tarado','mogolico','mogólico','retrasado','subnormal','imbécil',
  // Insultos peruanos/latinoamericanos
  'cojudo','cojuda','concha','conchasumadre','recontraputamadre','recontracabron',
  'conchatumadre','chuchumadre','aweonao','aweonada','huevada',
  'chucha','mierdera','cagada','cagado','cagón','putamadre','hijaputa','hijoputa',
  'malparido','malparida','hpta','gonorrea','mamagüevo',
  // Contenido sexual / NSFW
  'pornografia','pornogr','desnud','masturb','follar','follam','violacion','violador',
  'pedofil','pedofilia','zoofilia','incesto','prostitu','putita','putito','culiar',
  'culear','culiao','culiada','chupame','mamame','mamada','garcha','orgasmo',
  'penetracion','vagina','pajero','pajera','meretriz','degenerad','pervertid',
  'acosador','acosador','calato','calata','encuerad','cachando','tetona','nalgas',
  'onlyfans','xxx','sexting','exhibicionista',
  // Amenazas/agresividad (frases; las palabras sueltas van en WORD_LEVEL)
  'te mato','te voy a matar','te matare','te pego','te golpeo','te voy a pegar',
  'golpear','amenaza','suicidate','matate','muerete','muérete',
  // Acoso / compartir contacto
  'dame tu numero','numero de celular','whatsapp','dame tu cel','instagram personal',
  'fuera de talix','afuera de la app','por otro lado','otro medio','telegram',
  'facebook','tiktok','snapchat','escribeme al','mi celular es','mi numero es',
];

// Short / ambiguous tokens — added word-level so they only match whole words
// (avoids false positives like "cálculo" → "culo" or "Penélope" → "pene").
const WORD_LEVEL = [
  // English
  'fuck','fucking','shit','bitch','asshole','dick','pussy','cunt','whore','slut',
  'rape','rapist','porn','nude','nudes','sex','blowjob','handjob','cum','boobs','tits',
  'nipple','nsfw','horny','milf','bastard','motherfucker','faggot','nigger','retard',
  // Español corto / ambiguos (solo coinciden como palabra completa)
  'culo','pene','teta','tetas','semen','sexo','zorra','perra','calzon','gil',
  'tanga','pezon','pezones','garchar','pija','poronga','matar','mato','matare',
];

leoProfanity.add(leoProfanity.getDictionary('en'));
leoProfanity.add(EXTRA_ES);
leoProfanity.add(WORD_LEVEL);

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Lowercase, strip accents and map common leetspeak so "M1€RD4" → "mierda".
function normalizeText(text) {
  return stripAccents(String(text).toLowerCase())
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a')
    .replace(/5/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/9/g, 'g')
    .replace(/@/g, 'a').replace(/\$/g, 's').replace(/!/g, 'i').replace(/\+/g, 't')
    .replace(/€/g, 'e');
}

// Collapse separators and 3+ repeats so "p u t a", "p.u.t.a" and "putaaaa" → "puta".
function squeeze(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1');
}

// Normalize the substring list once for matching.
const BAD_SUBSTR = [...new Set(EXTRA_ES.map(normalizeText))];

// Detect attempts to share contact info / take the deal off-platform.
function hasContactSharing(text) {
  const compact = text.replace(/[\s.\-()_+]/g, '');
  if (/\d{7,}/.test(compact)) return true; // phone numbers (7+ digits)
  if (/(https?:\/\/|www\.|\.com|\.net|\.org|t\.me\/|wa\.me\/)/i.test(text)) return true; // links
  if (/@[a-z0-9._]{3,}/i.test(text)) return true; // social handles / emails
  return false;
}

export const ModerationService = {
  checkText: (text) => {
    if (!text) return { ok: true };

    // Safety: block sharing phone numbers / external contacts.
    if (hasContactSharing(text)) {
      return { ok: false, reason: 'contact', cleaned: text };
    }

    const normalized = normalizeText(text); // keeps spaces
    const squeezed = squeeze(text);          // no separators, repeats collapsed

    const dictHit = leoProfanity.check(text)
      || leoProfanity.check(normalized)
      || leoProfanity.check(squeezed);
    const substrHit = BAD_SUBSTR.some(w => normalized.includes(w) || squeezed.includes(w));
    const bad = dictHit || substrHit;

    return {
      ok: !bad,
      reason: bad ? 'profanity' : undefined,
      cleaned: bad ? leoProfanity.clean(text) : text,
    };
  },

  checkImage: async (dataUrl) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) return { ok: true };
    try {
      const [nsfwjs] = await Promise.all([
        import('nsfwjs'),
        import('@tensorflow/tfjs'),
      ]);
      const model = await nsfwjs.load();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        setTimeout(res, 5000);
      });
      const preds = await model.classify(img);
      const prob = (name) => preds.find(p => p.className === name)?.probability || 0;
      const porn = prob('Porn'), hentai = prob('Hentai'), sexy = prob('Sexy');
      // More sensitive: flag explicit content at low confidence + strongly suggestive.
      const nsfw = (porn + hentai) > 0.3 || porn > 0.2 || hentai > 0.2 || sexy > 0.7;
      return { ok: !nsfw, reason: nsfw ? 'nsfw' : undefined };
    } catch {
      return { ok: true };
    }
  },
};
