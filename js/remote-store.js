import { adminEmail, firebaseConfig } from './firebase-config.js';

const LEAGUE_DOC_PATH = ['leagues', 'abpa'];

let firebaseApp = null;
let auth = null;
let authApi = null;
let leagueDoc = null;
let firestoreApi = null;
let signedInUser = null;

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
    await initFirebaseServices();

    const snapshot = await firestoreApi.getDoc(leagueDoc);
    if (snapshot.exists()) {
      onState(snapshot.data());
    } else {
      try {
        await saveRemoteState(initialState);
      } catch (error) {
        console.warn('Initial Firestore document was not created:', error);
      }
    }

    firestoreApi.onSnapshot(
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

async function initFirebaseServices() {
  if (firebaseApp && firestoreApi && authApi && leagueDoc && auth) return;

  const [{ initializeApp }, firestore, firebaseAuth] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js')
    ]);

  firebaseApp = firebaseApp || initializeApp(firebaseConfig);
  firestoreApi = firestore;
  authApi = firebaseAuth;

  const db = firestoreApi.getFirestore(firebaseApp);
  leagueDoc = firestoreApi.doc(db, ...LEAGUE_DOC_PATH);
  auth = authApi.getAuth(firebaseApp);

  authApi.onAuthStateChanged(auth, user => {
    signedInUser = user;
  });
}

export async function saveRemoteState(state) {
  if (!leagueDoc || !firestoreApi) return false;
  await firestoreApi.setDoc(leagueDoc, JSON.parse(JSON.stringify(state)));
  return true;
}

export function isAdminEmailConfigured() {
  return Boolean(adminEmail && !adminEmail.includes('YOUR_'));
}

export function isAdminSignedIn() {
  return Boolean(signedInUser);
}

export async function signInAdmin(password) {
  if (!isRemoteConfigured()) throw new Error('Firebase is not configured.');
  if (!isAdminEmailConfigured()) throw new Error('Admin email is not configured.');
  await initFirebaseServices();
  const credential = await authApi.signInWithEmailAndPassword(auth, adminEmail, password);
  signedInUser = credential.user;
  return credential.user;
}

export async function signOutAdmin() {
  if (!auth || !authApi) return;
  await authApi.signOut(auth);
  signedInUser = null;
}
