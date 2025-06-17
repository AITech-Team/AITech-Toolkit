// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import PdfUpload from './components/PdfUpload';
import Navbar from './components/Navbar';
import TeamIntro from './components/TeamIntro';
import AiNews from './components/AiNews';
import PdfReader from './components/PdfReader';
import VideoProcessor from './components/VideoProcessor';
import './App.css';

function App() {
    return (
        <Router>
            <div className="app-container">
                <Navbar />
                <div className="content-container">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/pdf-upload" element={<PdfUpload />} />
                        <Route path="/pdf-reader" element={<PdfReader />} />
                        <Route path="/video_voice" element={<VideoProcessor />} />
                        <Route path="/ai-news" element={<AiNews />} />
                        <Route path="/team-intro" element={<TeamIntro />} />
                        <Route path="/feature4" element={<div className="development-placeholder">功能四开发中...</div>} />
                        <Route path="/feature5" element={<div className="development-placeholder">功能五开发中...</div>} />
                        <Route path="/feature6" element={<div className="development-placeholder">功能六开发中...</div>} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;