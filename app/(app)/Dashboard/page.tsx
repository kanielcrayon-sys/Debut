"use client";

import React, { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useUser } from "@/app/src/context/userContext";
import { db } from "@/app/src/lib/firebase-client";
import { collection, getCountFromServer, doc, getDoc, getDocs } from "firebase/firestore";
import { FaUserGraduate, FaChalkboardTeacher, FaLayerGroup } from "react-icons/fa";
import AlertCenter from "@/app/components/AlertCenter";
import RecentActivity from "@/app/components/RecentActivity";
import ElevesParClasseChart from "@/app/components/ElevesParClasseChart";
import ResultatsParClasseChart from "@/app/components/ResultatsParClasseChart";

export default function Dashboard() {
  const { pseudo, role, loading: loadingUser } = useUser();

  const [stats, setStats] = useState({
    eleves: null as number | null,
    profs: null as number | null,
    classes: null as number | null,
    year: null as number | null,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Pour le filtre année scolaire
  const [anneesDisponibles, setAnneesDisponibles] = useState<number[]>([]);
  const [annee, setAnnee] = useState<number | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      const elevesSnap = await getCountFromServer(collection(db, "eleves"));
      const profsSnap = await getCountFromServer(collection(db, "professeurs"));
      const classesSnap = await getCountFromServer(collection(db, "classes"));
      let year = null;
      try {
        const yearSnap = await getDoc(doc(db, "settings", "scolarite"));
        year = yearSnap.exists() ? yearSnap.data()?.annee_scolaire_active ?? null : null;
      } catch {}

      setStats({
        eleves: elevesSnap.data().count,
        profs: profsSnap.data().count,
        classes: classesSnap.data().count,
        year,
      });
      setLoadingStats(false);

      // == Récupération années dispos à partir de la collection 'inscriptions'
      const snap = await getDocs(collection(db, "inscriptions"));
      const years = Array.from(
        new Set(snap.docs.map(d => d.data().annee_scolaire).filter(y => typeof y === "number"))
      ).sort((a, b) => b - a);
      setAnneesDisponibles(years);
      // Par défaut, l'année active (sinon max)
      setAnnee(year ?? (years.length > 0 ? years[0] : null));
    }
    fetchStats();
  }, []);

  return (
    <div className="py-8 px-4 max-w-5xl mx-auto">
      {/* Bienvenue + rôle */}
      <div className="mb-8">
        <Typography variant="h5" fontWeight={500} gutterBottom>
          {!loadingUser && pseudo && role
            ? <>Bienvenue <span className="text-blue-600">{pseudo}</span> <span className="text-sm font-normal text-gray-500">({role})</span></>
            : <Skeleton width={210} />}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Voici le tableau de bord administratif du système scolaire.
        </Typography>
      </div>

      {/* Bloc alertes dynamiques (via AlertCenter) */}
      <AlertCenter />

      {/* Cartes de stats */}
      <Grid container spacing={3} sx={{ mb: 8 }}>
        <Grid item xs={12} md={3}>
          <Card className="!shadow-md !rounded-lg">
            <CardContent className="flex flex-col items-center">
              <FaUserGraduate size={32} className="text-blue-600 mb-2" />
              <Typography variant="h6">
                {loadingStats ? <Skeleton width={40} /> : stats.eleves}
              </Typography>
              <Typography variant="body2" color="textSecondary">Élèves</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className="!shadow-md !rounded-lg">
            <CardContent className="flex flex-col items-center">
              <FaChalkboardTeacher size={32} className="text-green-600 mb-2" />
              <Typography variant="h6">
                {loadingStats ? <Skeleton width={40} /> : stats.profs}
              </Typography>
              <Typography variant="body2" color="textSecondary">Professeurs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className="!shadow-md !rounded-lg">
            <CardContent className="flex flex-col items-center">
              <FaLayerGroup size={32} className="text-purple-600 mb-2" />
              <Typography variant="h6">
                {loadingStats ? <Skeleton width={40} /> : stats.classes}
              </Typography>
              <Typography variant="body2" color="textSecondary">Classes</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card className="!shadow-md !rounded-lg">
            <CardContent className="flex flex-col items-center">
              <span className="block text-2xl mb-2">📅</span>
              <Typography variant="h6">
                {loadingStats ? <Skeleton width={80} /> : stats.year ? `${stats.year}-${stats.year + 1}` : "—"}
              </Typography>
              <Typography variant="body2" color="textSecondary">Année scolaire</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Actions rapides */}
      <div className="mb-8 flex gap-4 flex-wrap">
        {role === "admin" && (
          <>
            <Link href="/Eleves/List/">
              <Button variant="contained" color="primary">
                Liste élèves
              </Button>
            </Link>
            <Link href="/Professeur/list">
              <Button variant="contained" color="primary">
                Liste professeurs
              </Button>
            </Link>
            <Link href="/Classe/list">
              <Button variant="contained" color="primary">
                Liste classes
              </Button>
            </Link>
            <Link href="/Matiere/list">
              <Button variant="contained" color="primary">
                Liste matières
              </Button>
            </Link>
            <Link href="/Notes/list">
              <Button variant="contained" color="primary">
                Notes
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Sélecteur d'année scolaire + graphiques filtrés */}
      <div className="mb-8">
        {anneesDisponibles.length > 0 && annee ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <label htmlFor="select-annee" className="text-sm font-medium">Sélectionne l'année scolaire :</label>
              <select
                id="select-annee"
                value={annee}
                onChange={e => setAnnee(Number(e.target.value))}
                className="px-3 py-2 rounded border border-gray-300 text-sm"
              >
                {anneesDisponibles.map(y => (
                  <option key={y} value={y}>{y}-{y + 1}</option>
                ))}
              </select>
            </div>
            <ElevesParClasseChart annee={annee} />
          </>
        ) : (
          <Typography>Pas d'inscriptions scolaires trouvées pour générer des stats annuelles.</Typography>
        )}
      </div>

      <RecentActivity />
      <ResultatsParClasseChart />
      {/* ➡️ Ici tu pourras ensuite ajouter historique, graphes, etc. */}
    </div>
  );
}