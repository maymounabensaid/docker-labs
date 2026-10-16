# LAB 02: Introduction to Building Docker Images



## Objectives

1. Understand how a Docker image is built from ordinary source code.
2. Use different approaches to build images:
   - **From a base image**, with the `docker build` command (and a `Dockerfile`).
   - **From an existing container**, with the `docker commit` command.
3. Publish an image to the **Docker Hub** registry.

## Prerequisites

- Docker Engine installed and working (`docker version`).
- `gcc` installed on your local machine (`sudo apt install -y gcc`) for part 1.
- A Docker Hub account for part 3.

## Table of Contents

1. [Developing a "hello" application on the local machine](#1-developing-a-hello-application-on-the-local-machine)
2. [Building a "hello" Docker image](#2-building-a-hello-docker-image)
   - 2.1 [From a Dockerfile: `docker build`](#21-from-a-dockerfile-docker-build)
   - 2.2 [From a container: `docker commit`](#22-from-a-container-docker-commit)
   - 2.3 [Conclusion](#23-conclusion)
3. [Publishing the image to Docker Hub](#3-publishing-the-image-to-docker-hub)

---

## 1. Developing a "hello" application on the local machine

**1.** Create a `hello_directory` directory that will hold your source code:

```bash
mkdir hello_directory
cd hello_directory
```

**2.** In this directory, create a `hello.c` file that prints the message `Hello From Docker LAB !`:

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

**3.** Compile the source code with `gcc` to produce the `hello` executable:

```bash
gcc -o hello -static hello.c
```

> The `-static` option produces a **statically linked** executable: every library it needs (including libc) is embedded in the binary. It therefore requires no dynamic libraries at run time. This will be essential for method 2 (the `scratch` image).

**4.** List the directory contents: a `hello` executable has been added by the compilation.

```bash
ls
```

```text
hello  hello.c
```

**5.** Run the program:

```bash
./hello
```

```text
Hello From Docker LAB !
```

---

## 2. Building a "hello" Docker image

### 2.1. From a Dockerfile: `docker build`

The goal is to create a `hello` Docker image that prints the message `Hello From Docker LAB !` in the terminal.

- To create this image, we write a **`Dockerfile`**.
- The Dockerfile describes how to obtain a runnable image of the application: the base image, the dependencies to install, the files to copy and the command to run when the container starts.
- The first instruction (`FROM`) specifies the **base image**, i.e. the starting file system on which the application is built.

There are two possible approaches for our application:

| Method | Starting point | Base image | Principle |
|---|---|---|---|
| 1 | Source code `hello.c` | `ubuntu` | Install `gcc` in the image and compile the program during the build. |
| 2 | Executable `hello` (already compiled) | `scratch` (empty image) | The static binary has no dependencies: the host kernel is enough to run it. |

#### 2.1.1. Method 1: `ubuntu` base image

The Dockerfile must perform the following actions in order:

1. Start from an Ubuntu file system;
2. Install the `gcc` compiler;
3. Copy the `hello.c` source code into the image;
4. Compile the source code;
5. Set `/hello` as the startup command.

##### Step 1: Writing the Dockerfile

**1.** Create and edit the `Dockerfile` (in `hello_directory`):

```bash
nano Dockerfile
```

**2.** Add the following content:

```dockerfile
FROM ubuntu
RUN apt-get update && apt-get install -y gcc
COPY hello.c /
RUN gcc -o /hello /hello.c
CMD ["/hello"]
```

##### Step 2: Building the image with `docker build`

**3.** Build an image named `hello:version1` from the Dockerfile:

```bash
docker build -t hello:version1 .
```

> Don't forget the **dot** (`.`) at the end of the line: it specifies the **build context**, i.e. the current directory containing the `Dockerfile` and the files to copy.

**4.** Check that the image has been created:

```bash
docker images
```

```text
REPOSITORY   TAG        IMAGE ID       CREATED         SIZE
hello        version1   bbd500eb2345   5 seconds ago   251MB
ubuntu       latest     ba6acccedd29   12 days ago     78.1MB
```

##### Step 3: Running a container from the image

**5.** Create and start a container from the `hello:version1` image:

```bash
docker run hello:version1
```

```text
Hello From Docker LAB !
```

#### 2.1.2. Method 2: `scratch` base image (empty image)

We directly use the `hello` executable generated in part 1:

- this static binary needs no base file system to run;
- the base image is therefore the empty image: **`scratch`**.

> The binary is compiled on your machine: it must match the architecture of the Docker host (e.g. `x86_64` or `arm64`). If it is not compiled with `-static`, the container will fail because `scratch` contains no libraries.

##### Step 1: Writing the Dockerfile

**1.** Edit the `Dockerfile` again:

```bash
nano Dockerfile
```

**2.** Replace its content with:

```dockerfile
FROM scratch
COPY hello /
CMD ["/hello"]
```

> To keep both Dockerfiles, you can name this one `Dockerfile.scratch` and select it with the `-f` option:
> `docker build -f Dockerfile.scratch -t hello:version2 .`

##### Step 2: Building the image with `docker build`

**3.** Build an image named `hello:version2`:

```bash
docker build -t hello:version2 .
```

**4.** Check that the image has been created:

```bash
docker images
```

```text
REPOSITORY   TAG        IMAGE ID       CREATED          SIZE
hello        version2   c32e701ce11c   8 seconds ago    845kB
hello        version1   bbd500eb2345   42 minutes ago   251MB
ubuntu       latest     ba6acccedd29   12 days ago      78.1MB
```

##### Step 3: Running a container from the image

**5.** Create and start a container from the `hello:version2` image:

```bash
docker run hello:version2
```

```text
Hello From Docker LAB !
```

### 2.2. From a container: `docker commit`

In this part, we build the same application by manually modifying an Ubuntu container, then saving those changes into a new image.

#### Step 1: Creating and starting a container

**1.** Create a container from the `ubuntu` image in interactive mode (`-it`) and name it `hello_container`:

```bash
docker create -it --name hello_container ubuntu
```

**2.** Start the container:

```bash
docker start hello_container
```

#### Step 2: Modifying the container (installing `gcc`)

**3.** Open a `bash` session in the container:

```bash
docker exec -it hello_container /bin/bash
```

The following commands are run **inside the container** (as `root`).

**4.** Update the package list:

```bash
apt-get update
```

**5.** Install `gcc` and the `nano` editor (not included in the minimal Ubuntu image):

```bash
apt-get install -y gcc nano
```

#### Step 3: Creating the application

**6.** At the root of the container, create a `hello_directory` directory to hold the source code:

```bash
cd /
mkdir hello_directory
cd hello_directory
```

**7.** Create the `hello.c` file:

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

**8.** Compile the source code:

```bash
gcc -o hello hello.c
```

**9.** Run the program:

```bash
./hello
```

```text
Hello From Docker LAB !
```

**10.** Exit the container:

```bash
exit
```

#### Step 4: Saving the changes to an image (`docker commit`)

**11.** To permanently keep the changes made to the container, create an image named `hello:version3` from `hello_container`:

```bash
docker commit hello_container hello:version3
```

**12.** Check that the image has been created:

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

#### Step 5: Running the image in a container

**13.** Start a container from this image.

> The `hello:version3` image inherits the default command of the Ubuntu image (`/bin/bash`). To launch the application, you must therefore explicitly pass the `/hello_directory/hello` command when starting the container:

```bash
docker run hello:version3 /hello_directory/hello
```

```text
Hello From Docker LAB !
```

> Going further: the `--change` option of `docker commit` lets you set the default command at commit time:

```bash
docker commit --change 'CMD ["/hello_directory/hello"]' hello_container hello:version4
docker run hello:version4
```

### 2.3. Conclusion

**1.** List the images available in the local repository and compare the sizes of the three versions of the `hello` image:

```bash
docker images hello
```

**2.** Interpret the result.

> - Why is `hello:version2` about 300 times smaller than the other two?
> - What do `hello:version1` and `hello:version3` contain beyond what is strictly needed to run the program?
> - Which of the two methods (`docker build` or `docker commit`) is reproducible, documented and easy to maintain? Why?

---

## 3. Publishing the image to Docker Hub

To publish your image to the **Docker Hub** registry, you need an account: create one at <https://hub.docker.com/>.

### Step 1: Logging in to Docker Hub

**1.** Once your account has been created, log in from the terminal:

```bash
docker login
```

Follow the on-screen instructions (browser-based login, or enter your Docker ID and a password / *Personal Access Token*). On success, the following message is displayed:

```text
Login Succeeded
```

### Step 2: Tagging the image

To be published, an image must be named in the form `<your_docker_id>/<image_name>:<tag>`.

**2.** Identify the image to publish (for example `hello:version2`) and its ID:

```bash
docker images hello
```

**3.** Tag it with your Docker ID and the `latest` tag (you can use the image name or its `IMAGE ID`):

```bash
docker tag hello:version2 <your_docker_id>/hello:latest
# or, using the IMAGE ID:
# docker tag c32e701ce11c <your_docker_id>/hello:latest
```

### Step 3: Publishing the image

**4.** Push your image:

```bash
docker push <your_docker_id>/hello:latest
```

**5.** Go to <https://hub.docker.com/> and view your image. You can also check that it can be pulled and run from any machine:

```bash
docker run <your_docker_id>/hello:latest
```
