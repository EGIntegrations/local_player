import { PlayerShell } from './components/PlayerShell';
import { LicenseGate } from './components/license/LicenseGate';
import './App.css';

function App() {
  return (
    <LicenseGate>
      <PlayerShell />
    </LicenseGate>
  );
}

export default App;
