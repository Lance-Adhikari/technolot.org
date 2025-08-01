// server.js
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Dummy credentials for the only admin (you)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Serve login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve dashboard only if logged in
app.get('/dashboard.html', (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Root redirect — must be after session + static
app.get('/', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/dashboard.html');
  } else {
    res.redirect('/login.html');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/dashboard.html');
  } else {
    res.send('<p style="color:red; text-align:center;">Invalid credentials. <a href="/login.html">Try again</a></p>');
  }
});

// Database
const pool = require('./db'); // assuming you saved your pool config as db.js

app.post('/api/link-lockers', async (req, res) => {
  const { title, target_url } = req.body;

  if (!title || !target_url) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    await pool.query(
      'INSERT INTO link_lockers (title, target_url, created_at, views) VALUES ($1, $2, NOW(), 0)',
      [title, target_url]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Database insert error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Authentication check for frontend
app.get('/auth-check', (req, res) => {
  res.json({ authenticated: !!req.session.loggedIn });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

