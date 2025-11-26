import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PitcherDetailPage } from './pages/PitcherDetailPage';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pitcher/:id" element={<PitcherDetailPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;