import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function HomePage() {
  return (
    <div>
      <h1>Welcome to the Ansible Management Platform</h1>
      <nav>
        <ul>
          <li><Link to="/login">Login</Link></li>
          {/* Add other links as pages are created */}
        </ul>
      </nav>
    </div>
  );
}

function LoginPagePlaceholder() {
  return <h2>Login Page Placeholder</h2>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPagePlaceholder />} />
        {/* Define other routes here as components are built */}
      </Routes>
    </Router>
  );
}

export default App;
