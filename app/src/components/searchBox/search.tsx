import React from 'react'
import { IoSearch } from "react-icons/io5";

type SearchBoxProps = {
  placeholder?: string;
  width?: string;
};
export default function SearchBox  ({placeholder, width}: SearchBoxProps) {
  return (
    <div className='searchBox relative mt-2' style={{width}} >
      <IoSearch size={18} className='absolute top-3 left-3 text-gray-500' />
     <input type="text" placeholder={placeholder} className='w-full h-10
      outline-none border border-[rgba(0,0,0,0.2)] dark:border-white rounded-md px-3 pl-10 text-[14px] 
      focus:border-[rgba(0,0,0,0.4)] dark:bg-gray-800'/>
    </div>
  );
}

