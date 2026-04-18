"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { db } from "@/app/src/lib/firebase-client";
import { collection, getDocs, query, where } from "firebase/firestore";

// Couleurs liste
const COLORS = ["#6366f1", "#34d399", "#f59e42", "#e11d48", "#fbbf24", "#6d28d9", "#0891b2"];

type DataItem = { name: string; value: number };

type Props = {
  annee: number; // L'année scolaire en cours (ex : 2024)
};

export default function ElevesParClasseChart({ annee }: Props) {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // On charge les élèves inscrits pour l'année scolaire sélectionnée
      const inscritsSnap = await getDocs(
        query(
          collection(db, "inscriptions"),
          where("annee_scolaire", "==", annee)
        )
      );
      const counts: Record<string, number> = {};
      inscritsSnap.forEach(docSnap => {
        const d = docSnap.data();
        const classe = d.classe ?? "Classe inconnue";
        counts[classe] = (counts[classe] || 0) + 1;
      });
      const chartData = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      setData(chartData);
      setLoading(false);
    }
    fetchData();
  }, [annee]);

  if (loading) {
    return <Paper className="p-6 mb-8"><Typography>Chargement du graphique…</Typography></Paper>;
  }

  if (data.length === 0) {
    return <Paper className="p-6 mb-8"><Typography>Aucune donnée élève à afficher pour cette année.</Typography></Paper>;
  }

  return (
    <Paper className="p-6 mb-8" elevation={2}>
      <Typography variant="h6" gutterBottom>Répartition des élèves par classe ({annee}-{annee+1})</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            label
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}