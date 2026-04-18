"use client";
import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { MdArrowBack, MdEdit, MdDelete, MdInfo } from "react-icons/md";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useClasses } from "@/app/src/context/classeContext";
import { useMatieres } from "@/app/src/context/matiereContext";
import { calculateObservation } from "@/app/src/lib/observations";

interface Note {
  id: string;
  type_evaluation: string;
  valeur: number;
  observation: string;
  rang: number | null;
  createdAt: string;
  isSpecial?: boolean;
}

interface Stat {
  id: string;
  id_classe: string;
  id_matiere: string;
  id_eleve: string;
  libelle_stat: string;
  repartition: string;
  classe: string;
  matiere: string;
  enseignant: string;
  notes: Note[];
  cloture: boolean;
  rang?: number;
  rang_label?: string;
  observations?: string;
  moyenne_classe?: number;
  moyenne_matiere?: number;
  coef?: number;
  note_definitive?: number | null;
}

export default function StatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const classeId = params.id as string;
  const matiereId = params.matiereId as string;
  const eleveId = params.eleveId as string;

  // ✅ statId vient du bouton cliqué
  const statId = searchParams.get("stat") || "";

  const { classes } = useClasses();
  const { matieres } = useMatieres();

  const [stat, setStat] = useState<Stat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [typeEvaluation, setTypeEvaluation] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [observationsText, setObservationsText] = useState("");

  // ✅ STATES POUR MODIFIER UNE NOTE
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteValue, setEditNoteValue] = useState("");

  // ✅ STATES POUR INFO D'UNE NOTE
  const [infoNote, setInfoNote] = useState<Note | null>(null);
  const [openInfoModal, setOpenInfoModal] = useState(false);

  // ✅ STATES pour note special
  const [isNoteSpecial, setIsNoteSpecial] = useState(false);
  const [editIsSpecial, setEditIsSpecial] = useState(false);

  const selectedClasse = classes.find((c) => c.id === classeId);
  const selectedMatiere = matieres.find((m) => m.id === matiereId);

  const format2 = (v: number | null | undefined | "-") => (v === "-" || v == null ? "-" : Number(v).toFixed(2));

  // ✅ CHARGER LE STAT (par statId)
  useEffect(() => {
    const loadStat = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!statId) {
          throw new Error("statId manquant dans l'URL (?stat=...)");
        }

       const response = await fetch(
                `/api/stats/get-by-id?statId=${encodeURIComponent(statId)}&eleveId=${encodeURIComponent(
                    eleveId
                )}&matiereId=${encodeURIComponent(matiereId)}&classeId=${encodeURIComponent(classeId)}`
                );

        if (!response.ok) {
          throw new Error("Stat non trouvé");
        }

        const result = await response.json();
        setStat(result.data);
        setObservationsText(result.data?.observations || "");
        console.log("✅ Stat chargé:", result.data);
      } catch (err) {
        console.error("❌ Erreur chargement stat:", err);
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    };

    loadStat();
  }, [statId]);

  // ✅ CALCULER MOYENNE CLASSE
  const calculateMoyenneClasse = (): number | "-" => {
    if (!stat?.notes) return "-";
    const iNotes = stat.notes.filter((n) => n.type_evaluation.startsWith("I"));
    if (iNotes.length === 0) return "-";
    const sum = iNotes.reduce((acc, n) => acc + n.valeur, 0);
    return parseFloat((sum / iNotes.length).toFixed(2));
  };

  // ✅ CALCULER MOYENNE MATIERE
  const calculateMoyenneMatiere = (): number | "-" => {
    if (!stat?.notes) return "-";

    const moyenneClasse = calculateMoyenneClasse();
    if (moyenneClasse === "-") return "-";

    const devoir = stat.notes.find((n) => n.type_evaluation === "DEVOIR");
    const compo = stat.notes.find((n) => n.type_evaluation === "COMPO");

    if (!devoir || !compo) return "-";

    const moyenne = (moyenneClasse + devoir.valeur + compo.valeur) / 3;
    return parseFloat(moyenne.toFixed(2));
  };

  // ✅ RECHARGER LE STAT (par statId)
  const refreshStat = async () => {
    try {
      if (!statId) return;

      const response = await fetch(
        `/api/stats/get-by-id?statId=${encodeURIComponent(statId)}&eleveId=${encodeURIComponent(
            eleveId
        )}&matiereId=${encodeURIComponent(matiereId)}&classeId=${encodeURIComponent(
            classeId
        )}&t=${Date.now()}`
        );

      if (!response.ok) {
        throw new Error("Erreur lors du rechargement");
      }

      const result = await response.json();
      setStat(result.data);
      setObservationsText(result.data?.observations || "");
      console.log("✅ Stat rechargé avec les notes:", result.data.notes);
    } catch (err) {
      console.error("❌ Erreur refresh:", err);
    }
  };

  // ✅ AJOUTER UNE NOTE
  const handleAddNote = async () => {
    if (!noteValue || !typeEvaluation) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    const valeur = parseFloat(noteValue);
    if (isNaN(valeur) || valeur < 0 || valeur > 20) {
      alert("La note doit être entre 0 et 20");
      return;
    }

    try {
      setAddingNote(true);

      const response = await fetch("/api/stats/add-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statId: stat?.id,
          eleveId,
          matiereId,
          type_evaluation: typeEvaluation,
          valeur,
          isSpecial: isNoteSpecial,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout de la note");
      }

      await refreshStat();
      setOpenModal(false);
      setNoteValue("");
      setTypeEvaluation("");
      alert("Note ajoutée avec succès!");
    } catch (err) {
      console.error("❌ Erreur ajout note:", err);
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAddingNote(false);
    }
  };

  // ✅ MODIFIER UNE NOTE
  const handleEditNote = async () => {
    if (!editingNote || !editNoteValue) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    const valeur = parseFloat(editNoteValue);
    if (isNaN(valeur) || valeur < 0 || valeur > 20) {
      alert("La note doit être entre 0 et 20");
      return;
    }

    try {
      setAddingNote(true);

      const response = await fetch("/api/stats/update-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statId: stat?.id,
          noteId: editingNote.id,
          valeur,
          isSpecial: editIsSpecial,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la modification");
      }

      await refreshStat();
      setEditingNote(null);
      setEditNoteValue("");
      setOpenModal(false);
      alert("Note modifiée avec succès!");
    } catch (err) {
      console.error("❌ Erreur modification note:", err);
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAddingNote(false);
    }
  };

  // ✅ SUPPRIMER UNE NOTE
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note?")) {
      return;
    }

    try {
      setAddingNote(true);

      const response = await fetch("/api/stats/delete-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statId: stat?.id,
          noteId,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      await refreshStat();
      alert("Note supprimée avec succès!");
    } catch (err) {
      console.error("❌ Erreur suppression note:", err);
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAddingNote(false);
    }
  };

  // ✅ RÉCUPÉRER LA VALEUR D'UNE NOTE PAR TYPE
  const getNotByType = (type: string): number | "-" => {
    if (!stat?.notes) return "-";
    const note = stat.notes.find((n) => n.type_evaluation === type);
    return note ? note.valeur : "-";
  };

  // ✅ RÉCUPÉRER UNE NOTE PAR TYPE
  const getNoteByType = (type: string): Note | undefined => {
    if (!stat?.notes) return undefined;
    return stat.notes.find((n) => n.type_evaluation === type);
  };

  // ✅ FORMATER LA DATE
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (error || !stat) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-red-500">{error || "Stat non trouvé"}</p>
        <Button onClick={() => router.back()} variant="outlined" className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="outlined"
            startIcon={<MdArrowBack size={20} />}
            className="!text-blue-600 !border-blue-600"
          >
            Retour
          </Button>

          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">{stat.matiere}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
               {stat.classe} • {stat.libelle_stat} • {stat.repartition}
            </p>
          </div>
        </div>
      </div>

      {/* CONTENU STAT */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-300">Matière</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{stat.matiere}</p>
          </div>
          <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-300">Enseignant</p>
            <p className="text-lg font-bold text-green-900 dark:text-green-100">{stat.enseignant}</p>
          </div>
        </div>

        {/* CHAMPS DE NOTES I1-I6 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {["I1", "I2", "I3", "I4", "I5", "I6"].map((field) => {
            const note = getNoteByType(field);
            return (
              <div key={field} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{field}</label>
                <input
                  type="text"
                  value={getNotByType(field)}
                  className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-center font-bold"
                  disabled
                />
                {note && !stat.cloture && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setEditingNote(note);
                        setEditNoteValue(note.valeur.toString());
                        setEditIsSpecial(note.isSpecial || false);
                        setOpenModal(true);
                      }}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded text-sm flex items-center justify-center gap-1"
                      title="Modifier"
                    >
                      <MdEdit size={14} /> Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded text-sm flex items-center justify-center gap-1"
                      title="Supprimer"
                    >
                      <MdDelete size={14} /> Supprimer
                    </button>
                    <button
                      onClick={() => {
                        setInfoNote(note);
                        setOpenInfoModal(true);
                      }}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-sm flex items-center justify-center gap-1"
                      title="Info"
                    >
                      <MdInfo size={14} /> Info
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CHAMPS MOYENNE CLASSE, DEVOIR, COMPO, MOYENNE MATIERE, RANG */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">MOYENNE CLASSE</label>
            <input
              type="text"
              value={format2(stat.moyenne_classe ?? calculateMoyenneClasse())}
              className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-center font-bold"
              disabled
            />
          </div>

          {/* DEVOIR */}
          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">DEVOIR</label>
            <input
              type="text"
              value={getNotByType("DEVOIR")}
              className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-center font-bold"
              disabled
            />
            {getNoteByType("DEVOIR") && !stat.cloture && (
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => {
                    const note = getNoteByType("DEVOIR");
                    if (note) {
                      setEditingNote(note);
                      setEditNoteValue(note.valeur.toString());
                      setOpenModal(true);
                    }
                  }}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded text-xs flex items-center justify-center"
                  title="Modifier"
                >
                  <MdEdit size={12} />
                </button>
                <button
                  onClick={() => {
                    const note = getNoteByType("DEVOIR");
                    if (note) handleDeleteNote(note.id);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs flex items-center justify-center"
                  title="Supprimer"
                >
                  <MdDelete size={12} />
                </button>
                <button
                  onClick={() => {
                    const note = getNoteByType("DEVOIR");
                    if (note) {
                      setInfoNote(note);
                      setOpenInfoModal(true);
                    }
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs flex items-center justify-center"
                  title="Info"
                >
                  <MdInfo size={12} />
                </button>
              </div>
            )}
          </div>

          {/* COMPO */}
          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">COMPO</label>
            <input
              type="text"
              value={getNotByType("COMPO")}
              className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-center font-bold"
              disabled
            />
            {getNoteByType("COMPO") && !stat.cloture && (
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => {
                    const note = getNoteByType("COMPO");
                    if (note) {
                      setEditingNote(note);
                      setEditNoteValue(note.valeur.toString());
                      setOpenModal(true);
                    }
                  }}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white p-1 rounded text-xs flex items-center justify-center"
                  title="Modifier"
                >
                  <MdEdit size={12} />
                </button>
                <button
                  onClick={() => {
                    const note = getNoteByType("COMPO");
                    if (note) handleDeleteNote(note.id);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs flex items-center justify-center"
                  title="Supprimer"
                >
                  <MdDelete size={12} />
                </button>
                <button
                  onClick={() => {
                    const note = getNoteByType("COMPO");
                    if (note) {
                      setInfoNote(note);
                      setOpenInfoModal(true);
                    }
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs flex items-center justify-center"
                  title="Info"
                >
                  <MdInfo size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">MOYENNE MATIERE</label>
            <input
              type="text"
              value={format2(stat.moyenne_matiere ?? calculateMoyenneMatiere())}
              className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-center font-bold"
              disabled
            />
          </div>

          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">NOTE DÉFINITIVE</label>
            <input
              type="text"
              value={format2(stat.note_definitive)}
              className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-center font-bold bg-yellow-100 dark:bg-yellow-900"
              disabled
            />
          </div>

          <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">RANG</label>
            <input
              type="text"
              value={stat.rang_label || "-"}
              className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-center font-bold"
              disabled
            />
          </div>
        </div>

        {/* OBSERVATIONS */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">OBSERVATIONS</label>

          <textarea
            value={observationsText}
            onChange={(e) => setObservationsText(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            rows={4}
            placeholder="Observations"
            disabled={stat.cloture}
          />
        </div>

        {/* BOUTONS */}
        <div className="flex gap-4 justify-end">
          <Button variant="outlined" onClick={() => router.back()}>
            Fermer
          </Button>
          <Button
            variant="contained"
            className="!bg-blue-600"
            onClick={() => {
              setEditingNote(null);
              setEditNoteValue("");
              setOpenModal(true);
            }}
            disabled={stat.cloture}
          >
            Ajouter une Note
          </Button>
          <Button variant="contained" className={stat.cloture ? "!bg-red-600" : "!bg-green-600"} disabled={stat.cloture}>
            {stat.cloture ? "Stat Clôturé" : "Clôturer le Stat"}
          </Button>
        </div>
      </div>

      {/* ✅ MODAL AJOUTER/MODIFIER UNE NOTE */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="!bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white">
          {editingNote ? "Modifier une Note" : "Ajouter une Note"}
        </DialogTitle>
        <DialogContent className="!bg-white dark:!bg-gray-800 mt-4">
          <div className="space-y-4">
            <TextField label="Matière" value={stat.matiere} disabled fullWidth />

            <FormControl fullWidth disabled={editingNote !== null}>
              <InputLabel>Type Évaluation</InputLabel>
              <Select
                value={editingNote ? editingNote.type_evaluation : typeEvaluation}
                onChange={(e) => setTypeEvaluation(e.target.value)}
                label="Type Évaluation"
              >
                <MenuItem value="I1">I1</MenuItem>
                <MenuItem value="I2">I2</MenuItem>
                <MenuItem value="I3">I3</MenuItem>
                <MenuItem value="I4">I4</MenuItem>
                <MenuItem value="I5">I5</MenuItem>
                <MenuItem value="I6">I6</MenuItem>
                <MenuItem value="DEVOIR">DEVOIR</MenuItem>
                <MenuItem value="COMPO">COMPO</MenuItem>
              </Select>
            </FormControl>

            <TextField
              type="number"
              label="Valeur (0-20)"
              value={editingNote ? editNoteValue : noteValue}
              onChange={(e) => (editingNote ? setEditNoteValue(e.target.value) : setNoteValue(e.target.value))}
              inputProps={{ min: "0", max: "20", step: "0.5" }}
              fullWidth
            />

            {(editingNote ? editNoteValue : noteValue) && (
              <TextField
                label="Observation"
                value={calculateObservation(parseFloat(editingNote ? editNoteValue : noteValue))}
                disabled
                fullWidth
              />
            )}

            <div className="flex items-center gap-2 p-3 bg-purple-100 dark:bg-purple-900 rounded-lg border border-purple-300 dark:border-purple-600">
              <input
                type="checkbox"
                id="isSpecial"
                checked={editingNote ? editIsSpecial : isNoteSpecial}
                onChange={(e) => (editingNote ? setEditIsSpecial(e.target.checked) : setIsNoteSpecial(e.target.checked))}
                className="w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor="isSpecial"
                className="text-sm font-semibold text-purple-900 dark:text-purple-100 cursor-pointer"
              >
                📊 Note Spéciale (Pour Classement/Proclamation)
              </label>
            </div>
          </div>
        </DialogContent>
        <DialogActions className="!bg-gray-100 dark:!bg-gray-700 !p-4">
          <Button
            onClick={() => {
              setOpenModal(false);
              setEditingNote(null);
              setEditNoteValue("");
              setNoteValue("");
              setTypeEvaluation("");
              setIsNoteSpecial(false);
              setEditIsSpecial(false);
            }}
            variant="outlined"
          >
            Annuler
          </Button>
          <Button onClick={editingNote ? handleEditNote : handleAddNote} variant="contained" className="!bg-blue-600" disabled={addingNote}>
            {addingNote ? "Traitement..." : editingNote ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ MODAL INFO NOTE */}
      <Dialog open={openInfoModal} onClose={() => setOpenInfoModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="!bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white">
          Informations sur la Note
        </DialogTitle>
        <DialogContent className="!bg-white dark:!bg-gray-800 mt-4">
          {infoNote && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Type d&apos; évaluation</label>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{infoNote.type_evaluation}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Valeur</label>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{infoNote.valeur} / 20</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Observation</label>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{infoNote.observation}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Rang</label>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {infoNote.rang ? `${infoNote.rang}${infoNote.rang === 1 ? "er" : "ème"}` : "-"}
                </p>
              </div>

              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg border border-purple-300 dark:border-purple-600">
                <label className="block text-sm font-semibold text-purple-900 dark:text-purple-100">📊 Type de Note</label>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">
                  {infoNote.isSpecial ? "🌟 Note Spéciale" : "📝 Note Normale"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Date de création</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(infoNote.createdAt)}</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions className="!bg-gray-100 dark:!bg-gray-700 !p-4">
          <Button onClick={() => setOpenInfoModal(false)} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}