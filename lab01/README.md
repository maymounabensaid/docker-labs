# LAB01: Introduction to Docker and Container Management

🇫🇷 [Version française](MyVault/Docker/lab01/README.fr.md)

---

## Objectives

- Install Docker Engine on Ubuntu;
- search, download, list and remove **images**;
- create, start, stop, inspect and remove **containers**;
- run commands inside a container;
- verify that a container shares the host machine's **kernel**;
- analyze the structure of the `hello-world` image (source code and Dockerfile).

## Table of Contents

1. [Installing Docker](#1-installing-docker)
2. [Using the `docker` command](#2-using-the-docker-command)
3. [Managing images](#3-managing-images)
4. [Managing containers](#4-managing-containers)
5. [Containers and the host kernel](#5-containers-and-the-host-kernel)
6. [The `hello-world` image](#6-the-hello-world-image)
7. [Cheat sheet](#7-cheat-sheet)

---

## 1. Installing Docker

### 1.1 Installing Docker Engine on Ubuntu

Official reference: [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/) (check it for the up-to-date list of supported Ubuntu versions).

#### Step 1: Set up Docker's `apt` repository

```bash
# Add Docker's official GPG key
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

#### Step 2: Install Docker

```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

| Package | Role |
|---|---|
| `docker-ce` | The Docker daemon (`dockerd`) |
| `docker-ce-cli` | The command-line client (`docker`) |
| `containerd.io` | The runtime that actually runs the containers |
| `docker-buildx-plugin` | The modern image builder (`docker buildx`) |
| `docker-compose-plugin` | Docker Compose (`docker compose`), used in the upcoming labs |

#### Step 3: Test the installation

```bash
sudo docker run hello-world
```

**Expected output:**

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

> [!TIP]
> Check that the line **`Hello from Docker!`** is present. The layer identifiers (`c1ec31eb5944`) and the `Digest` will be different on your machine: this is normal.

### 1.2 Using Docker without `sudo`

By default, only the `root` user and members of the `docker` group can communicate with the Docker daemon. Without these rights, you get the following error:

```text
docker: permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: ...
```

To add the current user (`$USER`) to the `docker` group:

```bash
sudo usermod -aG docker $USER
newgrp docker        # applies the new group in the current terminal
```

Then check that the command works **without** `sudo`:

```bash
docker run hello-world
```

> [!NOTE]
> `newgrp` only affects the current terminal. For the change to apply everywhere, log out and log back in (or restart the machine).

---

## 2. Using the `docker` command

The general syntax is:

```bash
docker [options] <command> [arguments]
```

1. Display all available commands:

    ```bash
    docker
    ```

2. Display help for a specific command (for example `run`):

    ```bash
    docker run --help
    ```

3. Display the client and server versions:

    ```bash
    docker version
    ```

> [!TIP]
> Docker offers two equivalent syntaxes: a historical short form (`docker images`, `docker ps`) and a form grouped by object (`docker image ls`, `docker container ls`).

---

## 3. Managing images

An image is a read-only template (file system + metadata) from which containers are created.

### 3.1 Listing local images

```bash
docker images
```

**Expected output:**

```text
REPOSITORY    TAG       IMAGE ID       CREATED        SIZE
hello-world   latest    d2c94e258dcb   -- months ago  13.3kB
```

| Column | Meaning |
|---|---|
| `REPOSITORY` | Name of the image in the registry |
| `TAG` | Version of the image (`latest` by default) |
| `IMAGE ID` | Unique identifier of the image |
| `CREATED` | Date the image was built by its author (not the date it was downloaded to your machine) |
| `SIZE` | Size of the image |

### 3.2 Searching for an image

You can search for an image on the **Docker Hub** registry, either through its website ([https://hub.docker.com](https://hub.docker.com/)) or from the command line. The search matches the image name, the author's name or the description:

```bash
docker search <image_name>
```

**Example:**

```bash
docker search centos
```

**Expected output (excerpt):**

```text
NAME                       DESCRIPTION                                     STARS     OFFICIAL
centos                     DEPRECATED; The official build of CentOS.       7700      [OK]
...
```

| Column | Meaning |
|---|---|
| `NAME` | Name of the image |
| `DESCRIPTION` | Description provided by the author |
| `STARS` | Number of stars (popularity indicator) |
| `OFFICIAL` | `[OK]` if it is an official image maintained by Docker |

**Official images and user images:**

- **Official images** have a name **without a prefix** (`centos`, `ubuntu`, `nginx`). They are maintained by Docker and the software vendors, and their definitions are published in the GitHub repository [`docker-library/official-images`](https://github.com/docker-library/official-images).
- **User images** are published by individuals or organizations. Their name is **prefixed** with their owner's name, separated by `/`. For example, `ansible/centos7-ansible` is the `centos7-ansible` image published by the `ansible` account.

To keep only images with at least 5 stars:

```bash
docker search --filter=stars=5 centos
```

### 3.3 Downloading an image

```bash
docker pull centos
```

**Questions:**

1. Look at the message displayed by Docker. What error message do you get?
2. Explain why this error occurs.
3. Which version of the CentOS image can you use instead to fix the problem?

For the rest of the lab, download the `centos:centos7` image:

```bash
docker pull centos:centos7
```

### 3.4 Removing an image

To remove a local image, use `docker rmi` with its name or identifier:

```bash
docker rmi <image_ID_or_name>
```

**Example:**

```bash
docker rmi hello-world
```

> [!WARNING]
> Docker refuses to remove an image used by a container, **even a stopped one**. You then get a `conflict: unable to remove repository reference ...` error. Remove the container first, or force the removal with `docker rmi -f`.

To remove **all** local images:

```bash
docker rmi $(docker images -a -q)
```

> [!TIP]
> `docker images -q` only displays the identifiers. The result is passed as an argument to `docker rmi` through the `$( ... )` substitution.

---

### 3.5 Inspecting an image

Docker provides two commands to examine an image in detail:

| Command | Role |
|---|---|
| `docker image inspect <image>` | Displays all of the image's metadata in JSON format (configuration, architecture, digest, layers…) |
| `docker history <image>` | Displays the image's layers and the Dockerfile instruction that created each of them |

If you removed the `hello-world` image in the previous step, download it again:

```bash
docker pull hello-world
```

#### Exercise

**1.** Display the full metadata of the `hello-world` image:

```bash
docker image inspect hello-world
```

The output is long. The `--format` option lets you extract a specific field. Run the following commands and write down the results:

```bash
docker image inspect hello-world --format '{{.Config.Cmd}}'
docker image inspect hello-world --format '{{.Architecture}}'
docker image inspect hello-world --format '{{.RepoDigests}}'
```

- a) Which command runs when a container created from this image starts? Which Dockerfile instruction (section 6.2) does it correspond to?
- b) For which processor architecture was the image downloaded?
- c) Compare the digest you obtained with the one displayed during the `docker pull`. What do you notice?

**2.** Display the history of the `hello-world` image:

```bash
docker history hello-world
```

**Expected output:**

```text
IMAGE          CREATED         CREATED BY                       SIZE      COMMENT
d2c94e258dcb   18 months ago   CMD ["/hello"]                   0B        buildkit.dockerfile.v0
<missing>      18 months ago   COPY hello / # buildkit          13.3kB    buildkit.dockerfile.v0
```

- a) Match each line with the instructions in the `hello-world` Dockerfile.
- b) Why does the `CMD` line have a size of `0B`?
- c) Why is there no line corresponding to the `FROM scratch` instruction?

**3.** Run `docker history ubuntu` and compare it with `hello-world`. How many layers does the `ubuntu` image have? What is its total size?

### 3.6 Going further

Other image management commands:

| Command | Role |
|---|---|
| `docker build -t <name>:<tag> .` | Builds an image from a Dockerfile |
| `docker tag <image> <new_name>:<tag>` | Adds a new name or tag to an existing image |
| `docker login` | Authenticates with a registry |
| `docker push <name>:<tag>` | Publishes an image to a registry (Docker Hub…) |
| `docker save -o <file>.tar <image>` | Exports an image to a `.tar` archive |
| `docker load -i <file>.tar` | Imports an image from a `.tar` archive |

## 4. Managing containers

A **container** is a running (or stopped) instance of an image. Several containers can be created from the same image.

### 4.1 Creating a container

```bash
docker create --name MyFirstContainer centos:centos7
```

Docker displays the full identifier of the created container. The container **exists** but is **not started**.

### 4.2 Listing containers

**Running** containers only:

```bash
docker ps
```

The container you just created does not appear, because it is not started.

**All** containers, whatever their state:

```bash
docker ps -a
```

**Expected output:**

```text
CONTAINER ID   IMAGE            COMMAND       CREATED         STATUS    PORTS     NAMES
c8863573b026   centos:centos7   "/bin/bash"   6 seconds ago   Created             MyFirstContainer
```

| Column | Meaning |
|---|---|
| `CONTAINER ID` | Unique identifier, assigned when the container is **created**. Two containers created from the same image have different identifiers. |
| `IMAGE` | Image (and tag) used to create the container |
| `COMMAND` | Command run at startup, defined by the `CMD` instruction in the image's Dockerfile |
| `CREATED` | Date the container was created |
| `STATUS` | State of the container: `Created` (created, never started), `Up` (running), `Exited (code)` (stopped, with the process exit code) |
| `PORTS` | Published network ports (none here) |
| `NAMES` | Name of the container, easier to use than its identifier. If `--name` is not specified, Docker generates a random name. |

### 4.3 Starting a container

```bash
docker start <container_ID_or_name>
```

**Example:**

```bash
docker start MyFirstContainer
# or, with the identifier (yours will be different):
docker start c8863573b026
```

Check its state:

```bash
docker ps -a
```

**Expected output:**

```text
CONTAINER ID   IMAGE            COMMAND       CREATED          STATUS                     PORTS     NAMES
c8863573b026   centos:centos7   "/bin/bash"   2 minutes ago    Exited (0) 3 seconds ago             MyFirstContainer
```

> [!IMPORTANT]
> The container **stopped immediately** with code `0` (normal termination). A container only lives as long as its main process is running. Here, that process is `/bin/bash`: with no interactive terminal attached, it has nothing to read and exits right away.

> [!TIP]
> You only need to type the first characters of an identifier, as long as they are unique: `docker start c88` works.

### 4.4 Stopping a container

```bash
docker stop MyFirstContainer
```

`docker stop` first sends a graceful stop signal (`SIGTERM`) to the main process, then forces it (`SIGKILL`) after 10 seconds if it has not stopped.

### 4.5 Creating and starting a container in a single command

`docker run` combines `docker pull` (if the image is missing), `docker create` and `docker start`:

```bash
docker run centos:centos7
```

Run `docker ps -a`: a new container, with a randomly generated name, appears with the `Exited (0)` state, for the same reason as in 4.3.

### 4.6 Removing a container

Remove a stopped container (by name or identifier):

```bash
docker rm <container_ID_or_name>
```

Remove several containers:

```bash
docker rm <container_1> <container_2>
```

By default, Docker refuses to remove a running container. To remove it whatever its state:

```bash
docker rm -f <container_ID_or_name>
```

Automatically remove a container as soon as it stops, using the `--rm` option:

```bash
docker run --rm <image_name>
```

Remove all **stopped** containers:

```bash
docker rm $(docker ps -a -q)
# or, more simply:
docker container prune
```

Remove **all** containers, including running ones:

```bash
docker rm -f $(docker ps -a -q)
```

### 4.7 Running a command in a container

There are three ways to run a command in a container.

#### a) Pass the command at startup

The command given after the image name **replaces** the default command (`CMD`):

```bash
docker run --rm ubuntu echo "Hello from a container"
```

**Expected output:**

```text
Hello from a container
```

#### b) Start the container in interactive mode (`-it`)

- `-i` (_interactive_) keeps standard input open;
- `-t` (_tty_) allocates a pseudo-terminal.

```bash
docker run -it --name test-ubuntu ubuntu bash
```

You get a command prompt **inside** the container:

```text
root@4f1e2a9b8c7d:/#
```

Try a few commands, then exit:

```bash
cat /etc/os-release
ls /
exit
```

#### c) Use `docker exec` on a running container

First, start a container that stays running in the background (`-d`, _detached_), using a command that never ends:

```bash
docker run -d --name test-exec ubuntu sleep infinity
```

You can then run commands inside it:

```bash
docker exec test-exec cat /etc/os-release
```

Or open an interactive terminal:

```bash
docker exec -it test-exec bash
```

Exit with `exit`: this time, the container **keeps running**, because its main process (`sleep infinity`) is still running. Check it with `docker ps`, then remove it:

```bash
docker rm -f test-exec test-ubuntu
```

---

## 5. Containers and the host kernel

In this experiment, we compare containers based on two different distributions with the host machine.

### 5.1 Kernel version

Run the `uname -a` command (kernel information) in two containers based on `ubuntu` and `centos:centos7`:

**First container (Ubuntu):**

```bash
docker run --rm ubuntu uname -a
```

```text
Linux 3f2a9c1b7e4d 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux
```

**Second container (CentOS 7):**

```bash
docker run --rm centos:centos7 uname -a
```

```text
Linux 9b7d4e2f1a6c 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux
```

**On the host machine**, in a regular terminal:

```bash
uname -a
```

```text
Linux ubuntu-vm 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux
```

> [!NOTE]
> The **kernel version** is identical in both containers and on the host, even though one of the containers is based on CentOS: **containers share the host machine's kernel**. An image does not contain a kernel, only the files of a distribution (libraries, tools, package manager).
>
> However, the **hostname** (second field of the output) is different in each container: it matches the container's identifier and is isolated from the host machine's hostname, thanks to Linux *namespaces*.

### 5.2 Distribution

Now display the distribution of each environment:

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
> The **distribution** is different in each environment: each container has its own file system, provided by its image. A CentOS container can therefore run on an Ubuntu host, since only the kernel is shared.

---

## 6. The `hello-world` image

### 6.1 Running `hello-world`

Like any technology, Docker has its own "Hello World" example: a container that displays a welcome message, then stops. It is used to check that the platform works.

```bash
docker run hello-world
```

**Expected output:**

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

<details>
<summary>Show full output</summary>

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

> [!NOTE]
> If the `hello-world` image is still present locally, the first four lines (download) do not appear.

**What happens during a `docker run`:**

1. The `docker` client sends the request to the **Docker daemon**.
2. The daemon looks for the image in the **local repository**. If it is missing, it downloads it from the default registry, **Docker Hub**.
3. The daemon **creates a new container** from the image and runs its default command.
4. The program's output is sent back to the client, which displays it in your terminal. The program exits, and the container stops.

### 6.2 Anatomy of the `hello-world` image

- Image page on Docker Hub: [https://hub.docker.com/_/hello-world](https://hub.docker.com/_/hello-world)
- Source code and Dockerfile: [https://github.com/docker-library/hello-world](https://github.com/docker-library/hello-world)

#### Source code

The GitHub repository contains the source file `hello.c`, at the root of the default branch (`master`):

This C program writes the welcome message to standard output. Excerpt from the `hello.c` file:

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
	/* ... rest of the message ... */
	"\n";

int main() {
	syscall(SYS_write, STDOUT_FILENO, message, sizeof(message) - 1);
	return 0;
}
```

#### Dockerfile

The repository contains one directory per processor architecture. Open the [`amd64/hello-world`](https://github.com/docker-library/hello-world/tree/master/amd64/hello-world) and [`i386/hello-world`](https://github.com/docker-library/hello-world/tree/master/i386/hello-world) directories:

Each directory contains a **Dockerfile** and the **compiled binary** `hello` for that architecture. Contents of the Dockerfile:

```dockerfile
FROM scratch
COPY hello /
CMD ["/hello"]
```

| Instruction | Explanation |
|---|---|
| `FROM scratch` | Defines the base image. `scratch` is an **empty** image: no file system, no distribution. |
| `COPY hello /` | Copies the `hello` binary to the root (`/`) of the image's file system. |
| `CMD ["/hello"]` | Defines the command run when the container starts: the `/hello` program. |

> [!NOTE]
> The same image can exist for several architectures (amd64, arm64, i386…). During a `docker pull`, Docker automatically downloads the variant that matches your processor. On an Apple Silicon Mac, for example, the `arm64v8` variant is used.

---

## 7. Cheat sheet

| Action | Command |
|---|---|
| List local images | `docker images` |
| Search for an image | `docker search <name>` |
| Download an image | `docker pull <name>:<tag>` |
| Remove an image | `docker rmi <image>` |
| Create a container | `docker create --name <name> <image>` |
| Create and start a container | `docker run <image>` |
| Start in interactive mode | `docker run -it <image> bash` |
| Start in the background | `docker run -d <image>` |
| Remove on exit | `docker run --rm <image>` |
| List running containers | `docker ps` |
| List all containers | `docker ps -a` |
| Start / stop a container | `docker start <c>` / `docker stop <c>` |
| Run a command in a running container | `docker exec -it <c> <command>` |
| Remove a container | `docker rm <c>` (`-f` to force) |
| Remove stopped containers | `docker container prune` |
| Remove unused images | `docker image prune -a` |

---
