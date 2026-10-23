
# LAB 03 : Création et déploiement d'une image Docker pour une application Web



## Objectifs


- Créer une image Docker pour une application Web à l'aide d'un Dockerfile.
- Comprendre pourquoi un conteneur reste actif (ou s'arrête) selon son processus principal.
- Distinguer la **documentation** d'un port (`EXPOSE`) de sa **publication** (`-p`, `-P`).
- Rendre une application conteneurisée accessible depuis la machine hôte (port mapping, réseau `host`).
 

---

## 1. Application Web sur la machine locale

Avant de conteneuriser l'application, on la déploie de manière classique sur la machine locale, afin de comparer ensuite les deux approches.

### 1.1. Installation du serveur Web Apache2

1- Installez Apache :

```bash
sudo apt-get update
sudo apt-get install -y apache2
```

2- Vérifiez que le service est actif :

```bash
sudo systemctl status apache2
```

3- Ouvrez votre navigateur à l'adresse `http://localhost:80` (port par défaut d'Apache).

4- Affichez le contenu du fichier `/var/www/html/index.html` et comparez-le avec la page affichée.

**Conclure :** quel est le rôle du répertoire `/var/www/html` ?

5- Arrêtez puis redémarrez le service Apache :

```bash
sudo systemctl stop apache2
sudo systemctl start apache2
sudo systemctl status apache2
```

> [!NOTE]
> La commande `apachectl` (outil de contrôle propre à Apache) permet aussi de démarrer/arrêter le serveur : `sudo apachectl stop` / `sudo apachectl start`. C'est elle que l'on utilisera dans le conteneur, où `systemd` n'est pas disponible.

### 1.2. Création de l'application

1- Éditez le fichier `index.html` :

```bash
sudo nano /var/www/html/index.html
```

2- Remplacez son contenu par :

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Hello From Docker LAB !</h1>
  </body>
</html>
```

### 1.3. Accès à l'application

Ouvrez votre navigateur à l'adresse `http://localhost` et vérifiez que le message s'affiche.

---

## 2. Création d'une image Docker pour une application Web avec Apache

### 2.0. Libérer le port 80 de la machine hôte

Le conteneur que l'on va créer utilisera lui aussi le port 80. Or un seul processus peut écouter sur un port donné : il faut donc désinstaller l'Apache local.

```bash
sudo systemctl stop apache2 
sudo apt-get purge -y apache2 apache2-bin apache2-data apache2-utils
```


```bash
sudo apt-get autoremove -y --purge
```

```bash
sudo rm -rf /var/www
```


Vérifiez que Apache2 est désinstallé et que le port 80 est libre :

```bash
sudo systemctl status apache2     # Unit apache2.service could not be found.
sudo ss -ltnp | grep ':80 '       # aucune ligne attendue
```

### 2.1. Fichier Dockerfile

1- Dans votre répertoire personnel, créez le répertoire de travail `webserver_apache` :

```bash
mkdir ~/lab03
cd ~/lab03
```

2- Créez le fichier `index.html` :

```bash
nano index.html
```

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Hello From Docker LAB !</h1>
  </body>
</html>
```

3- Créez le fichier `Dockerfile` :

```bash
nano Dockerfile
```

```dockerfile
FROM ubuntu
# Installation d'Apache
RUN apt-get update && apt-get install -y apache2
# Répertoire de travail
WORKDIR /var/www/html
COPY index.html .
# Port utilisé par l'application (documentation)
EXPOSE 80
CMD ["apachectl", "start"]
```

**Explication**

| Instruction                                 | Rôle                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FROM ubuntu`                               | Image de base.                                                                                                                                                |
| `RUN apt-get update && apt-get install ...` | Met à jour la liste des paquets **et** installe Apache dans la **même** instruction. Séparés, Docker pourrait réutiliser en cache un ancien `apt-get update`. |
| `WORKDIR /var/www/html`                     | Crée/définit le répertoire de travail dans l'image.                                                                                                           |
| `COPY index.html .`                         | Copie `index.html` du contexte de build (répertoire courant) vers `/var/www/html` dans l'image.                                                               |
| `EXPOSE 80`                                 | **Documente** le port écouté par l'application. Ne rend **pas** le conteneur accessible depuis l'hôte.                                                        |
| `CMD ["apachectl", "start"]`                | Commande exécutée au démarrage du conteneur : c'est son **processus principal**.                                                                              |

### 2.2. Création de l'image

1- Créez l'image `helloweb:version1` :

```bash
docker build -t helloweb:version1 .
```

2- Vérifiez que l'image existe dans le dépôt local et relevez sa taille :

```bash
docker images
```

### 2.3. Création et démarrage du conteneur

1- Démarrez un conteneur nommé `webcontainer1` à partir de l'image `helloweb:version1` :

```bash
docker run --name webcontainer1 helloweb:version1
```

2- Vérifiez s'il est actif :

```bash
docker ps        # aucun conteneur actif
docker ps -a     # webcontainer1 apparaît avec le statut "Exited (0)"
docker logs webcontainer1
```

**Question :** pourquoi le conteneur s'est-il arrêté alors qu'aucune erreur n'est affichée ?

> [!IMPORTANT]
> Un conteneur reste actif tant que son processus principal (PID 1) est en cours d'exécution. `apachectl start` lance Apache en arrière-plan (démon) puis se termine : le processus principal s'arrête, donc le conteneur aussi. Il faut exécuter le service en **premier plan** (FOREGROUND).

**Modification n°1**

3- Dans le Dockerfile, remplacez la dernière ligne par :

```dockerfile
CMD ["apachectl", "-D", "FOREGROUND"]
```

4- Créez l'image `webserver:version2` :

```bash
docker build -t helloweb:version2 .
```

**Question :** quelles étapes du build sont marquées `CACHED` ? Pourquoi ?

5- Démarrez, en arrière-plan, un conteneur `webcontainer2` à partir de `helloweb:version2`, puis consultez ses journaux :

```bash
docker run -d --name webcontainer2 helloweb:version2
docker ps
docker logs webcontainer2
```

Le conteneur est maintenant actif, mais ses journaux affichent :

```text
AH00558: apache2: Could not reliably determine the server's fully qualified domain name, using 172.17.0.2. Set the 'ServerName' directive globally to suppress this message
```

Ce message n'est pas bloquant : il indique que la directive `ServerName` n'est pas définie dans la configuration d'Apache (`/etc/apache2/apache2.conf`).

**Modification n°2**

6- Modifiez le Dockerfile une dernière fois :

```dockerfile
FROM ubuntu
# Installation d'Apache
RUN apt-get update && apt-get install -y apache2
# Configuration d'Apache
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf
# Répertoire de travail
WORKDIR /var/www/html
COPY index.html .
# Port utilisé par l'application (documentation)
EXPOSE 80
CMD ["apachectl", "start"]
```

7- Créez l'image `helloweb:version3` :

```bash
docker build -t helloweb:version3 .
```

8- Démarrez un conteneur `webcontainer3` et vérifiez que le message AH00558 a disparu :

```bash
docker run -d --name webcontainer3 helloweb:version3
docker logs webcontainer3
```

### 2.4. Accès à l'application par l'adresse IP du conteneur

1- Récupérez l'adresse IP du conteneur :

```bash
docker inspect -f '{{.NetworkSettings.Networks.bridge.IPAddress}}' webcontainer3
```

2- Testez l'accès (remplacez par l'adresse obtenue) :

```bash
curl http://172.17.0.3
```

Vous pouvez aussi ouvrir cette adresse dans votre navigateur.

> [!WARNING]
> L'accès direct par l'IP du conteneur ne fonctionne que sur un hôte **Linux**. Sous Docker Desktop (Windows/macOS), les conteneurs tournent dans une machine virtuelle et leur IP n'est pas joignable depuis l'hôte.

3- Arrêtez le conteneur :

```bash
docker stop webcontainer2
docker stop webcontainer3
```

### 2.5. Accès à l'application depuis la machine hôte

#### Expérience préalable : `EXPOSE` publie-t-il le port ?

```bash
docker run -d --name test-expose helloweb:version3
docker port test-expose          # aucun résultat : rien n'est publié

docker run -d -P --name test-P helloweb:version3
docker port test-P               # ex. 80/tcp -> 0.0.0.0:32768
```

**Conclure :** quel est le rôle de `EXPOSE` ? Quel est le rôle de l'option `-P` ?

```bash
docker rm -f test-expose test-P
```

#### Méthode 1 : port mapping

1- Démarrez, en arrière-plan, un conteneur `webcontainer4` en publiant le port 80 du conteneur sur le port 3000 de l'hôte :

```bash
docker run -d -p 3000:80 --name webcontainer4 helloweb:version3
```

- `-p 3000:80` : redirige le port **3000 de l'hôte** vers le port **80 du conteneur** (`-p hôte:conteneur`).
- `-d` : exécute le conteneur en arrière-plan (mode détaché).

2- Consultez l'adresse `http://localhost:3000` dans votre navigateur.

#### Méthode 2 : réseau `host`

Avec l'option `--network=host`, le conteneur partage directement la pile réseau de la machine hôte : il n'a plus d'IP propre et ses ports sont ceux de l'hôte.

3- Démarrez, en arrière-plan, un conteneur `webcontainer5` :

```bash
docker run -d --network=host --name webcontainer5 helloweb:version3
```

4- Consultez l'adresse `http://localhost:80` dans votre navigateur.

> [!WARNING]
> - Avec `--network=host`, l'option `-p` est ignorée : c'est pourquoi le port 80 de l'hôte devait être libre.
> - Ce mode est pleinement supporté sous Linux ; sous Docker Desktop, il doit être activé dans les paramètres.

**Question :** comparez les deux méthodes (isolation, conflits de ports, nombre de conteneurs pouvant tourner simultanément).

### 2.6. Couches de l'image et publication

1- Observez les couches de l'image :

```bash
docker history helloweb:version3
```

> [!NOTE]
> `docker history` affiche les couches de l'image, **de la plus récente (en haut) à la plus ancienne (en bas)** :
> - les lignes du **bas** proviennent de l'image de base `ubuntu:latest` : elles ont été construites par Canonical, pas par votre Dockerfile ;
> - les lignes du **haut** correspondent aux instructions de votre Dockerfile, dans l'ordre (`RUN`, `WORKDIR`, `COPY`, `EXPOSE`, `CMD`) ;
> - la colonne **SIZE** indique ce que chaque instruction a ajouté : seules `RUN`, `COPY` et `ADD` ajoutent des fichiers, les autres (`EXPOSE`, `CMD`, `WORKDIR`...) ne modifient que les métadonnées de l'image (0 B) ;
> - la mention `<missing>` dans la colonne IMAGE n'est pas une erreur : la couche existe bien, mais aucune image intermédiaire n'y est associée localement.
>
> Contrairement à une image créée avec `docker commit` (Lab 2), dont l'historique ne montre qu'une étape opaque, une image construite avec un Dockerfile garde la trace de chaque instruction : elle est lisible, reproductible et facile à modifier.


---

## 3. Application Web Python avec Flask

Flask est un framework Web minimaliste écrit en Python, qui permet de développer facilement des applications Web et des API REST.

**Étape 1 : Code de l'application**

Créez le fichier `app.py` :

```python
# app.py
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello From Docker Python Web App!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Ce code définit une route `/` qui renvoie un message texte et lance le serveur sur le port 5000, en écoutant sur toutes les interfaces (`host='0.0.0.0'`).

Créez également le fichier `requirements.txt` :

```text
Flask
```

**Étape 2 : Dockerfile**

Écrivez un Dockerfile qui :

- utilise l'image officielle `python:3.11-slim` ;
- utilise le répertoire de travail `/app` ;
- copie **d'abord** `requirements.txt` et installe les dépendances (`pip install --no-cache-dir -r requirements.txt`), **puis** copie le code source ;
- documente le port 5000 ;
- lance l'application avec `python app.py`.

**Étape 3 : Construction et exécution**

1. Construisez l'image `helloweb:flask`.
2. Démarrez, en arrière-plan, un conteneur nommé `flaskapp`, en publiant le port 5000 du conteneur sur le port 5000 de l'hôte.
3. Vérifiez l'application à l'adresse `http://localhost:5000`.

**Questions**

1. Pourquoi copie-t-on `requirements.txt` et installe-t-on les dépendances **avant** de copier le reste du code ? Vérifiez votre réponse : modifiez le message dans `app.py`, reconstruisez l'image et relevez les étapes marquées `CACHED`.
2. Que se passe-t-il si l'on remplace `host='0.0.0.0'` par `host='127.0.0.1'` dans `app.py` ? Testez et expliquez.
3. Comment rendre cette application accessible depuis une autre machine, en dehors de votre ordinateur ?

