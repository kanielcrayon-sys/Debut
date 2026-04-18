"use client";

import React from "react";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

export type AlertType = "info" | "success" | "warning" | "error";

export interface DashboardAlert {
  type: AlertType;
  message: string;
}

// Pour la démo : simuler des alertes, mais tu pluggeras Firestore dans ce composant plus tard
const sampleAlerts: DashboardAlert[] = [
  { type: "warning", message: "Il y a 3 matières pas encore affectées aux classes." },
  { type: "error", message: "Il y a 5 abandons pour l'année en cours." },
  { type: "info", message: "La classe 6èmeB n'a pas de professeur titulaire." },
];

export default function AlertCenter({ alerts }: { alerts?: DashboardAlert[] }) {
  // On pourra remplacer sampleAlerts par les alertes Firestore quand tu veux
  const displayAlerts = alerts ?? sampleAlerts;

  if (!displayAlerts || displayAlerts.length === 0) return null;

  return (
    <Stack spacing={2} className="mb-8">
      {displayAlerts.map((alert, idx) => (
        <Alert key={idx} severity={alert.type}>
          {alert.message}
        </Alert>
      ))}
    </Stack>
  );
}