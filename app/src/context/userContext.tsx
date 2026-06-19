"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/src/lib/firebase-client";

type UserRole = "user" | "admin" | null;

type UserContextType = {
  user: FirebaseUser | null;
  role: UserRole;
  pseudo: string | null;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  role: null,
  pseudo: null,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);

      if (!u) {
        setRole(null);
        setPseudo(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          console.warn("Document utilisateur introuvable dans Firestore pour uid:", u.uid);
          setRole(null);
          setPseudo(null);
          setLoading(false);
          return;
        }

        const docData = docSnap.data();

        const firestoreRole =
          docData && typeof docData.role === "string" &&
          (docData.role === "user" || docData.role === "admin")
            ? docData.role
            : null;

        const firestorePseudo =
          docData && typeof docData.pseudo === "string"
            ? docData.pseudo
            : null;

        console.log("UserContext role:", firestoreRole, "uid:", u.uid, "docData:", docData);

        setRole(firestoreRole);
        setPseudo(firestorePseudo);
      } catch (error) {
        console.error("Erreur lors de la récupération du profil utilisateur:", error);
        setRole(null);
        setPseudo(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, role, pseudo, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}