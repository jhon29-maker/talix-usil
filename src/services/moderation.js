import leoProfanity from 'leo-profanity';

// Spanish bad words list (supplement leo-profanity's ES dictionary)
const EXTRA_ES = [
  'puta','puto','mierda','coño','joder','hostia','gilipollas','idiota','imbecil',
  'estupido','pendejo','culero','verga','chinga','pinche','cabron','marica',
  'maricón','perra','zorra','prostituta','puto','asco','idiota','animal',
  'inutil','basura','maldito','hdp','ctm','wtf','stfu','fk','fck',
];

leoProfanity.add(leoProfanity.getDictionary('en'));
leoProfanity.add(EXTRA_ES);

export const ModerationService = {
  checkText: (text) => {
    if (!text) return { ok: true };
    const hasProfanity = leoProfanity.check(text);
    return {
      ok: !hasProfanity,
      cleaned: hasProfanity ? leoProfanity.clean(text) : text,
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
