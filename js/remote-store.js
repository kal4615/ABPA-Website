import { firebaseConfig } from './firebase-config.js';

const LEAGUE_DOC_PATH = ['leagues', 'abpa'];

let leagueDoc = null;
let firestoreApi = null;

export function isRemoteConfigured() {
  return Boolean(
    firebaseConfig &&
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('YOUR_')
  );
}

export async function initRemoteStore(initialState, onState, onError) {
  if (!isRemoteConfigured()) return false;

  try {
    const [{ initializeApp }, api] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]);
    firestoreApi = api;

    const app = initializeApp(firebaseConfig);
    const db = api.getFirestore(app);
    leagueDoc = api.doc(db, ...LEAGUE_DOC_PATH);

    const snapshot = await api.getDoc(leagueDoc);
    if (snapshot.exists()) {
      onState(snapshot.data());
    } else {
      await saveRemoteState(initialState);
    }

    api.onSnapshot(
      leagueDoc,
      nextSnapshot => {
        if (nextSnapshot.exists()) onState(nextSnapshot.data());
      },
      error => onError(error)
    );

    return true;
  } catch (error) {
    onError(error);
    return false;
  }
}

export async function saveRemoteState(state) {
  if (!leagueDoc || !firestoreApi) return false;
  await firestoreApi.setDoc(leagueDoc, JSON.parse(JSON.stringify(state)));
  return true;
}
