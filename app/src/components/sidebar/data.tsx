import GridViewIcon from '@mui/icons-material/GridView';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Person2Icon from '@mui/icons-material/Person2';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import SchoolIcon from '@mui/icons-material/School';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import HouseSidingIcon from '@mui/icons-material/HouseSiding';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export const  sidebarmenu = [
    {
        title: "Dashboard",
        href:"/",
        icon: <GridViewIcon> </GridViewIcon>
    },
     {
        title: "Users",
        href:"/Users/list",
        icon: <AccountCircleIcon></AccountCircleIcon>
    },
    {
        title: "Professeurs",
        href:"/Professeur/list",
        icon: <Person2Icon></Person2Icon>
    },
    {
        title: "Eleves",
        href:"./Eleves/List/",
        icon: <GroupIcon></GroupIcon>
    },
     {
        title: "Matieres",
        href:"/Matiere/list",
        icon: <MenuBookIcon></MenuBookIcon>
    },
    {
        title: "Classes",
        href:"./Classe/list",
        icon: <HouseSidingIcon></HouseSidingIcon>
    },
     {
        title: "Notes",
        href:"/Notes/list",
        icon: <NoteAltIcon></NoteAltIcon>
    },
     {
        title: "Bulletins",
        href:"/Bulletins/list",
        icon: <SchoolIcon></SchoolIcon>
    },
     {
        title: "Deconnexion",
        href:"/",
        icon: <LogoutIcon></LogoutIcon>
    },
]
