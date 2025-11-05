Perfecto 🔥, hagámoslo **desde cero** como si no tuvieras nada en tu máquina. Te voy a dar los pasos claros para levantar un proyecto de **React minimalista** con lo esencial que necesitas:

* **React** → UI
* **Axios** → HTTP requests
* **LocalStorage / SessionStorage** → guardar token
* **FormData** → subir archivos

---

## 🔹 1. Instalar lo básico en tu sistema

Necesitas Node.js (incluye npm).
En Ubuntu/Kali:

```bash
sudo apt update
sudo apt install nodejs npm -y
```

Verifica la instalación:

```bash
node -v
npm -v
```

---

## 🔹 Solución → Actualizar Node.js

### 1. Instalar Node Version Manager (NVM)

Con NVM puedes instalar y cambiar de versión fácilmente:

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
```

Luego recarga tu terminal:

```bash
source ~/.bashrc
```

### 2. Instalar una versión de Node soportada

Ejemplo, la 22 LTS (recomendada):

```bash
nvm install 22
```

### 3. Usar esa versión

```bash
nvm use 22
```

(O si quieres que siempre use 22 por defecto:)

```bash
nvm alias default 22
```

### 4. Verificar

```bash
node -v
npm -v
```

Deberías ver algo como `v22.x.x`.

---

## 🔹 2. Crear un proyecto con Vite + React

Vite es rápido y recomendado para React moderno.

```bash
npm create vite@latest mi-app
```

Te preguntará:

* Nombre → `mi-app`
* Framework → `React`
* Lenguaje → `JavaScript` (no TypeScript si quieres simple)

Luego:

```bash
cd mi-app
npm install
```

---

## 🔹 3. Instalar Axios

```bash
npm install axios
```

---

## 🔹 6. ¿Qué ya tienes aquí?

✅ React renderizando
✅ Axios para GET/POST
✅ LocalStorage para guardar token
✅ FormData para subir archivos
✅ Sin estilos, solo funcionalidad

---

## 🔧 Pasos

### 1. Instala React Router

En tu proyecto ejecuta:

```bash
npm install react-router-dom
```

---
