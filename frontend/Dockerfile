# Imagen base de Node
FROM node:22-alpine

WORKDIR /app

# Copiamos package.json primero para aprovechar la caché de Docker
COPY package.json package-lock.json* ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto de Vite
EXPOSE 5173

# Iniciamos el servidor de desarrollo escuchando en todas las interfaces
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]