"use client";

import React, { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "@/app/src/lib/firebase-client";
import { setDoc, doc, collection, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import type { Users } from "@/app/src/interface/data";
import { MdEdit, MdDelete } from "react-icons/md";
import { useRoleGuard } from "@/app/src/hooks/useRoleGuard";

export default function AdminUserManager() {
   const { loading: loadingRole} = useRoleGuard(["admin"]);
  const [pseudo, setPseudo] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("utilisateur");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<Users[]>([]);

  // États pour gestion édition
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Partial<Users>>({});

  // Ajout user
 // Ajout user
const handleAddUser = async (e: React.FormEvent) => {
  e.preventDefault();
  setMessage("");
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      pseudo,
      contact,
      email: user.email,
      role, // ici role est bien "user" ou "admin"
      register_date: new Date().toISOString(),
    });
    setMessage("Utilisateur créé !");
    setPseudo("");
    setContact("");
    setEmail("");
    setPassword("");
    setRole("user");
    await fetchUsers();
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    setMessage("Erreur : " + (errorObj.code || errorObj.message || String(err)));
  }
};
  // Suppression user avec confirmation
  const handleDeleteUser = async (userId: string, pseudo: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${pseudo}" ?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter(u => u.id !== userId));
      setMessage("Utilisateur supprimé !");
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      setMessage("Erreur lors de la suppression : " + (errorObj.code || errorObj.message || String(err)));
    }
  };

  // Modification user
  const handleUpdateUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        pseudo: editUser.pseudo,
        contact: editUser.contact,
        role: editUser.role,
      });
      setMessage("Utilisateur modifié !");
      setEditUserId(null);
      setEditUser({});
      await fetchUsers();
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      setMessage("Erreur lors de la modification : " + (errorObj.code || errorObj.message || String(err)));
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    setUsers(
      snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as Users),
        id: docSnap.id,
      }))
    );
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  
if (loadingRole) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement des droits...</p>
      </div>
    );
  }
  return (
    <div style={{
      maxWidth: 800,
      margin: "30px auto",
      padding: 24,
      background: "#f8fafc",
      borderRadius: 12,
      boxShadow: "0 4px 12px #0001"
    }}>
      <h2 style={{
        textAlign: "center",
        color: "#2d3748",
        letterSpacing: 1,
        marginBottom: 32
      }}>
        Gestion des utilisateurs
      </h2>
      <form onSubmit={handleAddUser} style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        background: "#fff",
        padding: 18,
        borderRadius: 9,
        marginBottom: 30,
        boxShadow: "0 2px 6px #0001"
      }}>
        <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Pseudo" required style={{padding: 8, borderRadius: 6, border: "1px solid #CBD5E1"}} />
        <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact" required style={{padding: 8, borderRadius: 6, border: "1px solid #CBD5E1"}} />
        <input value={email} type="email" onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{padding: 8, borderRadius: 6, border: "1px solid #CBD5E1"}} />
        <input value={password} type="password" onChange={e => setPassword(e.target.value)} placeholder="Mot de passe temporaire" required style={{padding: 8, borderRadius: 6, border: "1px solid #CBD5E1"}} />
        <select value={role} onChange={e => setRole(e.target.value)} required style={{padding: 8, borderRadius: 6, border: "1px solid #CBD5E1"}}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" style={{
          gridColumn: "span 2",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: 10,
          fontWeight: "bold",
          fontSize: 16,
          cursor: "pointer"
        }}>Créer utilisateur</button>
        {message && (
          <div style={{
            gridColumn: "span 2",
            color: message.startsWith("Erreur") ? "red" : "green",
            fontWeight: 600,
            textAlign: "center"
          }}>{message}</div>
        )}
      </form>
      <h3 style={{marginTop: 0, marginBottom: 12, color: "#434190"}}>Liste des utilisateurs</h3>
      <div style={{
        overflowX: "auto",
        background: "#fff",
        borderRadius: 8,
        padding: 4,
        boxShadow: "0 2px 6px #0001"
      }}>
        <table style={{width: "100%", borderCollapse: "collapse"}}>
          <thead>
            <tr style={{background: "#E5E7EB"}}>
              <th style={{padding: "8px 10px"}}>Pseudo</th>
              <th style={{padding: "8px 10px"}}>Email</th>
              <th style={{padding: "8px 10px"}}>Contact</th>
              <th style={{padding: "8px 10px"}}>Rôle</th>
              <th style={{padding: "8px 10px"}}>Inscrit le</th>
              <th style={{padding: "8px 10px"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{padding: 8}}>
                  {editUserId === u.id ? (
                    <input
                      value={editUser.pseudo ?? ""}
                      onChange={e => setEditUser({...editUser, pseudo: e.target.value})}
                      style={{padding: 4, borderRadius: 4, border: "1px solid #ddd"}}
                    />
                  ) : u.pseudo}
                </td>
                <td style={{padding: 8}}>{u.email}</td>
                <td style={{padding: 8}}>
                  {editUserId === u.id ? (
                    <input
                      value={editUser.contact ?? ""}
                      onChange={e => setEditUser({...editUser, contact: e.target.value})}
                      style={{padding: 4, borderRadius: 4, border: "1px solid #ddd"}}
                    />
                  ) : u.contact}
                </td>
                <td style={{padding: 8}}>
                  {editUserId === u.id ? (
                    <select
                      value={editUser.role ?? ""}
                      onChange={e => setEditUser({...editUser, role: e.target.value})}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : u.role}
                </td>
                <td style={{padding: 8}}>{u.register_date ? new Date(u.register_date).toLocaleDateString() : "-"}</td>
                <td style={{padding: 8, display: "flex", gap: 8, justifyContent: "center" }}>
                  {editUserId === u.id ? (
                    <>
                      {/* Valider (icône verte check ou texte) */}
                      <button
                        onClick={() => handleUpdateUser(u.id)}
                        style={{
                          background: "#22c55e",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "6px 10px",
                          cursor: "pointer",
                          marginRight: 4
                        }}>
                        Valider
                      </button>
                      <button
                        onClick={() => { setEditUserId(null); setEditUser({}); }}
                        style={{
                          border: "1px solid #ccc",
                          color: "#555",
                          borderRadius: 4,
                          padding: "6px 10px",
                          cursor: "pointer"
                        }}>
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Icône MODIFIER */}
                      <button
                        onClick={() => { setEditUserId(u.id); setEditUser(u); }}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#2563eb",
                          fontSize: 20
                        }}
                        title="Modifier"
                      >
                        <MdEdit />
                      </button>
                      {/* Icône SUPPRIMER */}
                      <button
                        onClick={() => handleDeleteUser(u.id, u.pseudo)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#dc2626",
                          fontSize: 20
                        }}
                        title="Supprimer"
                      >
                        <MdDelete />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}