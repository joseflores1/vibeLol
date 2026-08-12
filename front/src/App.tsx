import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";

// App — top-level wrapper: BrowserRouter around AppRoutes. Tests render
// <AppRoutes/> inside their own <MemoryRouter> to avoid nested routers.
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}