"use client"
//import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/app/src/components/sidebar/sidebar";
import Header from "@/app/src/components/headerP/header2";
//import "./globals.css";
//import "../app/src/dashboard/style.css";
//import Provider from "@/app/src/context/themeprovider";
import { useState } from "react";


export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
       
        <div >
        
            <Sidebar collapsed={collapsed} /> 
          
            <Header toggleSidebar={toggleSidebar} collapsed={collapsed}  />
        
                    
                    <main  className={`transition-all duration-300 pt-[64px] 
                    ${ collapsed ? "ml-[80px]" : "ml-[300px]"}`}>{children}</main>
             

        </div>
        
       
  );
}
