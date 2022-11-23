module.exports = {
  apps: [
    {
      script: "index.js",
      watch: ".",
      instances: "max",
      exec_mode: "cluster",
      increment_var: "SERVER_PORT",
      env: {
        SERVER_PORT: 3000,
      },
    },
  ],

  deploy: {
    production: {
      user: "SSH_USERNAME",
      host: "SSH_HOSTMACHINE",
      ref: "origin/master",
      repo: "GIT_REPOSITORY",
      path: "DESTINATION_PATH",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
