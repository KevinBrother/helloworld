import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import CrawlerTest from '@/pages/CrawlerTest';
import FileManager from '@/pages/FileManager';
import ApiTest from '@/pages/ApiTest';
import MediaTest from '@/pages/MediaTest';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/crawler" replace />} />
          <Route path="crawler" element={<CrawlerTest />} />
          <Route path="files" element={<FileManager />} />
          <Route path="api" element={<ApiTest />} />
          <Route path="media" element={<MediaTest />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
