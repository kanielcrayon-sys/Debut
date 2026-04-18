export function anneeScolaireStartFromDate(d: Date): number {
  const month = d.getMonth() + 1; // 1..12
  return month >= 9 ? d.getFullYear() : d.getFullYear() - 1;
}

export function formatAnneeScolaire(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}