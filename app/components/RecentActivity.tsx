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
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

// Tu peux ajuster le type des actions selon tes besoins
interface ActivityItem {
  id: string;
  type: "eleve" | "prof" | "note" | "classe";
  title: string;
  subtitle: string;
  date: Date;
}

function getIcon(type: ActivityItem['type']) {
  switch(type) {
    case "eleve": return <PersonIcon />;
    case "prof": return <SchoolIcon />;
    case "note": return <NoteAltIcon />;
    case "classe": return <SchoolIcon />;
    default: return <PersonIcon />;
  }
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      // Simule trois types d'actions, à remplacer par le fetch Firestore réel :
      const recentEleves = await getDocs(query(collection(db, "eleves"), orderBy("createdAt", "desc"), limit(3)));
      const recentProfs = await getDocs(query(collection(db, "professeurs"), orderBy("createdAt", "desc"), limit(2)));
      // Ajoute d'autres fetch si tu veux (notes, classes, ...)
      const items: ActivityItem[] = [];

      recentEleves.forEach(docSnap => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          type: "eleve",
          title: `Nouvel élève : ${d.nom ?? ""} ${d.prenom ?? ""}`,
          subtitle: d.classe ? `Classe : ${d.classe}` : "",
          date: d.createdAt ? d.createdAt.toDate?.() ?? new Date(d.createdAt.seconds * 1000) : new Date(), // adapte si Firestore Timestamp ou string
        });
      });

      recentProfs.forEach(docSnap => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          type: "prof",
          title: `Nouveau professeur : ${d.nom ?? ""} ${d.prenom ?? ""}`,
          subtitle: d.matiere ? `Matière : ${d.matiere}` : "",
          date: d.createdAt ? d.createdAt.toDate?.() ?? new Date(d.createdAt.seconds * 1000) : new Date(),
        });
      });

      // Trie toutes les activités les plus récentes en premier
      items.sort((a, b) => b.date.getTime() - a.date.getTime());

      setActivities(items.slice(0, 5)); // Limite à 5 plus récentes
      setLoading(false);
    }
    fetchActivities();
  }, []);

  if (loading) {
    return <Typography>Chargement de l’historique…</Typography>;
  }

  if (activities.length === 0) {
    return <Typography>Aucune action récente.</Typography>
  }

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