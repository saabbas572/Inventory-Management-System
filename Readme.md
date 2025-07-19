# 🧾 Inventory Management System

A full-stack web-based Inventory Management System built with **Node.js**, **Express.js**, **MongoDB**, and **EJS**. It allows a single shop owner to manage items, vendors, purchases, sales, customers, and reports in one place.

---

## 🚀 Features

- User registration and login (single-user only)
- Item management (CRUD)
- Vendor management (CRUD)
- Customer tracking
- Purchase and sales tracking
- PDF Report generation
- Secure authentication middleware
- Responsive UI using EJS templating
- Swagger API documentation
- Unit testing with Jest

---

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/inventory-system.git
cd inventory-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add the following:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/inventory_system
JWT_SECRET=your_jwt_secret_key
```

> ✅ **Note:** Ensure MongoDB is running locally on the default port. You can use **MongoDB Compass** to visually manage and inspect your database data.

### 4. Run the Development Server

```bash
npm run dev
```

Or for normal start:

```bash
npm start
```

The app will be available at `http://localhost:3000`

---

## 🧪 Run Unit Tests (Jest)

To execute all unit tests located in the `/test` folder:

```bash
npm test
```

You can also use the following script to run tests in watch mode:

```bash
npm run test:watch
```

Add the following to `package.json` scripts if not already there:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

---

## 🗃️ MongoDB Compass Setup (Optional but Recommended)

1. [Download MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to your local database using the URI:
   ```
   mongodb://localhost:27017
   ```
3. Create a new database called:
   ```
   inventory_system
   ```
4. Collections will be automatically created by the application when you start using it.

---

## 📂 Project Structure

```
INVENTORY-SYSTEM/
├── middleware/
├── models/
├── public/
├── routes/
├── test/
├── views/
├── .env
├── server.js
├── swagger.js
├── package.json
```

---

## 📘 API Documentation (Swagger)

Once the server is running, open the Swagger API Docs at:

```
http://localhost:3000/api-docs
```

---

## 🧑‍💻 Developer Notes

- Only one user (shop owner) is allowed.
- No role-based admin panel or multi-user functionality.
- Authentication uses JWT stored in cookies.
- Reports can be exported as PDFs.

