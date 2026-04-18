"use client";
import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { MdArrowBack, MdEdit, MdDelete } from "react-icons/md";
import { useParams, useRouter } from "next/navigation";
import { EvaluationFlash, Stat } from "@/app/src/interface/data";

interface ElevesResponse {
  identite: {
    nom_individu: string;
    prenom_individu: string;
  };
  stat?: Stat[];
}

interface FormDataType {
  note: string | number;
  id_stat: string;
  type_note_stat: string;
}
interface PayloadType {
  note: number;
  id_stat: string | null;
  type_note_stat: string | null;
  coef: number;
  id_eleve?: string;
  id_matiere?: string;
  id_classe?: string;
}
export default function EvaluationFlashsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string; // classeId
  const matiereId = params.matiereId as string;
  const eleveId = params.eleveId as string;

  const [eleve, setEleve] = useState<ElevesResponse | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationFlash[]>([]);
  const [matiere, setMatiere] = useState<{ coef: number; libelle_matiere: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour la modal
  const [openModal, setOpenModal] = useState(false);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataType>({
    note: "",
    id_stat: "",
    type_note_stat: "",
  });

  // ✅ CHARGER LES DONNÉES
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1️⃣ CHARGER L'ÉLÈVE
        const eleveRes = await fetch(`/api/eleves/${eleveId}`);
        if (!eleveRes.ok) throw new Error("Erreur chargement élève");
        const eleveData = await eleveRes.json();
        setEleve(eleveData);
        console.log("✅ Élève chargé:", eleveData);

        // 2️⃣ CHARGER LA MATIÈRE
        const matiereRes = await fetch(`/api/matieres/${matiereId}`);
        if (!matiereRes.ok) throw new Error("Erreur chargement matière");
        const matiereData = await matiereRes.json();
        setMatiere(matiereData);
        console.log("✅ Matière chargée:", matiereData);

        // 3️⃣ CHARGER LES ÉVALUATIONS FLASH
        const evalsRes = await fetch(
          `/api/evaluations-flash/by-eleve/${eleveId}?matiereId=${matiereId}`
        );
        if (!evalsRes.ok) throw new Error("Erreur chargement évaluations");
        const evalsData = await evalsRes.json();
        setEvaluations(evalsData.evals || []);
        console.log("✅ Évaluations chargées:", evalsData.evals);
      } catch (err) {
        console.error("❌ Erreur chargement:", err);
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    };

    if (eleveId && matiereId) {
      loadData();
    }
  }, [eleveId, matiereId]);

useEffect(() => {
  console.log("📊 ÉLÈVE CHARGÉ:", eleve);
  if (eleve?.stat) {
    console.log("📊 Premier stat:", eleve.stat[0]); // 👈 Voir la structure
    console.log("📊 id_matiere cherché:", matiereId);
    console.log("📊 id_eleve cherché:", eleveId);
  }
  console.log("📊 STATS FILTRÉS:", getAvailableStats());
}, [eleve, matiereId, eleveId]);
  // ✅ CALCULER MOYENNE ÉVALUATION
  const calculateMoyenneEvaluation = (note: number): number => {
    if (!matiere) return 0;
    return (note * matiere.coef);
  };

  // ✅ RÉCUPÉRER LES STATS DISPONIBLES POUR CET ÉLÈVE DANS CETTE MATIÈRE
  const getAvailableStats = (): Stat[] => {
    if (!eleve?.stat) return [];
    return eleve.stat.filter(
      (s) => s.id_matiere === matiereId && s.id_eleve === eleveId
    );
  };

  // ✅ OUVRIR MODAL CRÉATION/ÉDITION
  const openEditModal = (evalFlash?: EvaluationFlash) => {
    if (evalFlash) {
      setEditingEvalId(evalFlash.id);
      setFormData({
        note: evalFlash.note || "",
        id_stat: evalFlash.id_stat || "",
        type_note_stat: evalFlash.type_note_stat || "",
      });
    } else {
      setEditingEvalId(null);
      setFormData({
        note: "",
        id_stat: "",
        type_note_stat: "",
      });
    }
    setOpenModal(true);
  };

  // ✅ SOUMETTRE FORMULAIRE (CRÉER OU MODIFIER)
  const handleSubmit = async () => {
    try {
      if (formData.note === "" || formData.note === null) {
        alert("Veuillez entrer une note");
        return;
      }

      const noteValue = typeof formData.note === "string" 
        ? parseFloat(formData.note) 
        : formData.note;

      if (noteValue < 0 || noteValue > 20) {
        alert("La note doit être entre 0 et 20");
        return;
      }

   let payload: PayloadType = {  
        note: noteValue,
        id_stat: formData.id_stat || null,
        type_note_stat: formData.type_note_stat || null,
        coef: matiere?.coef || 1,
      };

      let url = "/api/evaluations-flash";
      let method = "POST";

      if (editingEvalId) {
        url = `/api/evaluations-flash/${editingEvalId}`;
        method = "PUT";
        console.log(`📝 Modification évaluation ${editingEvalId}:`, payload);
      } else {
        console.log(`✅ Création évaluation:`, payload);
        payload = {
          ...payload,
          id_eleve: eleveId,
          id_matiere: matiereId,
          id_classe: id,
        };
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur API");
      }

      const result = await response.json();
      console.log("✅ Réponse API:", result);

      // ✅ SI LIÉ À UN STAT, AJOUTER LA NOTE AU STAT
      if (formData.id_stat && formData.type_note_stat) {
        console.log(
          `🔗 Liaison Stat: ${formData.id_stat}, Type: ${formData.type_note_stat}`
        );
        const statResponse = await fetch("/api/stats/add-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            statId: formData.id_stat,
            eleveId,
            matiereId,
            type_evaluation: formData.type_note_stat,
            valeur: noteValue,
          }),
        });

        if (!statResponse.ok) {
          const statError = await statResponse.json();
          throw new Error(`Erreur liaison Stat: ${statError.error}`);
        }

        console.log("✅ Note ajoutée au Stat");
      }

      // ✅ RECHARGER LES ÉVALUATIONS
      const evalsRes = await fetch(
        `/api/evaluations-flash/by-eleve/${eleveId}?matiereId=${matiereId}`
      );
      const evalsData = await evalsRes.json();
      console.log("📊 Évaluations rechargées:", evalsData);
      setEvaluations(evalsData.evals || []);

      setOpenModal(false);
      setFormData({ note: "", id_stat: "", type_note_stat: "" });
      alert(editingEvalId ? "Évaluation modifiée!" : "Évaluation créée!");
    } catch (err) {
      console.error("❌ Erreur soumission:", err);
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  // ✅ SUPPRIMER UNE ÉVALUATION
  const handleDelete = async (evalId: string) => {
    if (!confirm("Confirmer la suppression?")) return;

    try {
      setLoading(true);
      console.log(`🗑️ Suppression évaluation ${evalId}`);

      const response = await fetch(`/api/evaluations-flash/${evalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur suppression");
      }

      console.log("✅ Évaluation supprimée");

      // ✅ RECHARGER
      const evalsRes = await fetch(
        `/api/evaluations-flash/by-eleve/${eleveId}?matiereId=${matiereId}`
      );
      const evalsData = await evalsRes.json();
      setEvaluations(evalsData.evals || []);

      alert("Évaluation supprimée!");
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  // ✅ CLÔTURER UNE ÉVALUATION
  const handleCloture = async (evalId: string) => {
    try {
      setLoading(true);
      console.log(`🔒 Clôture évaluation ${evalId}`);

      const response = await fetch(`/api/evaluations-flash/${evalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloture: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur clôture");
      }

      console.log("✅ Évaluation clôturée");

      // ✅ RECHARGER
      const evalsRes = await fetch(
        `/api/evaluations-flash/by-eleve/${eleveId}?matiereId=${matiereId}`
      );
      const evalsData = await evalsRes.json();
      setEvaluations(evalsData.evals || []);

      alert("Évaluation clôturée!");
    } catch (err) {
      console.error("❌ Erreur clôture:", err);
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (loading && evaluations.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  const availableStats = getAvailableStats();

  return (
    <div className="w-full p-6">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={() =>
            router.push(`/Notes/classe/${id}/matiere/${matiereId}`)
          }
          variant="outlined"
          startIcon={<MdArrowBack size={20} />}
          className="!text-blue-600 !border-blue-600"
        >
          Retour
        </Button>

        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">
            Évaluations Flash
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {eleve?.identite.nom_individu} {eleve?.identite.prenom_individu} •{" "}
            {matiere?.libelle_matiere}
          </p>
        </div>
      </div>

      {/* INFOS MATIÈRE */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="!bg-blue-100 dark:!bg-blue-900">
          <CardContent>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              Coefficient
            </p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {matiere?.coef || "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="!bg-green-100 dark:!bg-green-900">
          <CardContent>
            <p className="text-sm text-green-600 dark:text-green-300">
              Nombre d&apos Évaluations
            </p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">
              {evaluations.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* BOUTON CRÉER */}
      <div className="mb-6">
        <Button
          variant="contained"
          className="!bg-green-600"
          onClick={() => openEditModal()}
        >
          + Créer Évaluation Flash
        </Button>
      </div>

      {/* TABLEAU ÉVALUATIONS */}
      {evaluations.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    N°
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Note (0-20)
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Moyenne (coef×note/20)
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Lié à Stat
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Type Note
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Clôturé
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evalFlash, index) => (
                  <tr
                    key={evalFlash.id ? evalFlash.id : `eval-${index}`}
                    className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {index + 1}
                    </td>

                    {/* NOTE */}
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-full font-semibold">
                        {evalFlash.note ?? "-"}
                      </span>
                    </td>

                    {/* MOYENNE */}
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded-full font-semibold">
                        {evalFlash.note
                          ? calculateMoyenneEvaluation(evalFlash.note).toFixed(2)
                          : "-"}
                      </span>
                    </td>

                    {/* STAT LIÉ */}
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {evalFlash.id_stat ? (
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 rounded-full">
                            {availableStats.find(s => s.id === evalFlash.id_stat)?.libelle_stat || evalFlash.id_stat}
                        </span>
                        ) : (
                        <span className="text-gray-500">Aucun</span>
                        )}
                    </td>

                    {/* TYPE NOTE */}
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {evalFlash.type_note_stat || "-"}
                    </td>

                    {/* CLÔTURÉ */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full font-semibold ${
                          evalFlash.cloture
                            ? "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100"
                            : "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100"
                        }`}
                      >
                        {evalFlash.cloture ? "✅ Oui" : "⏳ Non"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="small"
                          onClick={() => openEditModal(evalFlash)}
                          startIcon={<MdEdit />}
                          variant="outlined"
                          className="!text-blue-600 !border-blue-600"
                        >
                          Modifier
                        </Button>

                        {!evalFlash.cloture && (
                          <Button
                            size="small"
                            onClick={() => handleCloture(evalFlash.id)}
                            variant="outlined"
                            className="!text-green-600 !border-green-600"
                          >
                            Clôturer
                          </Button>
                        )}

                        <Button
                          size="small"
                          onClick={() => handleDelete(evalFlash.id)}
                          startIcon={<MdDelete />}
                          variant="outlined"
                          className="!text-red-600 !border-red-600"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="!bg-gray-100 dark:!bg-gray-700">
          <CardContent className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Aucune évaluation flash créée
            </p>
          </CardContent>
        </Card>
      )}

      {/* MODAL CRÉER/MODIFIER */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="!bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white">
          {editingEvalId ? "Modifier Évaluation" : "Créer Évaluation Flash"}
        </DialogTitle>

        <DialogContent className="!bg-white dark:!bg-gray-800 mt-4">
          {/* NOTE */}
          <TextField
            label="Note (0-20)"
            type="number"
            inputProps={{ min: 0, max: 20, step: 0.5 }}
            value={formData.note}
            onChange={(e) =>
              setFormData({ ...formData, note: e.target.value })
            }
            fullWidth
            className="mb-4"
            variant="outlined"
          />

          {/* STAT LIÉ */}
          <FormControl fullWidth className="mb-4">
            <InputLabel>Lié à quel Stat?</InputLabel>
            <Select
              value={formData.id_stat}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  id_stat: e.target.value,
                  type_note_stat: "", // Reset type si on change le stat
                })
              }
              label="Lié à quel Stat?"
            >
              <MenuItem value="">Aucun</MenuItem>
              {availableStats.map((stat) => (
                <MenuItem key={stat.id} value={stat.id}>
                  {stat.libelle_stat} - {stat.repartition}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* TYPE NOTE - APPARAÎT QUE SI STAT CHOISI */}
          {formData.id_stat && (
            <FormControl fullWidth className="mb-4">
              <InputLabel>Type de Note</InputLabel>
              <Select
                value={formData.type_note_stat}
                onChange={(e) =>
                  setFormData({ ...formData, type_note_stat: e.target.value })
                }
                label="Type de Note"
              >
                <MenuItem value="">Aucun</MenuItem>
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
          )}

          {/* COEFFICIENT (LECTURE SEULE) */}
          <TextField
            label="Coefficient (lecture seule)"
            type="number"
            value={matiere?.coef || 0}
            disabled
            fullWidth
            className="mb-4"
            variant="outlined"
          />

          {/* PREVIEW MOYENNE */}
          {formData.note && (
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg mb-4">
              <p className="text-sm text-green-600 dark:text-green-300">
                Moyenne Évaluation
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {calculateMoyenneEvaluation(
                  typeof formData.note === "string"
                    ? parseFloat(formData.note)
                    : formData.note
                ).toFixed(2)}
              </p>
            </div>
          )}
        </DialogContent>

        <DialogActions className="!bg-gray-100 dark:!bg-gray-700 !p-4">
          <Button
            onClick={() => setOpenModal(false)}
            variant="outlined"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            className="!bg-blue-600"
            disabled={loading}
          >
            {loading ? "Chargement..." : editingEvalId ? "Modifier" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}