# Corrigé — Node.js et MongoDB avec Docker Compose

## 2. Dockerfile

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

**Question 1 :** Docker garde chaque étape en cache tant que rien n'a changé dans cette étape ni avant elle. En copiant `package.json` seul, puis en lançant `npm install`, l'installation des dépendances reste en cache tant que la liste des dépendances ne change pas. Si on modifie `app.js`, seule l'étape `COPY . .` est refaite : la reconstruction prend une seconde au lieu de retélécharger Express et Mongoose.

> `--omit=dev` n'installe que les dépendances de production. Le fichier `.dockerignore` empêche `COPY . .` de copier un éventuel dossier `node_modules` de la machine hôte, qui écraserait celui installé dans l'image.

---

## 3. compose.yaml

```yaml
services:
  app:
    build: .
    image: notes-app
    environment:
      MONGO_URL: mongodb://mongo:27017/notesdb
    ports:
      - "3000:3000"
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:8
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  mongo-data:
```

**Question 2 :** `mongo` est le **nom du service** déclaré dans `compose.yaml`. Compose crée un réseau (`notes-app_default`) sur lequel le **DNS intégré de Docker** traduit chaque nom de service en adresse IP du conteneur correspondant. Si le service s'appelait `db`, il faudrait écrire `mongodb://db:27017/notesdb`.

**Question 3 :** l'application et MongoDB sont sur le **même réseau Docker** : ils communiquent directement par ce réseau, sur le port interne `27017`. Publier un port (`ports:`) sert uniquement à le rendre accessible **depuis la machine hôte**. Ne pas publier `27017` est d'ailleurs plus sûr : la base n'est accessible qu'aux conteneurs de l'application.

---

## 4. Tests

Résultat attendu de `curl localhost:3000/api/notes` (identifiants et dates différents) :

```json
[
  {"_id":"6733…","text":"Note ajoutée avec curl","createdAt":"2026-11-12T…","__v":0},
  {"_id":"6733…","text":"Deuxième note","createdAt":"2026-11-12T…","__v":0}
]
```

**Question 4 :** MongoDB crée la base et la collection **automatiquement, à la première écriture**. Tant qu'aucune note n'a été ajoutée, `notesdb` n'existe pas (`show dbs` dans `mongosh` ne l'affiche pas). Dès le premier `create()`, la base `notesdb` et la collection `notes` sont créées. Il n'y a pas de schéma à déclarer côté serveur : c'est l'application (Mongoose) qui définit la forme des documents.

**Question 5 :**

| Commande | Conteneurs | Réseau | Volume `mongo-data` | Notes |
|---|---|---|---|---|
| `docker compose down` | supprimés | supprimé | **conservé** | retrouvées au redémarrage |
| `docker compose down -v` | supprimés | supprimé | **supprimé** | perdues : base vide au redémarrage |

Les données de MongoDB sont stockées dans `/data/db`, monté sur le volume `mongo-data`. Elles survivent tant que le volume existe.

---

## 5. Bonus : mongo-express

```yaml
  mongo-express:
    image: mongo-express
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://mongo:27017/
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin
    ports:
      - "8081:8081"
    depends_on:
      - mongo
    restart: unless-stopped
```

> Au premier démarrage, mongo-express peut afficher des erreurs de connexion pendant quelques secondes, le temps que MongoDB soit prêt ; grâce à `restart: unless-stopped`, il redémarre et se connecte.

---
