import { Presentation } from '../../presentation-framework/src/Presentation.jsx';
import { slides } from './slides/slides.jsx';
import './styles/custom.css';
import reactLogo from './assets/react_logo_dark.svg';

function App() {
  const config = {
    brandLogo: (
      <img
        src={reactLogo}
        alt="React"
        className="react-logo"
        style={{ viewTransitionName: 'react-brand-logo' }}
      />
    ),
  };

  return <Presentation slides={slides} config={config} />;
}

export default App;
