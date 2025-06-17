import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
    const handleLogin = () => {
        alert('登录功能开发中...');
    };

    return (
        <nav className="navbar">
            <div className="nav-brand">AI Tech研习社</div>
            <div className="nav-center">
                <Link to="/" className="nav-link">首页</Link>
                <Link to="/ai-news" className="nav-link">AI时讯</Link>
                <Link to="/team-intro" className="nav-link">团队介绍</Link>
                <Link to="/feature4" className="nav-link">More</Link>
            </div>
            <div className="nav-right">
                <button className="login-button" onClick={handleLogin}>
                    登录
                </button>
            </div>
        </nav>
    );
}

export default Navbar; 