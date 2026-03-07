"use client"
import React from "react";
import Image from "next/image";
import vercel from "@/public/vercel.svg" ;
//import { useState } from "react";

export default function Header(){
    return( 
        <header  className="bg-blue-600 shadow-lg border-[#1f1f1f] mx-4 sm:mx-6 lg:mx-8 mt-4 mb-2 rounded-lg">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 flex items-center justify-between">
                <h1 className="text-amber-100 sm:text-3xl font-semibold text-gray-100s"> 
                    Gecole
                </h1>
                <div className="flex items-center space-x-3 sm:space-x-6">
                    <Image src={vercel} alt="country flag" width={25} height={18} className="rounded full shadow-md cursor-pointer"/>
                    
                </div>

            </div>
            
        </header>
        

        
    );

} 