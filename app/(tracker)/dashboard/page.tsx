"use client";
import React from "react";
import DashboardComp from "@/components/tracker/DashboardComp";
import DashboardAssetAnalysis from "@/components/tracker/DashboardAssetAnalysis";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardComp />
      <DashboardAssetAnalysis />
    </div>
  );
}