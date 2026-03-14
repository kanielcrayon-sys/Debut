import Image from "next/image";
import React from "react";
import Link from "next/link";
import { sidebarmenu } from "./data";
import { Button } from "@mui/material";


export default function Sidebar({ collapsed }: { collapsed: boolean }){

        return (
            <aside className={`h-screen max-h-screen overflow-y-scroll overflow-x-hidden p-3
  border-r border-[rgba(0,0,0,0.1)] fixed top-0 left-0 transition-all duration-300
  ${collapsed ? "w-[80px]" : "w-[300px]"}`}>

               {/* Logo */}
                <Link href="/" className="flex items-center justify-center mb-6">
                    < Image src="/vercel.svg" width={collapsed ? 1 : 1} height={3} alt="logo" />
                </Link>
               <div className='sidebarmenu mt-4'>
                {
                    sidebarmenu?.length !== 0 &&

                    <ul className='w-full'>
                    {
                         sidebarmenu?.map((menu,index)=>{
                            return(
                                <li className="w-full" key={index}>
                                    <Link href={menu.href}>
                                        <Button variant="text" className="w-full !capitalize 
                                        text-left !justify-start !text-gray-700  gap-2 !font-
                                        [600] !text-[13px] !py-3 dark:!text-white   dark:hover:!bg-gray-800">{menu?.icon}
                                            {/* texte caché si collapsed */}
                                            {!collapsed && <span>{menu?.title}</span>}

                                            
                                        </Button>
                                    </Link>
                                        
                                        {/* tooltip si sidebar fermé */}
                                        {collapsed && (
                                            <span
                                            className="absolute left-full top-1/2 -translate-y-1/2 ml-3
                                            bg-gray-800 text-white text-xs px-2 py-1 rounded
                                            opacity-0 group-hover:opacity-100 transition whitespace-nowrap"
                                            >
                                            {menu?.title}
                                            </span>
                                        )}
                                    
                                </li>
                            )
                         })
                    }
                    </ul>
                }
                

               </div>


            </aside>
                
        
        )



}