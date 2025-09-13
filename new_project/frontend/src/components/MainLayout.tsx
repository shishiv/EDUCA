import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const MainLayout: React.FC = () => {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <Header />
      <Sidebar />
      <main
        style={{
          marginLeft: 220,
          marginTop: 64,
          padding: 32,
          minHeight: "calc(100vh - 64px)",
          fontFamily: "Inter, Montserrat, Arial, sans-serif",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
