# Safari játék

## Docker cheatsheet

Need Docker Desktop to be installed.

```sh
# log in once
docker login szofttech.inf.elte.hu:5050/szofttech-c-2025/group-08/vitorlas-devs

# build the image on local machine (BIG! >5GB)
docker build -t szofttech.inf.elte.hu:5050/szofttech-c-2025/group-08/vitorlas-devs:custom .

# run the image on local machine with bash shell to test it
docker run -it --rm szofttech.inf.elte.hu:5050/szofttech-c-2025/group-08/vitorlas-devs:custom /bin/bash

# push the image to the repository so that it can be used by gitlab
docker push szofttech.inf.elte.hu:5050/szofttech-c-2025/group-08/vitorlas-devs:custom
```
