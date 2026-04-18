"use client";
import ClientLayout from "@/app/src/dashboard/dashlayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}