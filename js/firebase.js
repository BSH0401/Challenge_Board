import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
let sdkPromise = null;

export const isConfigured = () => Boolean(firebaseConfig && firebaseConfig.apiKey);

// Firebase SDK는 필요할 때만 불러온다. 체험 모드에서는 내려받지 않는다.
function sdk() {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const [appM, authM, fsM] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`),
      ]);
      const app = appM.initializeApp(firebaseConfig);
      const auth = authM.getAuth(app);
      let db;
      try {
        db = fsM.initializeFirestore(app, {
          localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }),
        });
      } catch (e) {
        db = fsM.getFirestore(app);
      }
      return { authM, fsM, auth, db };
    })();
  }
  return sdkPromise;
}

export async function watchUser(callback) {
  const { authM, auth } = await sdk();
  await authM.getRedirectResult(auth).catch(() => null);
  return authM.onAuthStateChanged(auth, callback);
}

export async function signIn() {
  const { authM, auth } = await sdk();
  const provider = new authM.GoogleAuthProvider();
  try {
    await authM.signInWithPopup(auth, provider);
  } catch (e) {
    const useRedirect = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'];
    if (useRedirect.includes(e.code)) await authM.signInWithRedirect(auth, provider);
    else if (e.code !== 'auth/popup-closed-by-user') throw e;
  }
}

export async function signOutUser() {
  const { authM, auth } = await sdk();
  await authM.signOut(auth);
}

// 내 기록 저장소: users/{uid} (시즌 목록), users/{uid}/days/{YYYY-MM-DD}, users/{uid}/missions/{id}
export async function createFirestoreStore(uid) {
  const { fsM, db } = await sdk();
  const { doc, getDoc, setDoc, deleteDoc, collection, getDocs } = fsM;
  const userRef = doc(db, 'users', uid);
  const plain = (o) => JSON.parse(JSON.stringify(o)); // undefined 값 제거

  return {
    kind: 'owner',
    async load() {
      let profile;
      try {
        profile = await getDoc(userRef);
      } catch (e) {
        if (e.code === 'permission-denied') {
          const err = new Error('이 계정은 이 보드를 쓸 수 없어요.');
          err.code = 'not-owner';
          throw err;
        }
        throw e;
      }
      const [daySnap, missionSnap] = await Promise.all([
        getDocs(collection(userRef, 'days')),
        getDocs(collection(userRef, 'missions')),
      ]);
      const days = {};
      daySnap.forEach((d) => { const { updatedAt, ...record } = d.data(); days[d.id] = record; });
      const missions = [];
      missionSnap.forEach((d) => missions.push({ id: d.id, ...d.data() }));
      return { days, missions, seasons: profile.exists() ? profile.data().seasons ?? [] : [] };
    },
    saveDay: (key, record) => setDoc(doc(userRef, 'days', key), { ...plain(record), updatedAt: new Date().toISOString() }),
    saveMission: ({ id, ...rest }) => setDoc(doc(userRef, 'missions', id), plain(rest)),
    deleteMission: (id) => deleteDoc(doc(userRef, 'missions', id)),
    saveSeasons: (seasons) => setDoc(userRef, { seasons: plain(seasons) }, { merge: true }),
  };
}
