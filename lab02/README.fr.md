# LAB 02 : Introduction à la création d'images Docker



## Objectifs

1. Comprendre le processus de création d'une image Docker à partir d'un code source classique.
2. Utiliser différentes approches de construction d'images :
   - **À partir d'une image de base**, avec la commande `docker build` (et un `Dockerfile`).
   - **À partir d'un conteneur existant**, avec la commande `docker commit`.
3. Publier une image sur le registre **Docker Hub**.

## Prérequis

- Docker Engine installé et fonctionnel (`docker version`).
- `gcc` installé sur la machine locale (`sudo apt install -y gcc`) pour la partie 1.
- Un compte Docker Hub pour la partie 3.

## Sommaire

1. [Développement d'une application « hello » sur la machine locale](#1-développement-dune-application--hello--sur-la-machine-locale)
2. [Construction d'une image Docker « hello »](#2-construction-dune-image-docker--hello-)
   - 2.1 [À partir d'un Dockerfile : `docker build`](#21-à-partir-dun-dockerfile--docker-build)
   - 2.2 [À partir d'un conteneur : `docker commit`](#22-à-partir-dun-conteneur--docker-commit)
   - 2.3 [Conclusion](#23-conclusion)
3. [Publication de l'image sur Docker Hub](#3-publication-de-limage-sur-docker-hub)

---

## 1. Développement d'une application « hello » sur la machine locale

**1.** Créez un répertoire `hello_directory` qui contiendra votre code source :

```bash
mkdir hello_directory
cd hello_directory
```

**2.** Dans ce répertoire, créez un fichier `hello.c` qui affiche le message `Hello From Docker LAB !` :

```bash
nano hello.c
```

```c
#include <stdio.h>

int main(void)
{
    printf("Hello From Docker LAB !\n");
    return 0;
}
```

**3.** Compilez le code source avec `gcc` pour produire l'exécutable `hello` :

```bash
gcc -o hello -static hello.c
```

>  L'option `-static` produit un exécutable **lié statiquement** : toutes les bibliothèques nécessaires (dont la libc) sont intégrées dans le binaire. Il n'a donc besoin d'aucune bibliothèque dynamique au moment de l'exécution. Ce point sera essentiel pour la méthode 2 (image `scratch`).

**4.** Affichez le contenu du répertoire : un fichier exécutable `hello` a été ajouté après la compilation.

```bash
ls
```

```text
hello  hello.c
```

**5.** Exécutez le programme :

```bash
./hello
```

```text
Hello From Docker LAB !
```

---

## 2. Construction d'une image Docker « hello »

### 2.1. À partir d'un Dockerfile : `docker build`

L'objectif est de créer une image Docker `hello` qui affiche le message `Hello From Docker LAB !` dans le terminal.

- Pour créer cette image, on rédige un fichier **`Dockerfile`**.
- Le Dockerfile décrit comment obtenir une image exécutable de l'application : l'image de base, les dépendances à installer, les fichiers à copier et la commande à lancer au démarrage du conteneur.
- La première instruction (`FROM`) indique l'**image de base**, c'est-à-dire le système de fichiers de départ sur lequel on construit l'application.

Pour notre application, deux approches sont possibles :

| Méthode | Point de départ | Image de base | Principe |
|---|---|---|---|
| 1 | Code source `hello.c` | `ubuntu` | On installe `gcc` dans l'image et on compile le programme pendant le build. |
| 2 | Exécutable `hello` (déjà compilé) | `scratch` (image vide) | Le binaire statique n'a aucune dépendance : le noyau de l'hôte suffit pour l'exécuter. |

#### 2.1.1. Méthode 1 : image de base `ubuntu`

Le Dockerfile doit enchaîner les actions suivantes :

1. Partir d'un système de fichiers Ubuntu ;
2. Installer le compilateur `gcc` ;
3. Copier le code source `hello.c` dans l'image ;
4. Compiler le code source ;
5. Définir `/hello` comme commande de démarrage.

##### Étape 1 : préparation du Dockerfile

**1.** Créez et éditez le fichier `Dockerfile` (dans `hello_directory`) :

```bash
nano Dockerfile
```

**2.** Écrivez-y le contenu suivant :

```dockerfile
FROM ubuntu
RUN apt-get update && apt-get install -y gcc
COPY hello.c /
RUN gcc -o /hello /hello.c
CMD ["/hello"]
```

##### Étape 2 : création de l'image avec `docker build`

**3.** Créez une image nommée `hello:version1` à partir du Dockerfile :

```bash
docker build -t hello:version1 .
```

> N'oubliez pas le **point** (`.`) en fin de ligne : il désigne le **contexte de build**, c'est-à-dire le répertoire courant qui contient le `Dockerfile` et les fichiers à copier.

**4.** Vérifiez que l'image a bien été créée :

```bash
docker images
```

```text
REPOSITORY   TAG        IMAGE ID       CREATED         SIZE
hello        version1   bbd500eb2345   5 seconds ago   251MB
ubuntu       latest      ba6acccedd29   12 days ago     78.1MB
```

##### Étape 3 : exécution d'un conteneur à partir de l'image

**5.** Créez et démarrez un conteneur à partir de l'image `hello:version1` :

```bash
docker run hello:version1
```

```text
Hello From Docker LAB !
```

#### 2.1.2. Méthode 2 : image de base `scratch` (image vide)

On utilise directement l'exécutable `hello` déjà généré à la partie 1 :

- ce binaire statique ne nécessite aucun système de fichiers de base pour s'exécuter ;
- l'image de base est donc l'image vide : **`scratch`**.

> Le binaire est compilé sur votre machine : il doit correspondre à l'architecture de l'hôte Docker (par ex. `x86_64` ou `arm64`). S'il n'est pas compilé avec `-static`, le conteneur échouera car `scratch` ne contient aucune bibliothèque.

##### Étape 1 : préparation du Dockerfile

**1.** Éditez à nouveau le fichier `Dockerfile` :

```bash
nano Dockerfile
```

**2.** Remplacez son contenu par :

```dockerfile
FROM scratch
COPY hello /
CMD ["/hello"]
```

> Pour conserver les deux Dockerfiles, vous pouvez nommer celui-ci `Dockerfile.scratch` et le désigner avec l'option `-f` :
> `docker build -f Dockerfile.scratch -t hello:version2 .`

##### Étape 2 : création de l'image avec `docker build`

**3.** Créez une image nommée `hello:version2` :

```bash
docker build -t hello:version2 .
```

**4.** Vérifiez que l'image a bien été créée :

```bash
docker images
```

```text
REPOSITORY   TAG        IMAGE ID       CREATED          SIZE
hello        version2   c32e701ce11c   8 seconds ago    845kB
hello        version1   bbd500eb2345   42 minutes ago   251MB
ubuntu       latest      ba6acccedd29   12 days ago      78.1MB
```

##### Étape 3 : exécution d'un conteneur à partir de l'image

**5.** Créez et démarrez un conteneur à partir de l'image `hello:version2` :

```bash
docker run hello:version2
```

```text
Hello From Docker LAB !
```

### 2.2. À partir d'un conteneur : `docker commit`

Dans cette partie, on construit la même application en modifiant manuellement un conteneur Ubuntu, puis on enregistre ces modifications dans une nouvelle image.

#### Étape 1 : création et démarrage d'un conteneur

**1.** Créez un conteneur à partir de l'image `ubuntu`, en mode interactif (`-it`), et nommez-le `hello_container` :

```bash
docker create -it --name hello_container ubuntu
```

**2.** Démarrez le conteneur :

```bash
docker start hello_container
```

#### Étape 2 : modification du conteneur (installation de `gcc`)

**3.** Ouvrez une session `bash` dans le conteneur :

```bash
docker exec -it hello_container /bin/bash
```

Les commandes suivantes sont exécutées **à l'intérieur du conteneur** (en tant que `root`).

**4.** Mettez à jour la liste des paquets :

```bash
apt-get update
```

**5.** Installez `gcc` et l'éditeur `nano` (absent de l'image Ubuntu minimale) :

```bash
apt-get install -y gcc nano
```

#### Étape 3 : création de l'application

**6.** Créez, à la racine du conteneur, un répertoire `hello_directory` qui contiendra le code source :

```bash
cd /
mkdir hello_directory
cd hello_directory
```

**7.** Créez le fichier `hello.c` :

```bash
nano hello.c
```

```c
#include <stdio.h>

int main(void)
{
    printf("Hello From Docker LAB !\n");
    return 0;
}
```

**8.** Compilez le code source :

```bash
gcc -o hello hello.c
```

**9.** Exécutez le programme :

```bash
./hello
```

```text
Hello From Docker LAB !
```

**10.** Quittez le conteneur :

```bash
exit
```

#### Étape 4 : enregistrement des modifications dans une image (`docker commit`)

**11.** Pour conserver de façon permanente les modifications apportées au conteneur, créez une image nommée `hello:version3` à partir de `hello_container` :

```bash
docker commit hello_container hello:version3
```

**12.** Vérifiez que l'image a bien été créée :

```bash
docker images
```

```text
REPOSITORY   TAG        IMAGE ID       CREATED          SIZE
hello        version3   c54c94914fe1   8 seconds ago    252MB
hello        version2   c32e701ce11c   50 minutes ago   845kB
hello        version1   bbd500eb2345   2 hours ago      251MB
ubuntu       latest     ba6acccedd29   12 days ago      78.1MB
```

#### Étape 5 : exécution de l'image dans un conteneur

**13.** Instanciez un conteneur à partir de cette image.

> L'image `hello:version3` hérite de la commande par défaut de l'image Ubuntu (`/bin/bash`). Pour lancer l'application, il faut donc passer explicitement la commande `/hello_directory/hello` au démarrage du conteneur :

```bash
docker run hello:version3 /hello_directory/hello
```

```text
Hello From Docker LAB !
```

> Pour aller plus loin : l'option `--change` de `docker commit` permet de définir la commande par défaut au moment du commit :

```bash
docker commit --change 'CMD ["/hello_directory/hello"]' hello_container hello:version4
docker run hello:version4
```

### 2.3. Conclusion

**1.** Affichez la liste des images disponibles dans le dépôt local et comparez la taille des trois versions de l'image `hello` :

```bash
docker images hello
```

**2.** Interprétez le résultat.

> - Pourquoi `hello:version2` est-elle environ 300 fois plus petite que les deux autres ?
> - Qu'est-ce que `hello:version1` et `hello:version3` contiennent de plus que ce qui est strictement nécessaire à l'exécution du programme ?
> - Laquelle des deux méthodes (`docker build` ou `docker commit`) est reproductible, documentée et facile à maintenir ? Pourquoi ?

---

## 3. Publication de l'image sur Docker Hub

Pour publier votre image sur le registre **Docker Hub**, vous devez disposer d'un compte : créez-le sur <https://hub.docker.com/>.

### Étape 1 : connexion à Docker Hub

**1.** Une fois votre compte créé, connectez-vous depuis le terminal :

```bash
docker login
```

Suivez les instructions affichées (connexion via le navigateur ou saisie de votre identifiant Docker et d'un mot de passe / *Personal Access Token*). En cas de succès, le message suivant s'affiche :

```text
Login Succeeded
```


### Étape 2 : ajout d'un tag à l'image

Pour être publiée, une image doit être nommée sous la forme `<votre_identifiant_docker>/<nom_image>:<tag>`.

**2.** Repérez l'image à publier (par exemple `hello:version2`) et son identifiant :

```bash
docker images hello
```

**3.** Ajoutez-lui un tag à votre nom, avec le tag `latest` (on peut utiliser le nom de l'image ou son `IMAGE ID`) :

```bash
docker tag hello:version2 <votre_identifiant_docker>/hello:latest
# ou bien, avec l'IMAGE ID :
# docker tag c32e701ce11c <votre_identifiant_docker>/hello:latest
```

### Étape 3 : publication de l'image

**4.** Publiez votre image :

```bash
docker push <votre_identifiant_docker>/hello:latest
```

**5.** Rendez-vous sur <https://hub.docker.com/> et consultez votre image. Vous pouvez aussi vérifier qu'elle est récupérable depuis n'importe quelle machine :

```bash
docker run <votre_identifiant_docker>/hello:latest
```
