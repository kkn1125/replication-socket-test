FROM ubuntu:22.04

# SHELL ["/bin/bash", "--login", "-c"]
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

RUN apt-get update --fix-missing
RUN apt-get install -y mariadb-server mariadb-client curl
# RUN apt-get install -y net-tools ifconfig

RUN mkdir -p /home/kkn1125

WORKDIR /home/kkn1125
COPY . .

RUN echo "$(ls)"
RUN echo "$(pwd)"

# ENV NVM_DIR $HOME/.nvm
# ENV NODE_PATH /root/.nvm/v$NODE_VERSION/lib/node_modules
# ENV PATH /root/.nvm/versions/node/v$NODE_VERSION/bin:$PATH

# RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use --delete-prefix $NODE_VERSION"
# # add node and npm to the PATH
# ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/bin
# ENV PATH $NODE_PATH:$PATH

# ENV NVM_DIR /root/.nvm
# ENV NODE_VERSION 18.11.0

# WORKDIR /

# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash \
#   && . $NVM_DIR/nvm.sh \
#   && nvm install $NODE_VERSION \
#   && nvm alias default $NODE_VERSION \
#   && nvm use default

# ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
# ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH


# RUN NVM_DIR="$HOME/.nvm"\
#   && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm\
#   && [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# RUN export NVM_DIR="$HOME/.nvm" and [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"


# WORKDIR /home/kkn1125
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get -qq install nodejs --yes

RUN bash -l -c "node -v"
RUN bash -l -c "npm -v"

RUN npm i vite nodemon -g

RUN npm i

ENTRYPOINT ["node", "index.js"]