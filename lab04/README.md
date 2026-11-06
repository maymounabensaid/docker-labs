# Lab 04 — Application web + base de données avec Docker Compose

## Objectifs

À la fin de ce lab, vous saurez :

- construire deux images personnalisées (application web et base de données) ;
- faire communiquer deux conteneurs via un **réseau Docker** (résolution DNS par nom) ;
- conserver les données avec un **volume** ;
- passer la configuration par des **variables d'environnement** (fichier `.env`) au lieu de l'écrire dans l'image ;
- orchestrer l'ensemble avec **Docker Compose**, puis brancher un outil d'administration (pgAdmin) d'abord à la main, ensuite dans Compose.


---

## 1. Description de l'application

On considère une application web de **gestion de tâches (To-Do list)** qui agit sur une base PostgreSQL :

| Action dans l'interface | Route Flask | Requête SQL |
|---|---|---|
| Afficher les tâches | `GET /` | `SELECT` |
| Ajouter une tâche | `POST /add` | `INSERT` |
| Marquer faite / non faite | `POST /toggle/<id>` | `UPDATE` |
| Supprimer une tâche | `POST /delete/<id>` | `DELETE` |

### 1.1. Architecture

```
          navigateur
              │  http://localhost:8080
              ▼
   ┌─────────────────────┐        réseau Docker        ┌──────────────────────┐
   │  web  (Flask :5000) │ ──────────────────────────▶ │  db  (PostgreSQL)    │
   │  image: todo-web    │   hôte "db", port 5432      │  image: todo-db      │
   └─────────────────────┘                             └──────────┬───────────┘
                                                                  │
                                                       volume  db-data
                                                  (/var/lib/postgresql/data)
```

- **Le conteneur web** exécute l'application Python/Flask. Il lit les paramètres de connexion dans ses variables d'environnement (`DB_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).
- **Le conteneur base de données** exécute PostgreSQL 16. Au **premier** démarrage, il exécute `init.sql`, qui crée la table `tasks` et insère deux tâches d'exemple.
- **Le volume** conserve les données même si le conteneur est supprimé.
### 1.2. Récupération et structure du projet

Téléchargez le dossier `sources/` dans votre répertoire personnel (copiez-collez la commande entière) :

```bash
cd ~
curl -L https://github.com/maymounabensaid/docker-labs/archive/refs/heads/main.tar.gz \
  | tar xz --strip-components=2 docker-labs-main/lab04/sources
cd sources
ls        # doit afficher : app  db
```

Le dossier `sources/` contient :

```
sources/
├── .env        # variables partagées par les conteneurs
├── app/
│   ├── app.py            # application Flask (4 routes CRUD)
│   ├── requirements.txt  # flask, psycopg2-binary
│   └── templates/
│       └── index.html
└── db/
    └── init.sql          # création de la table tasks
```

Vous allez écrire : `app/Dockerfile`, `db/Dockerfile` et `compose.yaml`.

Placez-vous dans `sources/` et créez votre fichier `.env` :

```bash
cd sources
nano .env
```

- Copiez collez le contenu suivant dans `.env`
```bash
POSTGRES_DB=todo
POSTGRES_USER=todo
POSTGRES_PASSWORD=todo_pwd

# pgAdmin web login (parts 5 and 6)
PGADMIN_DEFAULT_EMAIL=admin@tekup.tn
PGADMIN_DEFAULT_PASSWORD=admin
```


---
## 2. Construction des images

### 2.1. Image de l'application web

Image de base : **`python:3.12-slim`** (voir https://hub.docker.com/_/python).

Créez `app/Dockerfile`. Il doit :

1. partir de `python:3.12-slim` ;
2. définir `/app` comme répertoire de travail ;
3. copier **d'abord** `requirements.txt`, puis installer les dépendances (`pip install --no-cache-dir -r requirements.txt`) ;
4. copier ensuite le reste du code ;
5. exposer le port `5000` ;
6. lancer `python app.py`.

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

```bash
docker build -t todo-web ./app
```

**Question 1 :** modifiez une ligne de `templates/index.html`, puis reconstruisez l'image. Quelles étapes affichent `CACHED` ? Pourquoi copie-t-on `requirements.txt` avant le reste du code ?
### 2.2. Image de la base de données

Image de base : **`postgres:16`** (voir https://hub.docker.com/_/postgres, section *Initialization scripts*).

Créez `db/Dockerfile`. Il doit partir de `postgres:16` et copier `init.sql` dans `/docker-entrypoint-initdb.d/`.

```dockerfile
FROM postgres:16
COPY init.sql /docker-entrypoint-initdb.d/
```


```bash
docker build -t todo-db ./db
docker images | grep todo
```

---
## 3. Déploiement sans Docker Compose

### 3.1. Réseau et volume

```bash
docker network create todo-net
docker volume create todo-data
```

### 3.2. Conteneur base de données

```bash
docker run -d --name todo-db \
  --network todo-net \
  --env-file .env \
  -v todo-data:/var/lib/postgresql/data \
  todo-db
```

- Au premier démarrage, l'image `postgres` exécute automatiquement les scripts placés dans `/docker-entrypoint-initdb.d/` et l'écrit dans le journal du conteneur.
- Vérifiez dans le journal du conteneur (`docker logs`) que le script `init.sql` a bien été exécuté au premier démarrage :

```bash
docker logs todo-db | grep init.sql 
```
### 3.3. Conteneur application web

```bash
docker run -d --name todo-web \
  --network todo-net \
  --env-file .env \
  -e DB_HOST=todo-db \
  -p 8080:5000 \
  todo-web
```

Ouvrez http://localhost:8080, puis ajoutez, cochez et supprimez des tâches.

**Question 2 :** l'application contacte l'hôte `todo-db`. Qui traduit ce nom en adresse IP ? Vérifiez avec :

```bash
docker network inspect todo-net
```

**Question 3 :** supprimez `todo-web` et relancez-le **sans** l'option `--network todo-net`. Que se passe-t-il dans le navigateur ? Expliquez.

> **Note :** Les commandes PostgreSQL utilisées dans ce lab sont résumées dans le [memo](MEMO.md). 
### 3.4. Accès direct à la base

```bash
docker exec -it todo-db psql -U todo -d todo
```

```sql
\dt
SELECT * FROM tasks;
\q
```

Vérifiez que les tâches ajoutées depuis le navigateur apparaissent bien.
### 3.5. Nettoyage

Supprimez les conteneurs et le réseau :

```bash
docker rm -f todo-web todo-db
docker network rm todo-net
```

**Question 4 :** le volume `todo-data` existe encore (`docker volume ls`). Si vous relancez `todo-db` avec ce volume, retrouverez-vous vos tâches ? `init.sql` sera-t-il ré-exécuté ?

Vérifiez votre réponse :

```bash
docker run -d --name todo-db --env-file .env -v todo-data:/var/lib/postgresql/data todo-db
docker exec -it todo-db psql -U todo -d todo -c "SELECT * FROM tasks;"
docker logs todo-db | grep init.sql      
```

Après le test, supprimez le conteneur, le volume, puis les images :

```bash
docker rm -f todo-db
docker volume rm todo-data
docker rmi todo-web todo-db
docker volume ls                 # todo-data a disparu
docker images | grep todo        # plus aucune image todo-*
```

> Ne supprimez pas les images de base `python:3.12-slim` et `postgres:16` : elles resservent dans la partie suivante.

---
## 4. Déploiement avec Docker Compose (deux services)

Dans `sources/`, créez `compose.yaml` avec deux services :

| | service `db` | service `web` |
|---|---|---|
| Construction | `./db` → image `todo-db` | `./app` → image `todo-web` |
| Variables | fichier `.env` | fichier `.env` + `DB_HOST=db` |
| Ports | aucun (non exposé sur l'hôte) | `8080:5000` |
| Volume | `db-data` monté sur `/var/lib/postgresql/data` | — |
| Démarrage | — | après `db` |
| Redémarrage | `unless-stopped` | `unless-stopped` |

> Avec Compose, **le nom du service est le nom d'hôte DNS** : l'application joint la base via `db`. Il n'est pas nécessaire de créer le réseau, Compose le crée automatiquement.

```yaml
services:
  db:
    build: ./db
    image: todo-db
    env_file: .env
    volumes:
      - db-data:/var/lib/postgresql/data
    restart: unless-stopped

  web:
    build: ./app
    image: todo-web
    env_file: .env
    environment:
      DB_HOST: db
    ports:
      - "8080:5000"
    depends_on:
      - db
    restart: unless-stopped

volumes:
  db-data:
```

```bash
docker compose up -d 
docker compose ps
docker compose logs web
```

Vérifiez les ressources créées par Compose :

```bash
docker network ls 
docker volume ls  
```

**Question 5 :** d'où vient le préfixe `sources_` dans le nom du réseau et du volume ?

### 4.1. Persistance des données

1. Ajoutez trois tâches dans l'application.
2. Arrêtez et supprimez les conteneurs, puis relancez-les :

   ```bash
   docker compose down
   docker compose up -d
   ```

   Les tâches sont-elles toujours là ?

3. Recommencez avec l'option `-v` :

   ```bash
   docker compose down -v
   docker compose up -d
   ```

**Question 6 :** qu'est-ce qui a changé ? Pourquoi retrouve-t-on exactement les deux tâches de `init.sql` ?

---

## 5. Ajout de pgAdmin au réseau Compose

[pgAdmin 4](https://hub.docker.com/r/dpage/pgadmin4) est l'interface web officielle d'administration de PostgreSQL (l'équivalent de phpMyAdmin pour MySQL).

Les services `db` et `web` tournent toujours (partie 4). On va lancer pgAdmin **à part**, avec `docker run`, et le brancher sur le réseau créé par Compose.

Les identifiants de connexion à pgAdmin sont déjà dans `.env` (`PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`).

Démarrez le conteneur `pgadmin` à partir de l'image `dpage/pgadmin4` avec les options suivantes :

- mode arrière-plan : `-d`
- nom du conteneur : `--name pgadmin`
- port : `-p 5050:80`
- variables d'environnement : `--env-file .env`
- réseau : `???????`


```bash
docker network ls                  
docker run -d --name pgadmin -p 5050:80 --env-file .env \
  --network sources_default \
  dpage/pgadmin4
```


```bash
docker logs -f pgadmin   
```

Ouvrez http://localhost:5050 et connectez-vous avec l'e-mail et le mot de passe de `.env`. Puis **Add New Server** :

| Onglet | Champ | Valeur |
|---|---|---|
| General | Name | `todo` |
| Connection | Host name/address | `db` |
| Connection | Username / Password | `POSTGRES_USER` / `POSTGRES_PASSWORD` de `.env` |

Dépliez `todo` → *Databases* → `todo` → *Schemas* → *public* → *Tables* → `tasks`, puis clic droit → *View/Edit Data* → *All Rows*.
Ajoutez une ligne, enregistrez (F6), puis rafraîchissez http://localhost:8080 : la tâche apparaît, car les deux interfaces agissent sur la même base.

**Question 7 :** pourquoi pgAdmin peut-il joindre l'hôte `db` alors qu'il n'a pas été démarré par Compose ? Que se passerait-il sans l'option `--network` ?

Supprimez ce conteneur avant de passer à la suite :

```bash
docker rm -f pgadmin
```

---

## 6. Docker Compose avec trois services

**Question 8 :** modifiez `compose.yaml` pour que pgAdmin fasse partie de l'application. Ajoutez un service `pgadmin` :

- image : `dpage/pgadmin4` ;
- variables : fichier `.env` ;
- port : `5050` sur l'hôte → `80` dans le conteneur ;
- démarrage après `db`.


```yaml
  pgadmin:
    image: dpage/pgadmin4
    env_file: .env
    ports:
      - "5050:80"
    depends_on:
      - db
```


```bash
docker compose up -d
docker compose ps        
```

Reconnectez-vous sur http://localhost:5050 et ajoutez à nouveau le serveur `db`.

**Question 9 :** comparez la commande `docker run` de la partie 5 et le service `pgadmin` du fichier Compose. Quelle option de `docker run` n'a plus besoin d'être écrite, et pourquoi ?

---
## 7. Nettoyage final

```bash
docker compose down -v
docker rmi todo-web todo-db
docker volume rm todo-data
```
