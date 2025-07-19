# 🧾 Inventory Management System

This is a web-based Inventory Management System designed for shop owners to efficiently manage inventory, vendors, customers, purchases, sales, and generate reports. The system supports only a single user (shop owner) with no separate admin or role-based access.

---

## 📁 Project Structure

```
INVENTORY-SYSTEM/
├── middleware/           # Authentication middleware
├── models/               # MongoDB models (Item, Sale, Vendor, etc.)
├── public/               # Static files (CSS, JS, images)
├── routes/               # Express route handlers
├── test/                 # Jest unit tests
├── views/                # EJS templates for frontend rendering
├── .env                  # Environment variables (not committed)
├── package.json          # Project dependencies and scripts
├── server.js             # Main server entry point
├── swagger.js            # Swagger API documentation config
```

---

## ✅ Requirements

Make sure the following tools are installed before setup:

- Node.js (v18 or higher)
- MongoDB (local or Atlas cloud)
- Git (optional, to clone the repository)

---

## 🛠️ Setup Instructions

### 1. Clone the Repository

```
git clone https://github.com/yourusername/inventory-system.git
cd inventory-system
```

> Replace `yourusername` with your actual GitHub username.

---

### 2. Install Dependencies

```
npm install
```

---

### 3. Create a `.env` File

```
touch .env
```

Add the following content inside the `.env` file:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/inventory_system
SESSION_SECRET=your_secret_key
```

> Replace `your_secret_key` with a secure string of your choice.  
> If using MongoDB Atlas, replace the `MONGO_URI` with your connection string.

---

### 4. Start MongoDB

If using local MongoDB, run this in a separate terminal:

```
mongod
```

> Or use MongoDB Compass/Atlas if hosting remotely.

---

### 5. Start the Application

```
npm start
```

Open your browser and go to:

```
http://localhost:3000
```

---

## 📘 API Documentation

Swagger API docs are available at:

```
http://localhost:3000/api-docs
```

Swagger setup is defined in `swagger.js`.

---

## 🧪 Running Unit Tests (Using Jest)

Make sure MongoDB is running before testing.

Run all tests:

```
npm test
```

Run a specific test file (example: `items.test.cjs`):

```
npx jest test/items.test.cjs
```

Jest test files are located in the `test/` folder with the `.test.cjs` extension.

If you want to enable watch mode during development:

```
npx jest --watch
```

You can also run tests with coverage:

```
npx jest --coverage
```

---

## 🖼️ View Templates

All frontend templates are rendered using EJS and located in `/views`:

- login.ejs – Login screen
- register.ejs – User registration
- dashboard.ejs – Dashboard summary
- items.ejs, item-details.ejs – Item pages
- vendors.ejs – Vendor pages
- customers.ejs – Customer pages
- sales.ejs – Sales history
- purchases.ejs, purchase-details.ejs, purchase-edit.ejs – Purchase records
- Reports/index.ejs, Reports/view.ejs – Reports
- partials/header.ejs and partials/footer.ejs – Common templates

---

## 📂 Static Files

Static resources are located in `/public`:

- public/css/ – Stylesheets
- public/js/ – JavaScript files
- public/images/ – Images and icons

---

## 🔐 Authentication

- Only one user (shop owner) can register and log in.
- No role-based access control.
- Authentication handled via sessions.
- Middleware: `middleware/auth.js`

---

## 🧰 Technologies Used

- Node.js
- Express.js
- MongoDB + Mongoose
- EJS templating
- Bootstrap 5
- express-session
- Swagger UI
- Jest (for unit testing)

---

## 🧾 License

This project is licensed under the **MIT License**.

---

## 📬 Support

For help or to report bugs:

- Create an issue in the GitHub repository
- Contact the maintainer via GitHub or email

