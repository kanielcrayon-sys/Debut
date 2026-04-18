"use client";

import React, { useSyncExternalStore, useState } from "react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { BiMenuAltLeft } from "react-icons/bi";
import { MdLightMode, MdDarkMode, MdLogout } from "react-icons/md";
import { useTheme } from "next-themes";
import { useUser } from "@/app/src/context/userContext";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

type Props = {
  toggleSidebar: () => void;
  collapsed: boolean;
};

// ✅ retourne false au SSR, true côté client (sans useEffect/setState)
function useIsClient() {
  return useSyncExternalStore(
    () => () => {}, // subscribe: noop
    () => true,     // getSnapshot (client)
    () => false     // getServerSnapshot (server)
  );
}

export default function Header({ toggleSidebar, collapsed }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const { pseudo, loading } = useUser();
  const router = useRouter();

  // 👇 Etat d'ouverture de la modal de déconnexion
  const [logoutOpen, setLogoutOpen] = useState(false);

  const toggleTheme = () => {
    if (!isClient) return;
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  // Quand on clique sur le bouton Déconnexion, ouvre la modal
  const handleOpenLogout = () => setLogoutOpen(true);

  // Quand on confirme la déconnexion dans la modal
  const handleLogout = async () => {
    setLogoutOpen(false);
    await signOut(getAuth());
    router.replace("/login"); // ou "/" selon ta logique
  };

  return (
    <header
      className={`fixed
        ${collapsed ? "left-[80px] w-[calc(100%-80px)]" : "left-[300px] w-[calc(100%-300px)]"}
        top-0 h-[64px] flex justify-between items-center px-4
        shadow-md
        bg-white dark:bg-gray-900        // <--- Correction : couleur pleine OPAQUE
        border-b border-gray-200 dark:border-gray-800 // <--- Optionnel, joli, pour séparation
        transition-all duration-300
        z-50`}
    >
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleSidebar}
          className="!min-w-[40px] !w-[40px] !h-[40px] !rounded-full
            !text-gray-800 dark:!text-gray-200 hover:!bg-gray-200 dark:hover:!bg-gray-800"
        >
          <BiMenuAltLeft size={25} />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        {/* Bouton Theme */}
        <Button
          onClick={toggleTheme}
          className="!min-w-[40px] !w-[40px] !h-[40px] !rounded-full
            !text-gray-800  dark:!text-gray-200 hover:!bg-gray-200  dark:hover:!bg-gray-800"
        >
          {!isClient ? null : resolvedTheme === "dark" ? (
            <MdLightMode size={24} className="text-white" />
          ) : (
            <MdDarkMode size={24} className="text-gray-800" />
          )}
        </Button>

        {/* Bouton DECONNEXION qui ouvre la modal */}
        <Button
          onClick={handleOpenLogout}
          variant="outlined"
          color="error"
          className="!ml-1"
          startIcon={<MdLogout />}
        >
          Déconnexion
        </Button>

        {/* Avatar + pseudo */}
        {!loading && (
          <div className="flex items-center gap-2 ml-3">
            <Button>
              <span
                className="!min-w-[40px] !w-[40px] !h-[40px] !rounded-full flex
                  items-center  justify-center !bg-medium  dark:!bg-blue-600
                  !text-white text-lg font-bold uppercase"
              >
                {pseudo ? pseudo[0].toUpperCase() : "?"}
              </span>
            </Button>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-base">
              {pseudo || ""}
            </span>
          </div>
        )}
      </div>
      {/* Modal de confirmation MUI */}
      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <DialogTitle>Déconnexion</DialogTitle>
        <DialogContent>
          <p>Voulez-vous vraiment vous déconnecter&nbsp;?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutOpen(false)} color="primary">
            Annuler
          </Button>
          <Button
            onClick={handleLogout}
            color="error"
            variant="contained"
            autoFocus
          >
            Se déconnecter
          </Button>
        </DialogActions>
      </Dialog>
    </header>
  );
}