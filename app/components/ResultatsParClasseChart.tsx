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

// PERIODES/PERIODS à adapter à ta réalité:
const PERIODES = ["Trimestre 1", "Trimestre 2", "Trimestre 3", "Semestre 1", "Semestre 2"];
const ANNEES = [2024, 2025, 2026]; // ou à générer dynamiquement

type ResultatsStats = {
  classe: string;
  admis: number;
  echoue: number;

};
export default function ResultatsParClasseChart() {
  const [annee, setAnnee] = useState(ANNEES[0]);
  const [periode, setPeriode] = useState(PERIODES[0]);
  const [data, setData] = useState<ResultatsStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResultats() {
      setLoading(true);
      // 🔵 Firestore : On filtre sur la période et l'année sélectionnées
      const resSnap = await getDocs(query(
        collection(db, "resultats"),
        where("annee", "==", annee),
        where("periode", "==", periode),
      ));

      // Regrouper par classe, puis par statut
      const counts: Record<string, {admis: number, echoue: number, defaillant: number}> = {};
      resSnap.forEach(docSnap => {
        const d = docSnap.data();
        const classe = d.classe || "Classe inconnue";
        const statut = d.statut; // "admis", "echoue", "defaillant"
        if(!counts[classe]) counts[classe] = { admis:0, echoue:0, defaillant:0 };
        if (statut === "admis") counts[classe].admis += 1;
        else if (statut === "echoue") counts[classe].echoue += 1;
        else counts[classe].defaillant += 1;
      });

      // Passe sous forme tableau pour recharts
      const chartData = Object.entries(counts).map(([classe, counts]) => ({
        classe,
        ...counts,
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
        {/* Selecteurs année et période */}
        <Select
          size="small"
          value={annee}
          onChange={e => setAnnee(Number(e.target.value))}
        >
          {ANNEES.map(an => <MenuItem value={an} key={an}>{an}-{an+1}</MenuItem>)}
        </Select>
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