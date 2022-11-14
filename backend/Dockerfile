FROM ubuntu:22.04

ENV NODE_VERSION=18.11.0
RUN apt-get update && apt-get install -y curl apache2 net-tools ufw iputils-ping vim nginx
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN npm install -g nodemon npm@9.1.1
RUN node --version
RUN npm --version

WORKDIR /home/kkn1125
COPY . .

RUN service nginx start

RUN npm install

RUN npm i nodemon live-server -g

RUN npm i

EXPOSE 3000

# CMD ["live-server", "--port=80", "--host=0.0.0.0"]

CMD ["npm", "run", "dev"]
