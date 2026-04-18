"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { sidebarmenu, MenuItem, SubMenuItem } from "./data";
import { Button } from "@mui/material";
import { useClasses } from "@/app/src/context/classeContext";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useUser } from "@/app/src/context/userContext";

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { role, loading } = useUser();
  const { classes } = useClasses();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Attendre le chargement de l'utilisateur
  if (loading || !role) return null;

  // Filtrer le sidebarmenu selon le rôle
  const filteredMenu = sidebarmenu.filter(menu =>
    !menu.roles || menu.roles.includes(role) || role === "admin"
  );

  // Remplir dynamiquement le sous-menu Notes avec les classes actives
  const noteMenu = filteredMenu.find(m => m.title === "Notes");
  if (noteMenu && noteMenu.submenu) {
    const activeClasses = classes.filter(c => c.statut_classe !== "abandonné" && c.statut_classe !== "suspendu");
    noteMenu.subItems = activeClasses.map(classe => ({
      title: classe.libelle_classe,
      href: `/Notes/classe/${classe.id}`,
      id: classe.id,
      // (optionnel) Control à ce niveau aussi :
      roles: ["user", "admin"]
    }));
  }

  const handleToggleSubmenu = (title: string) => {
    setExpandedMenu(expandedMenu === title ? null : title);
  };

  return (
    <aside className={`h-screen max-h-screen overflow-y-scroll overflow-x-hidden p-3
      border-r border-[rgba(0,0,0,0.1)] fixed top-0 left-0 transition-all duration-300
      ${collapsed ? "w-[80px]" : "w-[300px]"}`}>

      {/* Logo */}
      <Link href="/" className="flex items-center justify-center mb-6">
        <Image src="/vercel.svg" width={collapsed ? 1 : 1} height={3} alt="logo" />
      </Link>
      <div className='sidebarmenu mt-4'>
        <ul className='w-full'>
          {filteredMenu.map((menu, index) => (
            <li className="w-full" key={index}>
              {menu.submenu ? (
                <>
                  <Button
                    onClick={() => handleToggleSubmenu(menu.title)}
                    variant="text"
                    className="w-full !capitalize text-left !justify-start 
                    !text-gray-700 gap-2 !font-[600] !text-[13px] !py-3 
                    dark:!text-white dark:hover:!bg-gray-800"
                  >
                    {menu.icon}
                    {!collapsed && (
                      <>
                        <span>{menu.title}</span>
                        {expandedMenu === menu.title ?
                          <ExpandLessIcon className="ml-auto" /> :
                          <ExpandMoreIcon className="ml-auto" />}
                      </>
                    )}
                  </Button>
                  {expandedMenu === menu.title && !collapsed && (
                    <ul className="ml-4 mt-2 border-l border-gray-300 dark:border-gray-600">
                      {(menu.subItems && menu.subItems.length > 0)
                        ? menu.subItems.map((subItem, subIndex) => (
                          // (optionnel) controle par rôle à ce niveau :
                          (!subItem.roles || subItem.roles.includes(role) || role === "admin") && (
                            <li key={subIndex} className="w-full">
                              <Link href={subItem.href}>
                                <Button
                                  variant="text"
                                  className="w-full !capitalize text-left !justify-start 
                                  !text-gray-600 !text-[12px] !py-2 !px-3
                                  dark:!text-gray-300 dark:hover:!bg-gray-800"
                                >
                                  {subItem.title}
                                </Button>
                              </Link>
                            </li>
                          )
                        ))
                        : <li className="px-3 py-2 text-xs text-gray-400">Aucune classe</li>
                      }
                    </ul>
                  )}
                </>
              ) : (
                <Link href={menu.href ?? "#"}>
                  <Button variant="text" className="w-full !capitalize 
                    text-left !justify-start !text-gray-700 gap-2 !font-[600] 
                    !text-[13px] !py-3 dark:!text-white dark:hover:!bg-gray-800">
                    {menu.icon}
                    {!collapsed && <span>{menu.title}</span>}
                  </Button>
                </Link>
              )}

              {/* tooltip si sidebar fermé */}
              {collapsed && (
                <span
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3
                  bg-gray-800 text-white text-xs px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition whitespace-nowrap"
                >
                  {menu.title}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}