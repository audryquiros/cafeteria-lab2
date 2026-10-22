
import Navbar from "./components/Navbar/Navbar";
import AppRoutes from "./routes/AppRoutes";
import "./App.css";

function App() {
  return (
    <div className="app-layout">
      <Navbar />

      <main className="app-content">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;
