## GiftHouse – Curated Gift Boxes & Hampers

This project is a Node.js + Express + EJS application for an online gift shop with a premium "GiftHouse" UI theme.

### Tech Stack

- Node.js, Express.js
- EJS templates
- Knex.js + relational database (for products, occasions, hampers, etc.)
- Bootstrap (selective), custom CSS in `public/css/gift-house.css`

### Key Features

- Home page with video‑backed hero and curated sections.
- Product listings (`/collections`, `/catalog`) with advanced filters (price range, categories, sort) and infinite scroll.
- Product detail pages with ratings, reviews, occasions labels, and multiple images.
- Cart, checkout, orders list, and order details with modern, mobile‑first layouts.
- Build‑a‑hamper flow using custom boxes and items, saved into the cart as hamper line items.
- Auth popup (login / register) used across the site instead of standalone pages.
- Global header search (desktop + mobile) with typeahead results.

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your database and environment variables in `.env`.
3. Run database migrations:
   ```bash
   npx knex migrate:latest
   ```
4. Start the server:
   ```bash
   npm start
   ```

The app should be available at `http://localhost:4000`.

# Shubham Garments - Inventory & E-Commerce System

A complete Node.js e-commerce system for managing clothing inventory and online sales, built with Express.js, PostgreSQL, and EJS templates.

## 🎯 Features

### Admin Panel
- Secure admin login with session management
- Dashboard with product and order statistics (charts and graphs)
- Complete CRUD operations for products
- Category management system
- Stock management
- Order management with status updates
- Customer address management in orders
- Modern, responsive admin interface

### Customer Website
- User registration and authentication
- Product browsing with advanced filters (price range, category, sort)
- Dynamic category filtering
- Product detail pages with reviews
- Shopping cart functionality
- Checkout with address collection
- Cash on Delivery (COD) payment method
- Order history tracking
- Review system for products
- Beautiful, modern UI matching Shubham Garments branding
- Mobile-responsive design with sticky filters

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Knex.js
- **Views**: EJS templates
- **Authentication**: express-session, bcryptjs
- **Styling**: Bootstrap 5, Custom CSS

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🚀 Installation & Setup

### 1. Navigate to project directory

```bash
cd "shubham collection"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=shubham_collection
SESSION_SECRET=supersecret
```

**Note:** The checkout page includes an interactive map for address selection using **OpenStreetMap** (completely free, no API key required). Users can click on the map or drag a marker to automatically fill in their address, city, state, and pincode.

### 4. Create PostgreSQL database

```sql
CREATE DATABASE shubham_collection;
```

### 5. Run migrations

```bash
npm run migrate
```

This will create all necessary tables:
- `admins` - Admin users
- `users` - Customer users
- `categories` - Product categories
- `products` - Product catalog
- `cart` - Shopping cart items
- `orders` - Customer orders (with address fields)
- `order_items` - Order line items
- `reviews` - Product reviews

### 6. Seed the database

```bash
npm run seed
```

This will create:
- 1 admin user (email: `admin@shubhamcollection.com`, password: `admin123`)
- Sample product categories (Jeans, Shirt, Sarees, Lehenga, Suits, etc.)

### 7. Start the development server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

## 📱 Access Points

- **Customer Website**: http://localhost:4000
- **Admin Panel**: http://localhost:4000/admin/login
- **Admin Credentials**:
  - Email: `admin@shubhamcollection.com`
  - Password: `admin123`

## 📁 Project Structure

```
shubham-collection/
├── app.js                 # Express app configuration
├── index.js               # Server entry point
├── knexfile.js           # Knex configuration
├── package.json          # Dependencies
│
├── config/
│   └── database.js       # Database connection
│
├── libs/
│   └── helpers.js        # Helper functions (flash messages, formatting)
│
├── utils/
│   └── validators.js     # Validation utilities
│
├── middlewares/
│   ├── authMiddleware.js # Authentication middleware
│   └── csrfMiddleware.js # CSRF protection middleware
│
├── migrations/           # Database migrations
├── seeds/               # Database seeds
│
└── src/
    ├── controllers/      # Route controllers
    │   ├── admin.controller.js
    │   ├── product.controller.js
    │   ├── category.controller.js
    │   ├── order.controller.js
    │   └── user.controller.js
    ├── routes/          # Route definitions
    │   ├── admin.routes.js
    │   ├── product.routes.js
    │   ├── order.routes.js
    │   └── user.routes.js
    └── views/           # EJS templates
        ├── admin/       # Admin panel views
        ├── user/        # Customer website views
        └── partials/    # Reusable partials
```

## 🎨 Theme & Design

The application features a modern design inspired by Shubham Garments branding:
- **Color Scheme**: Cream (#faf8f3), Ivory (#fffef9), Gold accents (#d4a574)
- **Typography**: Playfair Display (headings) and Inter (body)
- **Layout**: Responsive grid-based product display
- **Features**: Hero section, advanced filters (price range, category, sort), sticky filters on mobile, sale badges, WhatsApp integration

## 🔐 Security Features

- Password hashing with bcryptjs
- Session-based authentication
- CSRF protection
- Protected admin routes
- Input validation
- SQL injection protection via Knex.js

## 📝 Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run seed` - Seed database with sample data

## 🗄️ Database Schema

### Tables

- **admins**: Admin user accounts
- **users**: Customer accounts
- **categories**: Product categories (managed from admin panel)
- **products**: Product catalog (linked to categories)
- **cart**: Shopping cart items
- **orders**: Customer orders (includes shipping address, city, state, pincode, phone)
- **order_items**: Order line items
- **reviews**: Product reviews and ratings

## 🛒 E-Commerce Features

### Customer Features
- Browse products by category (Jeans, Shirt, Sarees, Lehenga, Suits, etc.)
- Advanced filtering (price range with dual-handle slider, category, sort order)
- View product details
- Add products to cart
- Update cart quantities
- Checkout with address collection
- Cash on Delivery (COD) payment
- Place orders
- View order history
- Submit product reviews

### Admin Features
- Manage product categories (CRUD operations)
- Manage product inventory
- Update product details
- Track stock levels
- View all orders with customer addresses
- Update order status
- Monitor sales statistics (dashboard with charts)
- View customer contact information

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if database `shubham_collection` exists

### Migration Errors
- Ensure all previous migrations ran successfully
- Try rolling back and re-running: `npm run migrate:rollback && npm run migrate`

### Session Issues
- Clear browser cookies
- Check `SESSION_SECRET` in `.env`

## 📄 License

ISC

## 👥 Support

For issues or questions, please contact:
- **Owner**: Shubham Jain
- **Phone**: +91 8770469369
- **Address**: Kukdeshwar, Neemuch-458116, Madhya Pradesh

---

## 🆕 Recent Updates

- ✅ Rebranded from "Veera Sarees" to "Shubham Garments"
- ✅ Expanded product categories beyond sarees (Jeans, Shirt, Sarees, Lehenga, Suits, etc.)
- ✅ Added category management system in admin panel
- ✅ Implemented advanced filters (price range, category, sort) with mobile-responsive sticky design
- ✅ Added dual-handle price range slider
- ✅ Enhanced checkout process with address collection
- ✅ Added Cash on Delivery (COD) payment method notice
- ✅ Improved mobile responsiveness across all pages
- ✅ Added image placeholder for broken/null images
- ✅ Added interactive map for address selection during checkout (Google Maps integration)
- ✅ Enhanced admin dashboard with proper chart heights and data visualization

---

**Built with ❤️ for Shubham Garments**

