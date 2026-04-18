import type { VerdictBulletin } from "@/app/src/interface/data";

export const isAdmisVerdict = (v: VerdictBulletin | undefined | null): boolean =>
  v === "Admis" || v === "Admis par décision";

export const isEchoueVerdict = (v: VerdictBulletin | undefined | null): boolean => v === "Échoué";


export const preserveDecisionVerdict = (
  current: VerdictBulletin | undefined | null,
  computed: VerdictBulletin
): VerdictBulletin => {
  // Option B:
  // - si quelqu’un a mis "Admis par décision" mais que l’élève est maintenant >=10 => verdict normal "Admis"
  // - sinon on garde la décision
  if (current === "Admis par décision" && computed === "Admis") return "Admis";
  if (current === "Admis par décision" && computed === "Échoué") return "Admis par décision";
  return computed;
};