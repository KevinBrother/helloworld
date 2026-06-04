import { DashboardPage } from './pages/DashboardPage';
import { prototypeConfig } from './prototype.config';

function App() {
  return (
    <div className="prototype-shell single-workbench">
      <header className="prototype-topbar">
        <div>
          <h1>{prototypeConfig.productName}</h1>
        </div>
      </header>

      <main className="prototype-main">
        <DashboardPage />
      </main>
    </div>
  );
}

export default App;
