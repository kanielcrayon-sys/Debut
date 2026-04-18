"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/src/lib/firebase-client";

/** Si besoin d’extension de l’user Auth, ajoute plus tard ici. */
type UserRole = "user" | "admin" | null;

type UserContextType = {
  user: FirebaseUser | null;
  role: UserRole;
  pseudo: string | null;                // <--- Ajouté
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  role: null,
  pseudo: null,                         // <--- Ajouté
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);    // <--- Ajouté
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(userRef);
        const docData = docSnap.exists() ? docSnap.data() : undefined;
        const firestoreRole = (docData && typeof docData.role === "string" ? docData.role : null) as UserRole;
        setRole(firestoreRole);
        setPseudo(docData && typeof docData.pseudo === "string" ? docData.pseudo : null); // <--- Ajouté
      } else {
        setRole(null);
        setPseudo(null);                 // <--- Ajouté
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, role, pseudo, loading }}>
      {children}
    </UserContext.Provider>
  );
}

// Hook custom pour consommer le context
export function useUser() {
  return useContext(UserContext);
}