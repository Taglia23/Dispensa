// Controlla la dispensa e invia una notifica push ai dispositivi registrati.
// Viene eseguito ogni giorno da GitHub Actions (vedi .github/workflows/notifiche.yml).
import admin from 'firebase-admin';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!sa.project_id) { console.error('Manca il secret FIREBASE_SERVICE_ACCOUNT'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const EXP_DAYS = 3;
const APP_URL = process.env.APP_URL || '';

const tz = 'Europe/Rome';
const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
const daysTo = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(todayIso + 'T00:00:00Z')) / 86400000);
const list = (arr, n = 4) => arr.slice(0, n).join(', ') + (arr.length > n ? ` e altri ${arr.length - n}` : '');

const households = await db.collection('households').listDocuments();
for (const hh of households) {
  const prods = (await hh.collection('products').get()).docs.map((d) => d.data());
  const low = prods.filter((p) => !p.skip && (p.qty ?? 0) <= (p.min ?? 0)).map((p) => p.name);
  const exp = prods.filter((p) => (p.qty ?? 0) > 0 && p.expiry && daysTo(p.expiry) <= EXP_DAYS)
    .sort((a, b) => daysTo(a.expiry) - daysTo(b.expiry))
    .map((p) => { const d = daysTo(p.expiry); return `${p.name} (${d < 0 ? 'scaduto' : d === 0 ? 'oggi' : d === 1 ? 'domani' : 'tra ' + d + ' gg'})`; });
  if (!low.length && !exp.length) { console.log(hh.id, ': niente da segnalare'); continue; }

  const devSnap = await hh.collection('devices').get();
  const tokens = devSnap.docs.map((d) => d.data().token).filter(Boolean);
  if (!tokens.length) { console.log(hh.id, ': nessun dispositivo registrato'); continue; }

  const title = exp.length && low.length ? `${exp.length} in scadenza · ${low.length} da ricomprare`
    : exp.length ? `${exp.length} prodotti in scadenza` : `${low.length} cose da ricomprare`;
  const body = [exp.length ? 'Scade: ' + list(exp, 3) : '', low.length ? 'Sta finendo: ' + list(low) : ''].filter(Boolean).join('\n');

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    webpush: {
      notification: { title, body, icon: APP_URL + 'icons/icon-192.png', tag: 'riepilogo' },
      data: { url: './index.html#spesa', tag: 'riepilogo' },
      ...(APP_URL ? { fcmOptions: { link: APP_URL + '#spesa' } } : {})
    }
  });
  console.log(hh.id, `: inviate ${res.successCount}/${tokens.length}`);
  // Elimina i dispositivi non più validi (app disinstallata, permesso tolto…)
  await Promise.all(res.responses.map((r, i) => {
    const code = r.error && r.error.code;
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token' || code === 'messaging/invalid-argument') {
      return hh.collection('devices').doc(tokens[i]).delete();
    }
    return null;
  }));
}
process.exit(0);
