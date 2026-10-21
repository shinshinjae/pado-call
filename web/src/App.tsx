import { useApp } from './state';
import { TouristShell } from './components/Shell';
import { CallScreen } from './screens/CallScreen';
import { WaveScreen } from './screens/WaveScreen';
import { TripsScreen } from './screens/TripsScreen';
import { ControlScreen } from './screens/ControlScreen';
import { ModelScreen } from './screens/ModelScreen';
import { DriverScreen } from './screens/DriverScreen';

export function App() {
  const { route } = useApp();
  if (route.path === 'control') return <ControlScreen />;
  if (route.path === 'model') return <ModelScreen />;
  if (route.path === 'driver') return <DriverScreen />;
  const key = `${route.path}?${route.params.toString()}`;
  return (
    <TouristShell>
      {route.path === 'wave' ? <WaveScreen key={key} /> : route.path === 'trips' ? <TripsScreen /> : <CallScreen key={key} />}
    </TouristShell>
  );
}
