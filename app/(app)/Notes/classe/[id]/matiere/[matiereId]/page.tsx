"use client";
import React, { useState, useEffect, useMemo } from "react";
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
} from "@mui/material";
import { MdArrowBack } from "react-icons/md";
import { useParams, useRouter } from "next/navigation";
import { useClasses } from "@/app/src/context/classeContext";
import { useMatieres } from "@/app/src/context/matiereContext";
import { Eleve } from "@/app/src/interface/data";

type StatType = "Stat1" | "Stat2" | "Stat3";
type Repartition = "Trimestre1" | "Trimestre2" | "Trimestre3" | "Semestre1" | "Semestre2";

interface ElevesResponse {
  data: Eleve[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limit: number;
    totalCount: number;
  };
  stats: {
    boys: number;
    girls: number;
    total: number;
  };
}

const allowedRepartitionsFor = (libelle: StatType | ""): Repartition[] => {
  if (libelle === "Stat1") return ["Trimestre1", "Semestre1"];
  if (libelle === "Stat2") return ["Trimestre2", "Semestre2"];
  if (libelle === "Stat3") return ["Trimestre3"];
  return [];
};

type EleveStatEntry = {
  id: string;
  libelle_stat: StatType;
  repartition?: Repartition;
  id_matiere?: string;
};

export default function NotesMatierePage() {
  const params = useParams();
  const router = useRouter();
  const classeId = params.id as string;
  const matiereId = params.matiereId as string;

  const { classes } = useClasses();
  const { matieres } = useMatieres();

  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // modal créer
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [statLibelle, setStatLibelle] = useState<StatType | "">("");
  const [statRepartition, setStatRepartition] = useState<Repartition | "">("");
  const [creatingStats, setCreatingStats] = useState(false);

  // modal supprimer
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteLibelle, setDeleteLibelle] = useState<StatType | "">("");
  const [deleting, setDeleting] = useState(false);

  // modal modifier repartition
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [updateLibelle, setUpdateLibelle] = useState<StatType | "">("");
  const [newRepartition, setNewRepartition] = useState<Repartition | "">("");
  const [updating, setUpdating] = useState(false);

  const selectedClasse = classes.find((c) => c.id === classeId);
  const selectedMatiere = matieres.find((m) => m.id === matiereId);

  const allowedCreateReps = useMemo(() => allowedRepartitionsFor(statLibelle), [statLibelle]);
  const allowedUpdateReps = useMemo(() => allowedRepartitionsFor(updateLibelle), [updateLibelle]);

  // ✅ VÉRIFIER SI UN STAT EXISTE (robuste: ignore les strings + filtre matière si dispo)
  const getStat = (eleve: Eleve, libelleStatRecherche: StatType) => {
    const raw = (eleve as unknown as { stat?: unknown }).stat;

    if (!Array.isArray(raw)) return undefined;

    const objects = raw.filter((x): x is EleveStatEntry => {
      if (typeof x !== "object" || x === null) return false;
      const rec = x as Record<string, unknown>;
      return typeof rec.id === "string" && typeof rec.libelle_stat === "string";
    });

    return objects.find(
      (s) =>
        s.libelle_stat === libelleStatRecherche &&
        // si id_matiere est présent, on exige le match
        (!s.id_matiere || s.id_matiere === matiereId)
    );
  };

  // ✅ OUVRIR UN STAT SPÉCIFIQUE
  const openStat = (eleve: Eleve, libelleStatRecherche: StatType) => {
    const stat = getStat(eleve, libelleStatRecherche);
    if (!stat?.id) return;
    router.push(`/Notes/classe/${classeId}/matiere/${matiereId}/eleve/${eleve.id}?stat=${stat.id}`);
  };

  // ✅ CHARGER LES ÉLÈVES AVEC PAGINATION ET RECHERCHE
  const loadEleves = async (page: number, search: string = "") => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/notes/classe/search", window.location.origin);
      url.searchParams.append("classeId", classeId);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("limit", "10");
      if (search) url.searchParams.append("search", search);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Erreur lors du chargement des élèves");

      const result: ElevesResponse = await response.json();
      setEleves(result.data);
      setCurrentPage(result.pagination.currentPage);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.totalCount);

      console.log(`✅ ${result.data.length} élèves chargés`);
    } catch (err) {
      console.error("❌ Erreur chargement élèves:", err);
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  // ✅ SYNC: créer automatiquement les stats manquants (nouveaux élèves)
  const syncMissingStats = async () => {
    try {
      const res = await fetch("/api/stats/sync-missing-for-classe-matiere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classeId, matiereId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        console.warn("⚠️ sync-missing-for-classe-matiere:", json ?? res.statusText);
      } else {
        const json = await res.json().catch(() => null);
        console.log("✅ sync-missing-for-classe-matiere:", json);
      }
    } catch (e) {
      console.warn("⚠️ sync-missing-for-classe-matiere error:", e);
    }
  };

  // ✅ CHARGER AU MONTAGE
  useEffect(() => {
    if (!classeId || !matiereId) return;

    (async () => {
      await syncMissingStats();
      await loadEleves(1, searchQuery);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classeId, matiereId]);

  // ✅ RECHERCHE AVEC DÉLAI
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEleves(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ CRÉER UN STAT POUR TOUS LES ÉLÈVES (page courante)
 const handleCreateStat = async () => {
  if (!statLibelle || !statRepartition) {
    alert("Veuillez remplir tous les champs");
    return;
  }

  if (!allowedRepartitionsFor(statLibelle).includes(statRepartition)) {
    alert(`Repartition invalide pour ${statLibelle}`);
    return;
  }

  try {
    setCreatingStats(true);

    const response = await fetch("/api/stats/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classeId,
        matiereId,
        libelle_stat: statLibelle,
        repartition: statRepartition,
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error ?? `Erreur ${response.status}`);
    }

    setOpenCreateModal(false);
    setStatLibelle("");
    setStatRepartition("");

    // recharge la page courante (et les boutons)
    await loadEleves(currentPage, searchQuery);

    alert(json?.message ?? "Stats créés avec succès!");
  } catch (err) {
    console.error("❌ Erreur création stats:", err);
    alert(err instanceof Error ? err.message : "Erreur");
  } finally {
    setCreatingStats(false);
  }
};

  // ✅ SUPPRIMER BULK
  const handleDeleteBulk = async () => {
    if (!deleteLibelle) {
      alert("Choisis le type de stat à supprimer");
      return;
    }

    const ok = confirm(
      `Tu es sûr de vouloir SUPPRIMER tous les ${deleteLibelle} de cette matière ?\n\nCette action est irréversible.`
    );
    if (!ok) return;

    try {
      setDeleting(true);

      const res = await fetch("/api/stats/delete-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classeId, matiereId, libelle_stat: deleteLibelle }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        if (json?.code === "NOT_FOUND") {
          alert(`${deleteLibelle} n'existe pas encore pour cette matière.`);
        } else {
          throw new Error(json?.error ?? `Erreur ${res.status}`);
        }
      } else {
        alert(`✅ ${json?.deleted ?? 0} stats supprimés.`);
      }

      setOpenDeleteModal(false);
      setDeleteLibelle("");
      await loadEleves(currentPage, searchQuery);
    } catch (e) {
      console.error("❌ delete-bulk:", e);
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  // ✅ MODIFIER REPARTITION BULK
  const handleUpdateRepartitionBulk = async () => {
    if (!updateLibelle || !newRepartition) {
      alert("Choisis le type de stat et la nouvelle repartition");
      return;
    }

    if (!allowedRepartitionsFor(updateLibelle).includes(newRepartition)) {
      alert(`Repartition invalide pour ${updateLibelle}`);
      return;
    }

    const ok = confirm(
      `Tu es sûr de vouloir modifier la repartition de ${updateLibelle} vers ${newRepartition} pour cette matière ?`
    );
    if (!ok) return;

    try {
      setUpdating(true);

      const res = await fetch("/api/stats/update-repartition-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classeId,
          matiereId,
          libelle_stat: updateLibelle,
          newRepartition,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        if (json?.code === "NOT_FOUND") {
          alert(`${updateLibelle} n'existe pas encore pour cette matière.`);
        } else {
          throw new Error(json?.error ?? `Erreur ${res.status}`);
        }
      } else {
        alert(`✅ ${json?.updated ?? 0} stats mis à jour. Nouvelle repartition: ${json?.newRepartition}`);
      }

      setOpenUpdateModal(false);
      setUpdateLibelle("");
      setNewRepartition("");
      await loadEleves(currentPage, searchQuery);
    } catch (e) {
      console.error("❌ update-repartition-bulk:", e);
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUpdating(false);
    }
  };

  if (!selectedClasse || !selectedMatiere) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push(`/Notes/classe/${classeId}`)}
            variant="outlined"
            startIcon={<MdArrowBack size={20} />}
            className="!text-blue-600 !border-blue-600"
          >
            Retour
          </Button>

          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">{selectedMatiere.libelle_matiere}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {selectedClasse.libelle_classe} • {totalCount} élève(s)
            </p>
          </div>
        </div>
      </div>

      {/* INFOS MATIÈRE */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-300">Coefficient</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{selectedMatiere.coef}</p>
        </div>
        <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-300">Enseignant</p>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">
            {selectedMatiere.enseignant || "Non assigné"}
          </p>
        </div>
        <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <p className="text-sm text-purple-600 dark:text-purple-300">Total Élèves</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{totalCount}</p>
        </div>
      </div>

      {/* TABLEAU ÉLÈVES */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {/* HEADER */}
        <div className="bg-gray-200 dark:bg-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Élèves - Gestion des Notes</h2>
            <div className="flex gap-2 items-center">
              <TextField
                placeholder="Rechercher un élève..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!w-64"
                variant="outlined"
              />

              <Button variant="contained" className="!bg-green-600" onClick={() => setOpenCreateModal(true)}>
                Créer un Stat
              </Button>

              <Button variant="contained" className="!bg-orange-600" onClick={() => setOpenUpdateModal(true)}>
                Modifier Stat
              </Button>

              <Button variant="contained" className="!bg-red-600" onClick={() => setOpenDeleteModal(true)}>
                Supprimer Stat
              </Button>
            </div>
          </div>
        </div>

        {error && <div className="p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">{error}</div>}

        {/* TABLEAU */}
        {eleves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">N°</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Nom & Prénom
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Sexe</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Stat1</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Stat2</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Stat3</th>
                </tr>
              </thead>
              <tbody>
                {eleves.map((eleve, index) => (
                  <tr
                    key={eleve.id}
                    className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {eleve.identite.nom_individu} {eleve.identite.prenom_individu}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900 dark:text-white">
                      {eleve.identite.sexe}
                    </td>

                    {/* STAT1 */}
                    <td className="px-6 py-4 text-center">
                      {getStat(eleve, "Stat1") ? (
                        <Button
                          variant="contained"
                          size="small"
                          className="!bg-blue-600"
                          onClick={() => openStat(eleve, "Stat1")}
                        >
                          Ouvrir Stat1
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>

                    {/* STAT2 */}
                    <td className="px-6 py-4 text-center">
                      {getStat(eleve, "Stat2") ? (
                        <Button
                          variant="contained"
                          size="small"
                          className="!bg-blue-600"
                          onClick={() => openStat(eleve, "Stat2")}
                        >
                          Ouvrir Stat2
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>

                    {/* STAT3 */}
                    <td className="px-6 py-4 text-center">
                      {getStat(eleve, "Stat3") ? (
                        <Button
                          variant="contained"
                          size="small"
                          className="!bg-blue-600"
                          onClick={() => openStat(eleve, "Stat3")}
                        >
                          Ouvrir Stat3
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {loading ? "Chargement..." : "Aucun élève trouvé"}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 bg-gray-100 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600">
            <Button
              onClick={() => loadEleves(currentPage - 1, searchQuery)}
              disabled={currentPage === 1 || loading}
              variant="outlined"
            >
              ← Précédent
            </Button>

            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Page {currentPage} / {totalPages}
            </span>

            <Button
              onClick={() => loadEleves(currentPage + 1, searchQuery)}
              disabled={currentPage === totalPages || loading}
              variant="outlined"
            >
              Suivant →
            </Button>
          </div>
        )}
      </div>

      {/* ✅ MODAL CRÉER UN STAT */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="!bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white">
          Créer un Stat
        </DialogTitle>
        <DialogContent className="!bg-white dark:!bg-gray-800 mt-4">
          <FormControl fullWidth className="mb-4">
            <InputLabel>Libelle Stat</InputLabel>
            <Select
              value={statLibelle}
              onChange={(e) => {
                const v = e.target.value as StatType;
                setStatLibelle(v);
                setStatRepartition("");
              }}
              label="Libelle Stat"
            >
              <MenuItem value="Stat1">Stat1</MenuItem>
              <MenuItem value="Stat2">Stat2</MenuItem>
              <MenuItem value="Stat3">Stat3</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Repartition</InputLabel>
            <Select
              value={statRepartition}
              onChange={(e) => setStatRepartition(e.target.value as Repartition)}
              label="Repartition"
              disabled={!statLibelle}
            >
              {allowedCreateReps.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions className="!bg-gray-100 dark:!bg-gray-700 !p-4">
          <Button onClick={() => setOpenCreateModal(false)} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={handleCreateStat}
            variant="contained"
            className="!bg-blue-600"
            disabled={creatingStats}
          >
            {creatingStats ? "Création..." : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ MODAL MODIFIER STAT (repartition bulk) */}
      <Dialog open={openUpdateModal} onClose={() => setOpenUpdateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="!bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white">
          Modifier un Stat (Repartition)
        </DialogTitle>
        <DialogContent className="!bg-white dark:!bg-gray-800 mt-4">
          <FormControl fullWidth className="mb-4">
            <InputLabel>Type Stat</InputLabel>
            <Select
              value={updateLibelle}
              onChange={(e) => {
                const v = e.target.value as StatType;
                setUpdateLibelle(v);
                setNewRepartition("");
              }}
              label="Type Stat"
            >
              <MenuItem value="Stat1">Stat1</MenuItem>
              <MenuItem value="Stat2">Stat2</MenuItem>
              <MenuItem value="Stat3">Stat3</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Nouvelle Repartition</InputLabel>
            <Select
              value={newRepartition}
              onChange={(e) => setNewRepartition(e.target.value as Repartition)}
              label="Nouvelle Repartition"
              disabled={!updateLibelle}
            >
              {allowedUpdateReps.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions className="!bg-gray-100 dark:!bg-gray-700 !p-4">
          <Button onClick={() => setOpenUpdateModal(false)} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={handleUpdateRepartitionBulk}
            variant="contained"
            className="!bg-orange-600"
            disabled={updating}
          >
            {updating ? "Modification..." : "Modifier"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ MODAL SUPPRIMER STAT (bulk) */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="!bg-gray-100 dark:!bg-gray-700 !text-gray-900 dark:!text-white">
          Supprimer un Stat (Total)
        </DialogTitle>
        <DialogContent className="!bg-white dark:!bg-gray-800 mt-4">
          <FormControl fullWidth>
            <InputLabel>Type Stat</InputLabel>
            <Select
              value={deleteLibelle}
              onChange={(e) => setDeleteLibelle(e.target.value as StatType)}
              label="Type Stat"
            >
              <MenuItem value="Stat1">Stat1</MenuItem>
              <MenuItem value="Stat2">Stat2</MenuItem>
              <MenuItem value="Stat3">Stat3</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions className="!bg-gray-100 dark:!bg-gray-700 !p-4">
          <Button onClick={() => setOpenDeleteModal(false)} variant="outlined">
            Annuler
          </Button>
          <Button onClick={handleDeleteBulk} variant="contained" className="!bg-red-600" disabled={deleting}>
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}