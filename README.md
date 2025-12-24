# 📦 Sistema de Gestión de Inventario Profesional

Una solución Full-Stack robusta y moderna para la administración eficiente de productos, control de stock y gestión de usuarios. Diseñado para ser escalable, seguro y responsivo.

![Estado del Proyecto](https://img.shields.io/badge/Estado-En_Desarrollo-green)
![Licencia](https://img.shields.io/badge/Licencia-MIT-blue)

## 🚀 Características Principales

### 🛡️ Autenticación y Usuarios
- **Login y Registro Seguro:** Autenticación mediante **JWT (JSON Web Tokens)** con hashing de contraseñas (Bcrypt).
- **Perfiles Completos:** Registro de usuarios con nombre, dirección y contacto.
- **Roles:** Sistema preparado para administradores y usuarios estándar.

### 📦 Gestión Avanzada de Inventario
- **CRUD de Productos:** Crear, leer, actualizar y eliminar productos.
- **Soporte de Escáner:** Integración con lectores de códigos de barras.
- **Lógica de Cajas vs. Unidades:** Conversión automática de stock al ingresar productos por cajas o bultos.
- **Auditoría de Stock:** Historial inmutable de movimientos (quién modificó qué, cuándo y cuánto).

### 📊 Reportes y Utilidades
- **Exportación de Datos:** Generación de reportes en **Excel (.xlsx)** y **PDF**.
- **Dashboard Interactivo:** Vista rápida del estado del sistema.
- **Modo Oscuro:** Interfaz moderna diseñada con CSS nativo y diseño responsivo (Mobile-First).

---

## 🛠️ Tecnologías Utilizadas

Este proyecto utiliza una arquitectura de microservicios contenerizada.

### Frontend
- ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) **React + Vite** (TypeScript)
- **CSS Modules:** Diseño personalizado y responsivo.
- **React Router DOM:** Navegación SPA.

### Backend
- ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi) **FastAPI** (Python 3.10+)
- **SQLAlchemy:** ORM para manejo de base de datos.
- **Pydantic:** Validación estricta de datos.
- **OAuth2:** Protocolo de seguridad.

### Infraestructura y Base de Datos
- ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white) **PostgreSQL 15**
- ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white) **Docker & Docker Compose**

---

## 📸 Capturas de Pantalla

| Login / Registro | Dashboard |
|:---:|:---:|
| <img src="./screenshots/login.png" width="400"> | <img src="./screenshots/dashboard.png" width="400"> |

| Gestión de Inventario | Modal de Stock |
|:---:|:---:|
| <img src="./screenshots/inventory.png" width="400"> | <img src="./screenshots/stock-modal.png" width="400"> |

> *Nota: Las imágenes se encuentran en la carpeta `screenshots`.*

---

## 🔧 Instalación y Despliegue

### Prerrequisitos
- Tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop).
- Git.

### 1. Clonar el Repositorio
```bash
git clone [https://github.com/tu-usuario/proyecto-gestion.git](https://github.com/tu-usuario/proyecto-gestion.git)
cd proyecto-gestion