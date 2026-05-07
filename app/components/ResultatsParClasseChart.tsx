"use client";
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";
import { db } from "@/app/src/lib/firebase-client";
import { collection, getDocs, query, where } from "firebase/firestore";

// Les PERIODES sont "hardcodées" car elles changent peu, tu peux les rendre dynamiques si besoin :
const PERIODES = ["Trimestre 1", "Trimestre 2", "Trimestre 3", "Semestre 1", "Semestre 2"];

type ResultatsStats = {
  classe: string;
  admis: number;
  echoue: number;
  defaillant: number;
};

export default function ResultatsParClasseChart() {
  const [annees, setAnnees] = useState<number[]>([]);
  const [annee, setAnnee] = useState<number | null>(null);
  const [periode, setPeriode] = useState(PERIODES[0]);
  const [data, setData] = useState<ResultatsStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all available years (dynamically)
    async function fetchAnnees() {
      const snap = await getDocs(collection(db, "resultats"));
      const allAnnees = Array.from(
        new Set(snap.docs.map(doc => doc.data().annee).filter((y) => typeof y === "number"))
      ).sort((a, b) => b - a);
      setAnnees(allAnnees);
      if (allAnnees.length > 0 && (annee == null)) setAnnee(allAnnees[0]);
    }
    fetchAnnees();
  }, []);

  useEffect(() => {
    async function fetchResultats() {
      if (!annee) return;
      setLoading(true);
      const resSnap = await getDocs(query(
        collection(db, "resultats"),
        where("annee", "==", annee),
        where("periode", "==", periode),
      ));
      const counts: Record<string, { admis: number, echoue: number, defaillant: number }> = {};
      resSnap.forEach(docSnap => {
        const d = docSnap.data();
        const classe = d.classe || "Classe inconnue";
        const statut = d.statut;
        if (!counts[classe]) counts[classe] = { admis: 0, echoue: 0, defaillant: 0 };
        if (statut === "admis") counts[classe].admis += 1;
        else if (statut === "echoue") counts[classe].echoue += 1;
        else counts[classe].defaillant += 1;
      });
      const chartData = Object.entries(counts).map(([classe, counts]) => ({
        classe, ...counts
      }));
      setData(chartData);
      setLoading(false);
    }
    fetchResultats();
  }, [annee, periode]);

  return (
    <Paper className="p-6 mb-8" elevation={2}>
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <Typography variant="h6">Répartition admis/échoués par classe</Typography>
        {/* Sélecteurs dynamiques année/période */}
        {annees.length > 0 && (
          <Select
            size="small"
            value={annee ?? ""}
            onChange={e => setAnnee(Number(e.target.value))}
          >
            {annees.map(an => <MenuItem value={an} key={an}>{an}-{an + 1}</MenuItem>)}
          </Select>
        )}
        <Select
          size="small"
          value={periode}
          onChange={e => setPeriode(e.target.value)}
        >
          {PERIODES.map(p => <MenuItem value={p} key={p}>{p}</MenuItem>)}
        </Select>
      </Box>
      {loading ? (
        <Typography>Chargement du graphique…</Typography>
      ) : data.length === 0 ? (
        <Typography>Aucune donnée pour cette période.</Typography>
      ) : (
        <ResponsiveContainer width="100%" height={330}>
          <BarChart data={data}>
            <XAxis dataKey="classe" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="admis" fill="#34d399" name="Admis" />
            <Bar dataKey="echoue" fill="#ef4444" name="Échoués" />
            <Bar dataKey="defaillant" fill="#64748b" name="Défaillants" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}