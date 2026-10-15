

# LAB01 : Introduction à Docker et manipulation des conteneurs


---
## Objectifs

- Installer Docker Engine sous Ubuntu ;
- rechercher, télécharger, lister et supprimer des **images** ;
- créer, démarrer, arrêter, inspecter et supprimer des **conteneurs** ;
- exécuter des commandes dans un conteneur ;
- vérifier qu'un conteneur partage le **noyau** de la machine hôte ;
- analyser la structure de l'image `hello-world` (code source et Dockerfile).

## Sommaire

1. [Installation de Docker](#1-installation-de-docker)
2. [Utilisation de la commande `docker`](#2-utilisation-de-la-commande-docker)
3. [Gestion des images](#3-gestion-des-images)
4. [Gestion des conteneurs](#4-gestion-des-conteneurs)
5. [Conteneurs et noyau de l'hôte](#5-conteneurs-et-noyau-de-lhôte)
6. [L'image `hello-world`](#6-limage-hello-world)
7. [Aide-mémoire](#7-aide-mémoire)
---

## 1. Installation de Docker

### 1.1 Installation de Docker Engine sous Ubuntu

 Référence officielle : [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/) (consultez-la pour la liste à jour des versions d'Ubuntu supportées).

#### Étape 1 : Configurer le dépôt `apt` de Docker

```bash
# Ajouter la clé GPG officielle de Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Ajouter le dépôt aux sources apt
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

#### Étape 2 : Installer Docker

```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

|Paquet|Rôle|
|---|---|
|`docker-ce`|Le démon Docker (`dockerd`)|
|`docker-ce-cli`|Le client en ligne de commande (`docker`)|
|`containerd.io`|Le runtime qui exécute réellement les conteneurs|
|`docker-buildx-plugin`|Le constructeur d'images moderne (`docker buildx`)|
|`docker-compose-plugin`|Docker Compose (`docker compose`), utilisé dans les prochains labs|
#### Étape 3 : Tester l'installation

```bash
sudo docker run hello-world
```

**Résultat attendu :**

```text
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
c1ec31eb5944: Pull complete
Digest: sha256:d211f485f2dd1dee407a80973c8f129f00d54604d2c90732e8e320e5038a0348
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

> [!TIP] Vérifiez la présence de la ligne **`Hello from Docker!`**. Les identifiants de couche (`c1ec31eb5944`) et le `Digest` seront différents chez vous : c'est normal.

### 1.2 Utiliser Docker sans `sudo`

Par défaut, seuls l'utilisateur `root` et les membres du groupe `docker` peuvent communiquer avec le démon Docker. Sans ces droits, vous obtenez l'erreur suivante :

```text
docker: permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: ...
```

Pour ajouter l'utilisateur courant (`$USER`) au groupe `docker` :

```bash
sudo usermod -aG docker $USER
newgrp docker        # applique le nouveau groupe dans le terminal courant
```

Vérifiez ensuite que la commande fonctionne **sans** `sudo` :
```bash
docker run hello-world
```

> [!NOTE] `newgrp` n'agit que sur le terminal courant. Pour que le changement s'applique partout, déconnectez-vous puis reconnectez-vous (ou redémarrez la machine).

---
## 2. Utilisation de la commande `docker`

La syntaxe générale est :

```bash
docker [options] <commande> [arguments]
```

1. Afficher toutes les commandes disponibles :
    
    ```bash
    docker
    ```
    
2. Afficher l'aide d'une commande précise (par exemple `run`) :
    
    ```bash
    docker run --help
    ```
    
3. Afficher les versions du client et du serveur :
    
    ```bash
    docker version
    ```
    

> [!TIP] Docker propose deux syntaxes équivalentes : une forme courte historique (`docker images`, `docker ps`) et une forme regroupée par objet (`docker image ls`, `docker container ls`). 

---

## 3. Gestion des images

Une image est un modèle en lecture seule (système de fichiers + métadonnées) à partir duquel on crée des conteneurs.

### 3.1 Lister les images locales

```bash
docker images
```

**Résultat attendu :**

```text
REPOSITORY    TAG       IMAGE ID       CREATED        SIZE
hello-world   latest    d2c94e258dcb   -- months ago  13.3kB
```

| Colonne      | Signification                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `REPOSITORY` | Nom de l'image dans le registre                                                                  |
| `TAG`        | Version de l'image (`latest` par défaut)                                                         |
| `IMAGE ID`   | Identifiant unique de l'image                                                                    |
| `CREATED`    | Date de construction de l'image par son auteur (et non date de téléchargement sur votre machine) |
| `SIZE`       | Taille de l'image                                                                                |

### 3.2 Rechercher une image

On peut rechercher une image sur le registre **Docker Hub**, soit via son site web ([https://hub.docker.com](https://hub.docker.com/)), soit en ligne de commande. La recherche porte sur le nom de l'image, le nom de son auteur ou sa description :

```bash
docker search <nom_image>
```

**Exemple :**

```bash
docker search centos
```

**Résultat attendu (extrait) :**

```text
NAME                       DESCRIPTION                                     STARS     OFFICIAL
centos                     DEPRECATED; The official build of CentOS.       7700      [OK]
...
```

|Colonne|Signification|
|---|---|
|`NAME`|Nom de l'image|
|`DESCRIPTION`|Description fournie par l'auteur|
|`STARS`|Nombre d'étoiles (indicateur de popularité)|
|`OFFICIAL`|`[OK]` si c'est une image officielle maintenue par Docker|

**Images officielles et images d'utilisateurs :**

- Les **images officielles** ont un nom **sans préfixe** (`centos`, `ubuntu`, `nginx`). Elles sont maintenues par Docker et les éditeurs, et leurs définitions sont publiées dans le dépôt GitHub [`docker-library/official-images`](https://github.com/docker-library/official-images).
- Les **images d'utilisateurs** sont publiées par des personnes ou des organisations. Leur nom est **préfixé** par celui de leur propriétaire, séparé par `/`. Par exemple, `ansible/centos7-ansible` est l'image `centos7-ansible` publiée par le compte `ansible`.

Pour ne garder que les images ayant au moins 5 étoiles :

```bash
docker search --filter=stars=5 centos
```

### 3.3 Télécharger une image

```bash
docker pull centos
```

**Questions :**

1. Observez le message affiché par Docker. Quel message d'erreur obtenez-vous ?
2. Expliquez pourquoi cette erreur se produit.
3. Quelle version de l'image CentOS pouvez-vous utiliser à la place pour corriger le problème ?

Pour la suite du TP, téléchargez l'image `centos:centos7` :

```bash
docker pull centos:centos7
```
### 3.4 Supprimer une image

Pour supprimer une image locale, on utilise `docker rmi` avec son nom ou son identifiant :

```bash
docker rmi <ID_ou_nom_image>
```

**Exemple :**

```bash
docker rmi hello-world
```

> [!WARNING] Docker refuse de supprimer une image utilisée par un conteneur, **même arrêté**. Vous obtenez alors une erreur `conflict: unable to remove repository reference ...`. Supprimez d'abord le conteneur concerné, ou forcez la suppression avec `docker rmi -f`.

Pour supprimer **toutes** les images locales :

```bash
docker rmi $(docker images -a -q)
```

> [!TIP] `docker images -q` n'affiche que les identifiants. Le résultat est passé en argument à `docker rmi` grâce à la substitution `$( ... )`.

---
### 3.5 Inspecter une image

Docker fournit deux commandes pour examiner une image en détail :

| Commande                       | Rôle                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `docker image inspect <image>` | Affiche toutes les métadonnées de l'image au format JSON (configuration, architecture, digest, couches…) |
| `docker history <image>`       | Affiche les couches de l'image et l'instruction du Dockerfile qui a créé chacune d'elles                 |

Si vous avez supprimé l'image `hello-world` à l'étape précédente, téléchargez-la de nouveau :

```bash
docker pull hello-world
```

#### Exercice

**1.** Affichez les métadonnées complètes de l'image `hello-world` :

```bash
docker image inspect hello-world
```

La sortie est longue. L'option `--format` permet d'extraire un champ précis. Exécutez les commandes suivantes et notez les résultats :

```bash
docker image inspect hello-world --format '{{.Config.Cmd}}'
docker image inspect hello-world --format '{{.Architecture}}'
docker image inspect hello-world --format '{{.RepoDigests}}'
```

- a) Quelle commande est exécutée au démarrage d'un conteneur créé à partir de cette image ? À quelle instruction du Dockerfile (section 6.2) correspond-elle ?
- b) Pour quelle architecture processeur l'image a-t-elle été téléchargée ?
- c) Comparez le digest obtenu avec celui affiché lors du `docker pull`. Que constatez-vous ?

**2.** Affichez l'historique de l'image `hello-world` :

```bash
docker history hello-world
```

**Résultat attendu :**

```text
IMAGE          CREATED         CREATED BY                       SIZE      COMMENT
d2c94e258dcb   18 months ago   CMD ["/hello"]                   0B        buildkit.dockerfile.v0
<missing>      18 months ago   COPY hello / # buildkit          13.3kB    buildkit.dockerfile.v0
```

- a) Retrouvez la correspondance entre chaque ligne et les instructions du Dockerfile de `hello-world`.
- b) Pourquoi la ligne `CMD` a-t-elle une taille de `0B` ?
- c) Pourquoi n'y a-t-il aucune ligne correspondant à l'instruction `FROM scratch` ?

**3.** Exécutez `docker history ubuntu` et comparez avec `hello-world`. Combien de couches compte l'image `ubuntu` ? Quelle est sa taille totale ?

### 3.6 Pour aller plus loin

D'autres commandes de gestion des images  :

| Commande                                 | Rôle                                               |
| ---------------------------------------- | -------------------------------------------------- |
| `docker build -t <nom>:<tag> .`          | Construit une image à partir d'un Dockerfile       |
| `docker tag <image> <nouveau_nom>:<tag>` | Ajoute un nouveau nom ou tag à une image existante |
| `docker login`                           | S'authentifie auprès d'un registre                 |
| `docker push <nom>:<tag>`                | Publie une image sur un registre (Docker Hub…)     |
| `docker save -o <fichier>.tar <image>`   | Exporte une image vers une archive `.tar`          |
| `docker load -i <fichier>.tar`           | Importe une image depuis une archive `.tar`        |

## 4. Gestion des conteneurs

Un **conteneur** est une instance en cours d'exécution (ou arrêtée) d'une image. On peut créer plusieurs conteneurs à partir de la même image.

### 4.1 Créer un conteneur

```bash
docker create --name MyFirstContainer centos:centos7
```

Docker affiche l'identifiant complet du conteneur créé. Le conteneur **existe** mais n'est **pas démarré**.

### 4.2 Lister les conteneurs

Conteneurs **actifs** uniquement :

```bash
docker ps
```

Le conteneur que vous venez de créer n'apparaît pas, car il n'est pas démarré.

**Tous** les conteneurs, quel que soit leur état :

```bash
docker ps -a
```

**Résultat attendu :**

```text
CONTAINER ID   IMAGE            COMMAND       CREATED         STATUS    PORTS     NAMES
c8863573b026   centos:centos7   "/bin/bash"   6 seconds ago   Created             MyFirstContainer
```

|Colonne|Signification|
|---|---|
|`CONTAINER ID`|Identifiant unique, attribué à la **création** du conteneur. Deux conteneurs créés à partir de la même image ont des identifiants différents.|
|`IMAGE`|Image (et tag) utilisée pour créer le conteneur|
|`COMMAND`|Commande lancée au démarrage, définie par l'instruction `CMD` du Dockerfile de l'image|
|`CREATED`|Date de création du conteneur|
|`STATUS`|État du conteneur : `Created` (créé, jamais démarré), `Up` (en cours d'exécution), `Exited (code)` (arrêté, avec le code de sortie du processus)|
|`PORTS`|Ports réseau publiés (aucun ici)|
|`NAMES`|Nom du conteneur, plus pratique à manipuler que son identifiant. Si `--name` n'est pas précisé, Docker génère un nom aléatoire.|

### 4.3 Démarrer un conteneur

```bash
docker start <ID_ou_nom_conteneur>
```

**Exemple :**

```bash
docker start MyFirstContainer
# ou, avec l'identifiant (le vôtre sera différent) :
docker start c8863573b026
```

Vérifiez son état :

```bash
docker ps -a
```

**Résultat attendu :**

```text
CONTAINER ID   IMAGE            COMMAND       CREATED          STATUS                     PORTS     NAMES
c8863573b026   centos:centos7   "/bin/bash"   2 minutes ago    Exited (0) 3 seconds ago             MyFirstContainer
```

> [!IMPORTANT] Le conteneur s'est **arrêté immédiatement** avec le code `0` (fin normale). Un conteneur ne vit que tant que son processus principal tourne. Ici, ce processus est `/bin/bash` : sans terminal interactif attaché, il n'a rien à lire et se termine aussitôt. 

> [!TIP] Il suffit de taper les premiers caractères d'un identifiant, tant qu'ils sont uniques : `docker start c88` fonctionne.

### 4.4 Arrêter un conteneur

```bash
docker stop MyFirstContainer
```

`docker stop` envoie d'abord un signal d'arrêt propre (`SIGTERM`) au processus principal, puis le force (`SIGKILL`) après 10 secondes s'il ne s'est pas arrêté.

### 4.5 Créer et démarrer un conteneur en une seule commande

`docker run` combine `docker pull` (si l'image est absente), `docker create` et `docker start` :

```bash
docker run centos:centos7
```

Lancez `docker ps -a` : un nouveau conteneur, avec un nom généré aléatoirement, apparaît avec l'état `Exited (0)`, pour la même raison qu'en 4.3.

### 4.6 Supprimer un conteneur

Supprimer un conteneur arrêté (par nom ou identifiant) :

```bash
docker rm <ID_ou_nom_conteneur>
```

Supprimer plusieurs conteneurs :

```bash
docker rm <conteneur_1> <conteneur_2>
```

Par défaut, Docker refuse de supprimer un conteneur en cours d'exécution. Pour le supprimer quel que soit son état :

```bash
docker rm -f <ID_ou_nom_conteneur>
```

Supprimer automatiquement un conteneur dès qu'il s'arrête, grâce à l'option `--rm` :

```bash
docker run --rm <nom_image>
```

Supprimer tous les conteneurs **arrêtés** :

```bash
docker rm $(docker ps -a -q)
# ou, plus simplement :
docker container prune
```

Supprimer **tous** les conteneurs, y compris ceux en cours d'exécution :

```bash
docker rm -f $(docker ps -a -q)
```
### 4.7 Exécuter une commande dans un conteneur

Il existe trois façons d'exécuter une commande dans un conteneur.

#### a) Passer la commande au démarrage

La commande indiquée après le nom de l'image **remplace** la commande par défaut (`CMD`) :

```bash
docker run --rm ubuntu echo "Bonjour depuis un conteneur"
```

**Résultat attendu :**

```text
Bonjour depuis un conteneur
```

#### b) Démarrer le conteneur en mode interactif (`-it`)

- `-i` (_interactive_) garde l'entrée standard ouverte ;
- `-t` (_tty_) alloue un pseudo-terminal.

```bash
docker run -it --name test-ubuntu ubuntu bash
```

Vous obtenez un invite de commande **à l'intérieur** du conteneur :

```text
root@4f1e2a9b8c7d:/#
```

Testez quelques commandes, puis quittez :

```bash
cat /etc/os-release
ls /
exit
```
#### c) Utiliser `docker exec` sur un conteneur actif

On démarre d'abord un conteneur qui reste actif en arrière-plan (`-d`, _detached_), grâce à une commande qui ne se termine pas :

```bash
docker run -d --name test-exec ubuntu sleep infinity
```

On peut ensuite y exécuter des commandes :

```bash
docker exec test-exec cat /etc/os-release
```

Ou ouvrir un terminal interactif :

```bash
docker exec -it test-exec bash
```

Quittez avec `exit` : cette fois, le conteneur **reste actif**, car son processus principal (`sleep infinity`) continue de tourner. Vérifiez-le avec `docker ps`, puis supprimez-le :

```bash
docker rm -f test-exec test-ubuntu
```

---

## 5. Conteneurs et noyau de l'hôte

Dans cette expérience, on compare des conteneurs basés sur deux distributions différentes avec la machine hôte.

### 5.1 Version du noyau

Lancez la commande `uname -a` (informations sur le noyau) dans deux conteneurs basés sur `ubuntu` et `centos:centos7` :

**Premier conteneur (Ubuntu) :**

```bash
docker run --rm ubuntu uname -a
```

```text
Linux 3f2a9c1b7e4d 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux
```

**Deuxième conteneur (CentOS 7) :**

```bash
docker run --rm centos:centos7 uname -a
```

```text
Linux 9b7d4e2f1a6c 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux
```

**Sur la machine hôte**, dans un terminal normal :

```bash
uname -a
```

```text
Linux ubuntu-vm 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux
```

> [!NOTE]
> La **version du noyau** est identique dans les deux conteneurs et sur l'hôte, alors que l'un des conteneurs est basé sur CentOS : **les conteneurs partagent le noyau de la machine hôte**. Une image ne contient pas de noyau, seulement les fichiers d'une distribution (bibliothèques, outils, gestionnaire de paquets).
>
> En revanche, le **nom d'hôte** (deuxième champ de la sortie) est différent dans chaque conteneur : il correspond à l'identifiant du conteneur et est isolé de celui de la machine hôte, grâce aux *namespaces* Linux.
### 5.2 Distribution

Affichez maintenant la distribution de chaque environnement :

```bash
docker run --rm ubuntu cat /etc/os-release | head -n 2
docker run --rm centos:centos7 cat /etc/os-release | head -n 2
cat /etc/os-release | head -n 2
```

```text
PRETTY_NAME="Ubuntu 24.04.1 LTS"
NAME="Ubuntu"
NAME="CentOS Linux"
VERSION="7 (Core)"
PRETTY_NAME="Ubuntu 24.04.1 LTS"
NAME="Ubuntu"
```

> [!NOTE]
> La **distribution** est différente dans chaque environnement : chaque conteneur dispose de son propre système de fichiers, fourni par son image. Un conteneur CentOS peut donc s'exécuter sur un hôte Ubuntu, puisque seul le noyau est partagé.


---
## 6. L'image `hello-world`

### 6.1 Exécuter `hello-world`

Comme toute technologie, Docker dispose de son exemple « Hello World » : un conteneur qui affiche un message de bienvenue, puis s'arrête. Il sert à vérifier que la plateforme fonctionne.

```bash
docker run hello-world
```

**Résultat attendu :**

```text
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
2db29710123e: Pull complete
Digest: sha256:37a0b92b08d4919615c3ee023f7ddb068d12b8387475d64c622ac30f45c29c51
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

<details> <summary>Afficher la sortie complète</summary>

```text
Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

</details>

> [!NOTE] Si l'image `hello-world` est encore présente localement, les quatre premières lignes (téléchargement) n'apparaissent pas.

**Ce qui se passe lors d'un `docker run` :**

1. Le client `docker` transmet la demande au **démon Docker**.
2. Le démon cherche l'image dans le **dépôt local**. Si elle est absente, il la télécharge depuis le registre par défaut, **Docker Hub**.
3. Le démon **crée un nouveau conteneur** à partir de l'image et lance sa commande par défaut.
4. La sortie du programme est renvoyée au client, qui l'affiche dans votre terminal. Le programme se termine, et le conteneur s'arrête.

### 6.2 Anatomie de l'image `hello-world`

- Page de l'image sur Docker Hub : [https://hub.docker.com/_/hello-world](https://hub.docker.com/_/hello-world)
- Code source et Dockerfile : [https://github.com/docker-library/hello-world](https://github.com/docker-library/hello-world)

#### Code source

Le dépôt GitHub contient le fichier source `hello.c`, à la racine de la branche par défaut (`master`) :

[Dépôt GitHub docker-library/hello-world, avec le fichier hello.c entouré](https://claude.ai/chat/figs/fig1.png)

Ce programme C écrit le message de bienvenue sur la sortie standard. Extrait du fichier `hello.c` :

```c
#include <sys/syscall.h>
#include <unistd.h>

#ifndef DOCKER_IMAGE
	#define DOCKER_IMAGE "hello-world"
#endif

#ifndef DOCKER_GREETING
	#define DOCKER_GREETING "Hello from Docker!"
#endif

#ifndef DOCKER_ARCH
	#define DOCKER_ARCH "amd64"
#endif

const char message[] =
	"\n"
	DOCKER_GREETING "\n"
	"This message shows that your installation appears to be working correctly.\n"
	/* ... suite du message ... */
	"\n";

int main() {
	syscall(SYS_write, STDOUT_FILENO, message, sizeof(message) - 1);
	return 0;
}
```

#### Dockerfile

Le dépôt contient un répertoire par architecture processeur. Ouvrez les répertoires [`amd64/hello-world`](https://github.com/docker-library/hello-world/tree/master/amd64/hello-world) et [`i386/hello-world`](https://github.com/docker-library/hello-world/tree/master/i386/hello-world) :

[Contenu du répertoire amd64/hello-world : Dockerfile et binaire hello](https://claude.ai/chat/figs/fig2.png)

[Contenu du répertoire i386/hello-world : Dockerfile et binaire hello](https://claude.ai/chat/figs/fig3.png)

Chaque répertoire contient un **Dockerfile** et le **binaire compilé** `hello` pour cette architecture. Contenu du Dockerfile :

```dockerfile
FROM scratch
COPY hello /
CMD ["/hello"]
```

|Instruction|Explication|
|---|---|
|`FROM scratch`|Définit l'image de base. `scratch` est une image **vide** : aucun système de fichiers, aucune distribution.|
|`COPY hello /`|Copie le binaire `hello` à la racine (`/`) du système de fichiers de l'image.|
|`CMD ["/hello"]`|Définit la commande exécutée au démarrage du conteneur : le programme `/hello`.|

> [!NOTE] Une même image peut exister pour plusieurs architectures (amd64, arm64, i386…). Lors d'un `docker pull`, Docker télécharge automatiquement la variante qui correspond à votre processeur. Sur un Mac Apple Silicon, par exemple, c'est la variante `arm64v8` qui est utilisée.

---
## 7. Aide-mémoire

|Action|Commande|
|---|---|
|Lister les images locales|`docker images`|
|Rechercher une image|`docker search <nom>`|
|Télécharger une image|`docker pull <nom>:<tag>`|
|Supprimer une image|`docker rmi <image>`|
|Créer un conteneur|`docker create --name <nom> <image>`|
|Créer et démarrer un conteneur|`docker run <image>`|
|Démarrer en mode interactif|`docker run -it <image> bash`|
|Démarrer en arrière-plan|`docker run -d <image>`|
|Supprimer à l'arrêt|`docker run --rm <image>`|
|Lister les conteneurs actifs|`docker ps`|
|Lister tous les conteneurs|`docker ps -a`|
|Démarrer / arrêter un conteneur|`docker start <c>` / `docker stop <c>`|
|Exécuter une commande dans un conteneur actif|`docker exec -it <c> <commande>`|
|Supprimer un conteneur|`docker rm <c>` (`-f` pour forcer)|
|Supprimer les conteneurs arrêtés|`docker container prune`|
|Supprimer les images inutilisées|`docker image prune -a`|

---