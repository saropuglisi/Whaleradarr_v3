import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Help from './pages/Help';
import ContractDetail from './pages/ContractDetail';

import HeatmapAnalysis from './pages/HeatmapAnalysis';

function App() {
  // Initialize theme early to prevent flash
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<HeatmapAnalysis />} />
          <Route path="/help" element={<Help />} />
          <Route path="/contract/:id" element={<ContractDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
