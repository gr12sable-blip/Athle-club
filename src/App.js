// Injection forcée du design moderne
if (typeof document !== 'undefined') {
  const script = document.createElement('script');
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}



import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { 
  ClipboardList, Trash2, LogOut, Plus, 
  Loader2, BrainCircuit, Check, XCircle
} from 'lucide-react';

// ==========================================
// 1. CONFIGURATION FIREBASE (À REMPLIR)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCeSX-JBBOH38_KDBJ9b0CVDeEzRgPqIYA",
  authDomain: "athle-8ab39.firebaseapp.com",
  projectId: "athle-8ab39",
  storageBucket: "athle-8ab39.firebasestorage.app",
  messagingSenderId: "794846952754",
  appId: "1:794846952754:web:23fac2106a95a68bacab2b"
};

const CLUB_ID = "dream-team-athle-official-v1";

// Initialisation
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('planning');
  const [loading, setLoading] = useState(true);
  
  // Données
  const [sessions, setSessions] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // Admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [csvInput, setCsvInput] = useState("");
  const [newAthleteName, setNewAthleteName] = useState("");

  // --- Connexion ---
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Erreur Auth:", err));
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // --- Synchronisation Firestore ---
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubSessions = onSnapshot(collection(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions'), (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubMembers = onSnapshot(collection(db, 'artifacts', CLUB_ID, 'public', 'data', 'members'), (snap) => {
      setAthletes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAttendance = onSnapshot(collection(db, 'artifacts', CLUB_ID, 'public', 'data', 'attendance'), (snap) => {
      const attMap = {};
      snap.docs.forEach(d => { attMap[d.id] = d.data(); });
      setAttendanceData(attMap);
    });

    return () => { unsubSessions(); unsubMembers(); unsubAttendance(); };
  }, [user]);

  // --- Actions Coach ---
  const handleImport = async () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.trim().split('\n');
    for (const [i, line] of lines.entries()) {
      const [date, time, type, coach, location, desc] = line.split(/[;,]/).map(p => p?.trim());
      if (!date) continue;
      const id = `sess_${date.replace(/[^0-9]/g, '')}_${Date.now()}_${i}`;
      await setDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions', id), {
        date, time: time || "18:30", type: type || "Entraînement", coach: coach || "Club", location: location || "Stade", description: desc || ""
      });
    }
    setCsvInput("");
    alert("Séances publiées !");
  };

  const deleteSession = async (id) => {
    if (window.confirm("Supprimer cette séance ?")) {
      await deleteDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions', id));
    }
  };

  const addAthlete = async () => {
    if (!newAthleteName.trim()) return;
    const id = `ath_${Date.now()}`;
    await setDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'members', id), { name: newAthleteName });
    setNewAthleteName("");
  };

  const deleteAthlete = async (id) => {
    if (window.confirm("Supprimer ce membre ?")) {
      await deleteDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'members', id));
    }
  };

  const saveAttendance = async (sessId, status) => {
    if (!currentUserProfile) return;
    const ref = doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'attendance', String(sessId));
    await setDoc(ref, { [currentUserProfile.id]: status }, { merge: true });
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr.replace(/-/g, '/'));
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch { return dateStr; }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600">CHARGEMENT...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-900">
      <header className="bg-white border-b sticky top-0 z-40 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><ClipboardList size={18} /></div>
          <h1 className="font-black italic tracking-tighter text-blue-950">ATHLÉTRACK</h1>
        </div>
        <nav className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-black">
          <button onClick={() => setView('planning')} className={`px-4 py-2 rounded-lg ${view === 'planning' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>PLANNING</button>
          <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-lg ${view === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>COACH</button>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto p-4 pt-8">
        {view === 'planning' && (
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-black italic uppercase text-blue-950 tracking-tighter">Programme</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dream Team Athlé</p>
              </div>
              {!currentUserProfile && (
                <button onClick={() => setView('profiles')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Mon Profil</button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {sessions.sort((a,b) => new Date(a.date.replace(/-/g, '/')) - new Date(b.date.replace(/-/g, '/'))).map(s => {
                const attendants = athletes.filter(ath => attendanceData[s.id]?.[ath.id] === 'present');
                const myStatus = currentUserProfile ? attendanceData[s.id]?.[currentUserProfile.id] : null;

                return (
                  <div key={s.id} className={`bg-white p-6 rounded-[2rem] border-2 transition-all ${myStatus === 'present' ? 'border-green-500 shadow-lg' : 'border-white shadow-sm'}`}>
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2">
                      <span>{s.type}</span>
                      <span>{s.time}</span>
                    </div>
                    <h3 className="text-xl font-black mb-1">{formatDate(s.date)}</h3>
                    <p className="text-blue-600 text-[10px] font-black mb-4 uppercase tracking-widest">📍 {s.location}</p>
                    <div className="bg-slate-50 p-4 rounded-2xl text-sm italic mb-4">{s.description}</div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {attendants.map(a => <span key={a.id} className="text-[9px] bg-slate-100 px-2 py-1 rounded-full font-bold">{a.name}</span>)}
                    </div>

                    {currentUserProfile && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => saveAttendance(s.id, 'present')} className={`py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 ${myStatus === 'present' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Check size={14}/> Présent</button>
                        <button onClick={() => saveAttendance(s.id, 'absent')} className={`py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 ${myStatus === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}`}><XCircle size={14}/> Absent</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'profiles' && (
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-2xl font-black italic mb-8">QUI ES-TU ?</h2>
            <div className="grid grid-cols-2 gap-3">
              {athletes.sort((a,b) => a.name.localeCompare(b.name)).map(a => (
                <button key={a.id} onClick={() => { setCurrentUserProfile(a); setView('planning'); }} className="bg-white p-4 rounded-2xl border-2 border-transparent hover:border-blue-500 font-bold shadow-sm">
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {!isAdminAuthenticated ? (
              <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center border">
                <BrainCircuit className="mx-auto mb-4 text-blue-600" size={40} />
                <input type="password" placeholder="Mot de passe" className="w-full p-4 rounded-xl bg-slate-50 border text-center font-bold mb-4 outline-none focus:border-blue-500" 
                       onChange={(e) => e.target.value === "Coach" && setIsAdminAuthenticated(true)} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                    <h3 className="font-black text-[10px] uppercase mb-4 text-blue-600 tracking-widest">Importer Séances</h3>
                    <textarea value={csvInput} onChange={e => setCsvInput(e.target.value)} 
                              className="w-full h-32 p-4 bg-slate-50 rounded-xl text-xs font-mono mb-4 border-0 outline-none"
                              placeholder="Date;Heure;Type;Coach;Lieu;Description"/>
                    <button onClick={handleImport} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Publier</button>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                    <h3 className="font-black text-[10px] uppercase mb-4 tracking-widest">Liste des Séances</h3>
                    <div className="space-y-2">
                        {sessions.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-xs font-bold">{s.date} - {s.type}</span>
                                <button onClick={() => deleteSession(s.id)} className="text-red-500 p-2"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
                    <h3 className="font-black text-[10px] uppercase mb-4 text-blue-600 tracking-widest">Membres</h3>
                    <div className="flex gap-2 mb-4">
                        <input value={newAthleteName} onChange={e => setNewAthleteName(e.target.value)} 
                               className="flex-grow p-3 bg-slate-50 rounded-xl text-sm font-bold" placeholder="Nom..."/>
                        <button onClick={addAthlete} className="bg-blue-600 text-white p-3 rounded-xl"><Plus/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {athletes.map(a => (
                            <div key={a.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs">
                                <span className="font-bold">{a.name}</span>
                                <button onClick={() => deleteAthlete(a.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setIsAdminAuthenticated(false)} className="w-full text-slate-400 font-black text-[10px] uppercase py-4">Déconnexion Coach</button>
              </div>
            )}
          </div>
        )}
      </main>

      {currentUserProfile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl z-50">
          <span className="text-sm font-bold">{currentUserProfile.name}</span>
          <button onClick={() => setCurrentUserProfile(null)} className="text-white/40 hover:text-white"><LogOut size={16}/></button>
        </div>
      )}
    </div>
  );
}