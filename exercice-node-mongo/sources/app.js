// Notes app — Express + MongoDB (Docker Compose exercise)
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// Connection URL comes from an environment variable (set in compose.yaml)
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/notesdb';

// A "note" document stored in the "notes" collection
const Note = mongoose.model('Note', new mongoose.Schema({
  text: { type: String, required: true, maxlength: 200 },
  createdAt: { type: Date, default: Date.now },
}));

app.use(express.urlencoded({ extended: false })); // HTML form
app.use(express.json());                           // JSON API

const escape = (s) => s.replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Web page: list of notes + form
app.get('/', async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  const items = notes.map((n) =>
    `<li>${escape(n.text)} <small>${n.createdAt.toLocaleString('fr-FR')}</small></li>`).join('');
  res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Notes</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto}small{color:#888}</style></head>
<body><h1>🗒️ Notes</h1><p>Node.js ➜ MongoDB (<code>${escape(MONGO_URL)}</code>)</p>
<form method="post" action="/notes"><input name="text" required maxlength="200" placeholder="Nouvelle note…">
<button>Ajouter</button></form><ul>${items || '<li>Aucune note.</li>'}</ul>
<p>${notes.length} note(s) dans la base.</p></body></html>`);
});

// Add a note (from the form or as JSON)
app.post('/notes', async (req, res) => {
  const note = await Note.create({ text: req.body.text });
  if (req.is('application/json')) return res.status(201).json(note);
  res.redirect('/');
});

// JSON API: list of notes
app.get('/api/notes', async (req, res) => {
  res.json(await Note.find().sort({ createdAt: -1 }));
});

// Errors (database unreachable, invalid note…)
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.name === 'ValidationError' ? 400 : 503).send(`Erreur : ${escape(err.message)}`);
});

mongoose.connect(MONGO_URL)
  .then(() => console.log(`Connecté à MongoDB : ${MONGO_URL}`))
  .catch((err) => console.error('Erreur de connexion à MongoDB :', err.message));

app.listen(PORT, () => console.log(`App en écoute sur http://localhost:${PORT}`));
