"use client";
import React, { useEffect, useState } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import Divider from "@mui/material/Divider";
import { db } from "@/app/src/lib/firebase-client";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: Date;
}

function getIcon(type: string) {
  if (type === "eleve") return <PersonIcon />;
  if (type === "prof") return <SchoolIcon />;
  if (type === "note") return <NoteAltIcon />;
  if (type === "abandon") return <PersonIcon color="error" />;
  return <PersonIcon />;
}

export default function RecentActivity({ annee, classesMap }: { annee: number, classesMap: { [id: string]: string } }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      // Ex : les 3 dernières inscriptions actives et abandons de l'année
      const inscriptionsSnap = await getDocs(
        query(
          collection(db, "inscriptions"),
          where("annee_scolaire", "==", annee),
          orderBy("date_suppression", "desc"),
          limit(5)
        )
      );
      const items: ActivityItem[] = [];
      inscriptionsSnap.forEach(docSnap => {
        const d = docSnap.data();
        // Ajoute selon statut
       if (d.statut === "abandonné") {
          items.push({
            id: docSnap.id,
            type: "abandon",
            title: `nouveau Abandon`,
            subtitle: `Classe ${classesMap?.[d.id_classe] ?? d.id_classe} — Le ${d.date_suppression ?? "?"}`,
            date: d.date_suppression ? new Date(d.date_suppression) : new Date(),
          });
        }
        else if (d.statut === "actif") {
          items.push({
            id: docSnap.id,
            type: "eleve",
            title: `Nouvelle inscription`,
            subtitle: `Classe ${classesMap?.[d.id_classe] ?? d.id_classe}`,
            date: d.date_inscription ? new Date(d.date_inscription) : new Date(),
          });
        }
      });
      // Trie par date descendante
      items.sort((a, b) => b.date.getTime() - a.date.getTime());
      setActivities(items.slice(0, 5));
      setLoading(false);
    }
    fetchActivities();
  }, [annee]);

  if (loading) return <Typography>Chargement de l’historique…</Typography>;
  if (activities.length === 0) return <Typography>Aucune action récente.</Typography>;

  return (
    <div>
      <Typography variant="h6" gutterBottom>Historique des actions récentes</Typography>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {activities.map((item, idx) => (
          <React.Fragment key={item.id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar>
                  {getIcon(item.type)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={item.title}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {item.subtitle}
                    </Typography>
                    {" — "}
                    <Typography component="span" variant="caption" color="text.disabled">
                      {item.date.toLocaleString("fr-FR")}
                    </Typography>
                  </>
                }
              />
            </ListItem>
            {idx < activities.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </div>
  );
}