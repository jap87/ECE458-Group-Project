# Node JS image from DockerHub
FROM node

# Define directory where app will reside
RUN mkdir -p /app
WORKDIR /app

# Install dependencies using npm
RUN npm install -g nodemon
COPY package.json /app/package.json
RUN npm install \
 && npm ls \
 && npm cache clean --force \
 && mv /app/node_modules /node_modules

# Copy the source code app directory to the Docker container
COPY . /app

# Expose the 3000 port for communication
EXPOSE 3000

# Start the app via npm
CMD ["npm", "start"]

