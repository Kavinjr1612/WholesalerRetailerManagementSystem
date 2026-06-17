# Wholesaler Retailer Management System

A comprehensive, modern web application built to streamline operations and transactions between wholesalers and retailers. The platform provides distinct dashboards and functional flows for both roles, facilitating seamless product management, order tracking, profit sharing, and analytics.

## 🌟 Key Features

### Admin (Wholesaler) Portal
- **Dashboard Overview**: Real-time insights into total revenue, pending orders, top products, and overall business metrics visualized through interactive charts.
- **Product Management**: Add, update, delete, and manage product inventory.
- **Retailer Management**: Manage retail partners, track their individual performance, and handle their accounts.
- **Order Processing**: Track, process, and manage incoming orders from retailers.
- **Profit Sharing**: Advanced profit-sharing tracking and analytics between the wholesaler and retailers.

### Retailer Portal
- **Retailer Dashboard**: Personalized view of purchases, pending deliveries, and expenses.
- **Product Catalog**: Browse the wholesaler's available products and easily place orders.
- **Billing & Invoicing**: Generate PDF invoices and manage billing histories.
- **Order History**: Keep track of current and past orders.
- **Public Page**: A shareable public profile for retailers (`/retailers/:id`).

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS & Radix UI Primitives (Lucide React for icons)
- **Routing**: React Router v6
- **Database / Backend as a Service**: Supabase
- **Charts & Data Visualization**: Chart.js & Recharts
- **PDF Generation**: jsPDF & html2pdf.js
- **Form & Date Handling**: React Datepicker
- **Authentication Security**: bcryptjs

## 🚀 Getting Started

Follow these steps to run the project locally.

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository** (if not already cloned)
   ```bash
   git clone git@github.com:Kavinjr1612/WholesalerRetailerManagementSystem.git
   cd WholesalerRetailerManagementSystem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Additional Package Installations** (if missing from your environment)
   ```bash
   npm install html2pdf.js react-datepicker bcryptjs @types/react-datepicker
   ```

4. **Environment Variables**
   - Ensure your `.env` file is properly configured with your Supabase credentials and other necessary secrets.

5. **Start the development server**
   ```bash
   npm run dev
   ```
   > *Note: If an error occurs, you may need to change the port number in `vite.config.ts`.*

## 📂 Project Structure

```text
├── public/                 # Static assets
├── src/                    # Source code
│   ├── api/                # API calls and integrations
│   ├── components/         # Reusable UI components
│   ├── context/            # React Context providers (e.g., ThemeContext)
│   ├── lib/                # Utility libraries and helpers
│   ├── pages/              # Admin and shared application pages
│   ├── retailer/           # Retailer-specific pages and components
│   ├── utils/              # Helper functions
│   ├── App.tsx             # Main application routing
│   └── main.tsx            # Entry point
├── supabase/               # Supabase configuration and migrations
├── index.html              # Main HTML file
├── tailwind.config.js      # Tailwind CSS configuration
└── vite.config.ts          # Vite configuration
```

## 🔒 Authentication Flows

**1. Admin (Wholesaler) Login**
- **URL Path**: `/admin/login`
- **Test Email**: `admin123@gmail.com`
- **Test Password**: `12345678`

**2. Retailer Login**
- **URL Path**: `/login` (This is the default landing page)
- **Test Email**: `retailer@gmail.com`
- **Test Password**: `12345678`

---
*Built to empower business efficiency and scalable growth.*
