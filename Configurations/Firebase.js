import admin from "firebase-admin";
import serviceAccount from "../automaticsprinkler-firebase-adminsdk-fbsvc-6c97c5d4ac.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const firebaseDB = admin.database();

export { firebaseDB };