### Mémo : commandes PostgreSQL utilisées

**Connexion avec le client `psql`**

| Commande | Rôle |
|---|---|
| `psql -U todo -d todo` | Se connecter à la base `todo` avec l'utilisateur `todo` |
| `psql -h localhost -U todo -d todo` | Idem, en passant par le réseau (demande le mot de passe) |
| `psql ... -c "requête"` | Exécuter une seule requête sans ouvrir de session |
| `psql ... -f fichier.sql` | Exécuter un script SQL |
| `docker exec -it todo-db psql -U todo -d todo` | Ouvrir `psql` **dans** le conteneur `todo-db` |
| `docker compose exec db psql -U todo -d todo` | Idem avec Compose (nom du service `db`) |

**Méta-commandes `psql`** (commencent par `\`, pas de `;` à la fin)

| Commande | Rôle | Équivalent MySQL |
|---|---|---|
| `\l` | Lister les bases de données | `SHOW DATABASES;` |
| `\c todo` | Se connecter à la base `todo` | `USE todo;` |
| `\dt` | Lister les tables | `SHOW TABLES;` |
| `\d tasks` | Afficher la structure de la table `tasks` | `DESCRIBE tasks;` |
| `\du` | Lister les utilisateurs | `SELECT user FROM mysql.user;` |
| `\q` | Quitter `psql` | `exit` |

**Requêtes SQL** (se terminent par `;`)

| Requête                                          | Rôle                           |
| ------------------------------------------------ | ------------------------------ |
| `SELECT * FROM tasks;`                           | Afficher toutes les tâches     |
| `INSERT INTO tasks (title) VALUES ('Ma tâche');` | Ajouter une tâche              |
| `UPDATE tasks SET done = TRUE WHERE id = 1;`     | Marquer la tâche 1 comme faite |
| `DELETE FROM tasks WHERE id = 1;`                | Supprimer la tâche 1           |

>  Ces quatre requêtes sont exactement celles qu'exécute l'application quand on clique sur ses boutons (voir `app.py`).