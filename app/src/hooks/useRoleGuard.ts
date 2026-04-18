import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/src/context/userContext";

/**
 * Permet d'autoriser l'accès à certains rôles.
 * Exemple : useRoleGuard(["user"])  -> user ET admin y ont accès
 *           useRoleGuard(["admin"]) -> seul admin a accès
 *           useRoleGuard(["editor", "user"]) -> admin, user, editor y ont accès
 */
export function useRoleGuard(allowedRoles: string[]) {
  const { user, role, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // attend la récupération
    if (!user) {
      router.replace("/login");
      return;
    }

    // L'admin a accès à tout par défaut
    if (role !== "admin" && role && !allowedRoles.includes(role)) {
      router.replace("/unauthorized");
      return;
    }
    // Si role="admin" -> il passe toujours même si pas dans allowedRoles
    // Si allowedRoles=['admin'], seul admin a accès
    // Si allowedRoles=['user'], admin ET user ont accès
    // Si allowedRoles=['user', 'editor'], admin, user, et editor ont accès
  }, [user, role, loading, allowedRoles, router]);

  return { user, role, loading };
}