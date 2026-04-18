import GridViewIcon from '@mui/icons-material/GridView';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Person2Icon from '@mui/icons-material/Person2';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import SchoolIcon from '@mui/icons-material/School';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import HouseSidingIcon from '@mui/icons-material/HouseSiding';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BarChartIcon from '@mui/icons-material/BarChart';

export interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  submenu?: boolean;
  subItems?: SubMenuItem[];
  roles?: string[]; // <-- Ajouté
}

export interface SubMenuItem {
  title: string;
  href: string;
  id: string;
  roles?: string[]; // (optionnel aussi ici)
}

export const sidebarmenu: MenuItem[] = [
  {
    title: "Dashboard",
    href: "/Dashboard",
    icon: <GridViewIcon />,
    roles: ["admin", "user"], // tous
  },
  {
    title: "Users",
    href: "/users",
    icon: <AccountCircleIcon />,
    roles: ["admin"],        // ADMIN ONLY
  },
  {
    title: "Professeurs",
    href: "/Professeur/list",
    icon: <Person2Icon />,
    roles: ["admin"],        // ADMIN ONLY
  },
  {
    title: "Eleves",
    href: "/Eleves/List/",
    icon: <GroupIcon />,
    roles: ["admin"],        // ADMIN ONLY
  },
  {
    title: "Matieres",
    href: "/Matiere/list",
    icon: <MenuBookIcon />,
    roles: ["admin"],        // ADMIN ONLY
  },
  {
    title: "Classes",
    href: "/Classe/list",
    icon: <HouseSidingIcon />,
    roles: ["admin"],        // ADMIN ONLY
  },
  {
    title: "Notes",
    href: "#",
    icon: <NoteAltIcon />,
    submenu: true,
    subItems: [],
    roles: ["admin", "user"], // tous
  },
  {
    title: "Bulletins",
    href: "/Bulletin",
    icon: <SchoolIcon />,
    roles: ["admin"],       // ADMIN ONLY (change -> ["admin","user"] si tu veux que "user" voie aussi celui-ci)
  },
  {
    title: "Resultats",
    href: "/Resultats",
    icon: <BarChartIcon />,
    roles: ["admin"],       // ADMIN ONLY (change -> ["admin","user"] si tu veux que "user" voie aussi celui-ci)
  },
  {
    title: "Deconnexion",
    href: "/",
    icon: <LogoutIcon />,
    roles: ["admin", "user"], // tous doivent pouvoir se déconnecter !
  },
];