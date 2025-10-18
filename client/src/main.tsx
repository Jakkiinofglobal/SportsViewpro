import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";
import { AuthProvider } from "@/context/auth";
import { UserPrefsProvider } from "@/context/userPrefs";
import { PlanProvider } from "@/context/plan";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <UserPrefsProvider>
      <PlanProvider>
        <RouterProvider router={router} />
      </PlanProvider>
    </UserPrefsProvider>
  </AuthProvider>
);
