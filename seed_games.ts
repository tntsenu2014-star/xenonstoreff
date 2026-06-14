import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const games = [
  {
    name: "Free Fire (SG/MY)",
    category: "Action",
    tag: "TOP UP",
    image: "https://i.ibb.co/LhqZz1H/free-fire-logo.png",
    idLabel: "Player ID",
    idPlaceholder: "Enter Player ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "PUBG Mobile",
    category: "Battle Royale",
    tag: "FAST",
    image: "https://i.ibb.co/mS9hNn9/pubg-mobile.jpg",
    idLabel: "Character ID",
    idPlaceholder: "Enter Character ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "PUBG Mobile",
    category: "Battle Royale",
    tag: "TOP UP",
    image: "https://i.ibb.co/mS9hNn9/pubg-mobile.jpg",
    idLabel: "Character ID",
    idPlaceholder: "Enter Character ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "Delta Force",
    category: "Shooter",
    tag: "COMING SOON",
    image: "https://i.ibb.co/0y7C6d9/delta-force.jpg",
    comingSoon: true,
    isActive: true
  },
  {
    name: "Blood Strike",
    category: "Action",
    tag: "FAST",
    image: "https://i.ibb.co/q9vWvXz/blood-strike.jpg",
    idLabel: "Player ID",
    idPlaceholder: "Enter Player ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "Blood Strike",
    category: "Action",
    tag: "TOP UP",
    image: "https://i.ibb.co/q9vWvXz/blood-strike.jpg",
    idLabel: "Player ID",
    idPlaceholder: "Enter Player ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "PUBG New State",
    category: "Battle Royale",
    tag: "FAST",
    image: "https://i.ibb.co/fX0j6gQ/pubg-new-state.jpg",
    idLabel: "Account ID",
    idPlaceholder: "Enter Account ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "PUBG New State",
    category: "Battle Royale",
    tag: "TOP UP",
    image: "https://i.ibb.co/fX0j6gQ/pubg-new-state.jpg",
    idLabel: "Account ID",
    idPlaceholder: "Enter Account ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "Free Fire (Indonesia)",
    category: "Action",
    tag: "FAST",
    image: "https://i.ibb.co/LhqZz1H/free-fire-logo.png",
    idLabel: "Player ID",
    idPlaceholder: "Enter Player ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "Free Fire (Indonesia)",
    category: "Action",
    tag: "TOP UP",
    image: "https://i.ibb.co/LhqZz1H/free-fire-logo.png",
    idLabel: "Player ID",
    idPlaceholder: "Enter Player ID",
    isActive: true,
    comingSoon: false
  },
  {
    name: "Where Winds Meet",
    category: "RPG",
    tag: "COMING SOON",
    image: "https://i.ibb.co/Wf9Z7fC/where-winds-meet.jpg",
    comingSoon: true,
    isActive: true
  },
  {
    name: "Valorant (Singapore)",
    category: "Shooter",
    tag: "FAST",
    image: "https://i.ibb.co/qj5VwYQ/valorant.jpg",
    idLabel: "Riot ID",
    idPlaceholder: "Enter Riot ID#Tag",
    isActive: true,
    comingSoon: false
  }
];

async function seed() {
  console.log('Seeding games...');
  for (const game of games) {
    try {
      await addDoc(collection(db, 'games'), {
        ...game,
        createdAt: serverTimestamp()
      });
      console.log(`Added: ${game.name} (${game.tag})`);
    } catch (e) {
      console.error(`Error adding ${game.name}:`, e);
    }
  }
}

seed();
