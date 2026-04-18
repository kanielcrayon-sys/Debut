import type { NoteObservation } from "@/app/src/interface/data";

export function calculateObservation(valeur: number): NoteObservation {
  if (valeur >= 19) return "Excellent";
  if (valeur >= 17) return "Très bien";
  if (valeur >= 14) return "Bien";
  if (valeur >= 12) return "Assez bien";
  if (valeur >= 10) return "Passable";
  if (valeur >= 8) return "Insuffisant";
  return "Peut mieux faire";
}