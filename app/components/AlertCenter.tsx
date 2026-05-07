"use client";
import React from "react";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

export type AlertType = "info" | "success" | "warning" | "error";
export interface DashboardAlert {
  type: AlertType;
  message: string;
}

export default function AlertCenter({ alerts }: { alerts: DashboardAlert[] }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <Stack spacing={2} className="mb-8">
      {alerts.map((alert, idx) => (
        <Alert key={idx} severity={alert.type}>
          {alert.message}
        </Alert>
      ))}
    </Stack>
  );
}