FROM node:18.20

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
COPY test/node18/test.sh /app/test.sh
RUN chmod +x /app/test.sh

ENTRYPOINT ["/app/test.sh"]
