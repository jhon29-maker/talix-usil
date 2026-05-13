import leoProfanity from 'leo-profanity';

const EXTRA_ES = [
  // Insultos directos
  'puta','puto','mierda','coño','joder','hostia','gilipollas','idiota','imbécil','imbecil',
  'estúpido','estupido','pendejo','culero','verga','chinga','pinche','cabrón','cabron',
  'marica','maricón','maricon','perra','zorra','prostituta','asco','inútil','inutil',
  'basura','maldito','hdp','ctm','fk','fck','wtf','stfu','psd','ptm','csm','cstm',
  // Variaciones con números/símbolos
  'put4','put@','m13rda','v3rga','c4bron','c0ño','cul0','p3ndejo','est0pid',
  'weon','huevon','huevón','conchetumare','ctmre','weón','maraco','gil','boludo',
  'pelotudo','tarado','mogolico','mogólico','retrasado','subnormal','imbécil',
  // Insultos peruanos/latinoamericanos
  'cojudo','cojuda','concha','conchasumadre','recontraputamadre','recontracabron',
  'papaya','conchatumadre','chuchumadre','aweonao','aweonada','huevada',
  'chucha','mierdera','cagada','cagado','cagón','putamadre','hijaputa','hijoputa',
  'malparido','malparida','hp','hpta','gonorrea','parce','mamagüevo',
  // Amenazas/agresividad
  'mato','matar','te mato','te voy a matar','te pego','te golpeo',
  'golpear','amenaza','ataque','te voy','voy a',
  // Acoso
  'dame tu numero','numero de celular','whatsapp','dame tu cel','instagram personal',
  'fuera de talix','afuera de la app','por otro lado','otro medio',
];

leoProfanity.add(leoProfanity.getDictionary('en'));
leoProfanity.add(EXTRA_ES);

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/@/g, 'a')
    .replace(/\$/g, 's').replace(/!/g, 'i');
}

export const ModerationService = {
  checkText: (text) => {
    if (!text) return { ok: true };
    const normalized = normalizeText(text);
    const hasProfanity = leoProfanity.check(text) || leoProfanity.check(normalized);
    // Also check raw word list directly for compound words
    const rawMatch = EXTRA_ES.some(word => normalized.includes(word.toLowerCase()));
    return {
      ok: !hasProfanity && !rawMatch,
      cleaned: (hasProfanity || rawMatch) ? leoProfanity.clean(text) : text,
    };
  },

  checkImage: async (dataUrl) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) return { ok: true };
    try {
      // Dynamic import so TF.js only loads when needed
      const [nsfwjs, tf] = await Promise.all([
        import('nsfwjs'),
        import('@tensorflow/tfjs'),
      ]);
      const model = await nsfwjs.load();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        setTimeout(res, 5000); // timeout fallback
      });
      const predictions = await model.classify(img);
      const nsfw = predictions.find(
        p => ['Porn', 'Hentai'].includes(p.className) && p.probability > 0.6
      );
      return { ok: !nsfw, reason: nsfw?.className };
    } catch {
      return { ok: true }; // allow if check fails (don't block upload)
    }
  },
};
