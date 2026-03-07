"use client"
import React from "react";
import Image from "next/image";
import vercel from "@/public/vercel.svg" ;
import { Button } from "@mui/material";
import { BiMenuAltLeft } from "react-icons/bi";
import SearchBox from "@/app/src/components/searchBox/search";
import { MdLightMode, MdDarkMode } from "react-icons/md";
import { useTheme } from "next-themes";

//import { useState } from "react";
type Props = {
  toggleSidebar: () => void;
  collapsed: boolean;
};

export default function Header({ toggleSidebar, collapsed }: Props){
    

   const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };


    return(

        <header className={`fixed 
    ${collapsed ? "left-[80px] w-[calc(100%-80px)]" : "left-[300px] w-[calc(100%-300px)]"}
     top-[0px] h-[64px] flex justify-between items-center px-4 shadow-md dark:bg-medium transition-all duration-300 z-50`}>
            <div className="flex items-center gap-3">
                <Button  onClick={toggleSidebar} className="!min-w-[40px] !w-[40px] !h-[40px] !rounded-full
               !text-gray-800 dark:!text-gray-200 hover:!bg-gray-200 dark:hover:!bg-gray-800"> <BiMenuAltLeft size={25}/> </Button>
                
                <SearchBox placeholder="Search here..." width="300px"/>
            </div>
           <div className="flex items-center gap-3" >
                <Button onClick={toggleTheme} className="!min-w-[40px] !w-[40px] !h-[40px] !rounded-full
                 !text-gray-800  dark:!text-gray-200 hover:!bg-gray-200  dark:hover:!bg-gray-800"> {resolvedTheme === "dark" ? (
          <MdLightMode size={24} className="text-white" />
        ) : (
          <MdDarkMode size={24} className="text-gray-800" />
        )} </Button>
                  
                <div className="flex items-center gap-2" >
                    <Button> 
                        <span  className="!min-w-[40px] !w-[40px] !h-[40px] !rounded-full flex
                    items-center  justify-center !bg-medium  dark:!bg-blue-600 !text-white" >
                            R
                        </span>
                    
                      </Button>
                
                </div>
                
            </div>
        </header>
        
    );
}