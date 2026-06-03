import { Outlet } from "react-router-dom";

export default function LoginLayout() {
  return (
    <main className="login-layout">
      <Outlet />
    </main>
  );
}
