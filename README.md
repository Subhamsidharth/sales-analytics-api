# Sales Analytics API

A GraphQL API built with Node.js, Express, and MongoDB for tracking and analyzing sales data, customer information, and product performance.

## Features

- **Customer Management**: Store and retrieve customer information
- **Product Tracking**: Monitor product inventory and sales performance
- **Order Processing**: Track orders and their fulfillment status
- **Sales Analytics**: Generate detailed analytics about sales performance, revenue trends, and customer spending
- **GraphQL API**: Modern, flexible API for querying exactly the data you need
- **Code Quality & Formatting**: Integrated ESLint and Prettier for clean and maintainable code.

## Tech Stack

- **Node.js**: JavaScript runtime environment
- **Express**: Web application framework
- **MongoDB**: NoSQL database
- **Apollo Server**: GraphQL server implementation
- **Mongoose**: Object Data Modeling (ODM) library for MongoDB
- **dotenv**: Environment variables management
- **Helmet**: Secure Express apps by setting various HTTP headers
- **CORS**: Cross-Origin Resource Sharing middleware
- **ESLint & Prettier**: Ensuring consistent code formatting and quality

## Key Design Decisions

1. **UUID for Scalability & Security**:

   - By default, MongoDB uses the `_id` field in `ObjectId` format, but in the provided CSV files, UUID format was used.
   - To ensure consistency, security, and better scalability across distributed systems, I have used UUIDs for all entities.

2. **Order Status & Queries**:

   - The `Order` collection has three statuses: **Pending, Completed, and Canceled**.
   - All sales analytics, customer spending, and top-selling product queries are based only on **Completed** orders.

3. **Product Collection - Array Handling**:

   - In the CSV, the `products` field in `Orders` was stored as a **stringified array of objects**.
   - This was inefficient for querying and aggregation, so I converted it into a proper **array of objects**.
   - However, I also implemented a fallback method to handle the original string format (see `test.md` for reference).

4. **Order Date Handling**:

   - In the dataset, `orderDate` was stored as a **string**.
   - While I kept it as a string in resolvers, **storing it as a Date type** would be more efficient for querying and filtering.

5. **Performance Enhancements**:
   - **Indexes**: Added indexes to optimize query performance and speed up data retrieval.
   - **Session Handling**: Implemented **MongoDB sessions** for safe and efficient product mutations.

6. **Code Quality and Linting**:
   - **ESLint** is integrated to enforce best coding practices and catch potential issues early.
   - **Prettier** is used to ensure consistent code formatting across the project.

## Getting Started

### Prerequisites

- Node.js v18+ and npm
- MongoDB instance (local or Atlas)

### Installation

1. Clone the repository:  
   ```sh
   git clone https://github.com/Subhamsidharth/sales-analytics-api.git
   cd sales-analytics-api
   ```

2. Install dependencies:  
   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:  
   ```sh
   PORT=7008
   MONGODB_URI=mongodb://localhost:27017/sales-analytics
   NODE_ENV=development
   LOG_LEVEL=info
   ```

4. Start the development server:  
   ```sh
   npm start
   ```

   The GraphQL API will be available at `http://localhost:7008/graphql`

## Project Structure

```plaintext
project-root/
├── src/
|   |-- config/
|   |   |-- db.js
|   |   |-- indexConfig.js
│   ├── graphql/
│   │   ├── resolvers/
│   │   │   ├── customerResolvers.js
│   │   │   ├── productResolvers.js
│   │   │   ├── orderResolvers.js
│   │   │   ├── analyticsResolvers.js
│   │   │   └── index.js
│   │   ├── typeDefs/
│   │   │   ├── customerTypes.js
│   │   │   ├── productTypes.js
│   │   │   ├── orderTypes.js
│   │   │   ├── analyticsTypes.js
│   │   │   └── index.js
│   │   └── schema.js
│   ├── models/
│   │   ├── Customer.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── index.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── helpers.js
|   ├── queries.graphql
│   └── server.js
├── .env
├── .gitignore
├── eslint.config.js
├── .eslintignore
├── .prettierrc
├── package.json
└── README.md
```

## Code Quality

### Running ESLint

To check for linting errors and fix them automatically:
```sh
npm run lint
```

### Running Prettier

To format the code:
```sh
npm run format
```

## API Endpoints

### GraphQL Endpoint

The API exposes a single GraphQL endpoint at `/graphql` where you can perform all operations.

### Health Check Endpoint

A health check endpoint is available at `/health` to verify the API and database status.

## Sample Queries

### Customer Queries

#### Get all customers

```graphql
query GetAllCustomers {
  getAllCustomers {
    _id
    name
    email
    age
    location
    gender
  }
}
```

#### Get customer spending analytics

```graphql
query GetCustomerSpending($customerId: ID!) {
  getCustomerSpending(customerId: $customerId) {
    customerId
    totalSpent
    averageOrderValue
    lastOrderDate
  }
}
```

### Sales Analytics Queries

#### Get top-selling products

```graphql
query GetTopProducts($limit: Int!) {
  getTopSellingProducts(limit: $limit) {
    productId
    name
    totalSold
  }
}
```

#### Get sales analytics for a specific period

```graphql
query GetSalesAnalytics($startDate: String!, $endDate: String!) {
  getSalesAnalytics(startDate: $startDate, endDate: $endDate) {
    totalRevenue
    completedOrders
    categoryBreakdown {
      category
      revenue
    }
  }
}
```

### Order Mutations

#### Place a new order

```graphql
mutation PlaceOrder($input: PlaceOrderInput!) {
  placeOrder(input: $input) {
    _id
    customerId
    totalAmount
    status
    products {
      productId
      quantity
      priceAtPurchase
    }
  }
}
```

## Error Handling

- **Consistent GraphQL Error Formatting**: All errors are logged and returned in a structured format.
- **Graceful Database Connection Handling**: Any connection issues are managed properly and if error 3 time tries also.
- **Input Validation**: Strict input validation before processing mutations and queries.

## Performance Optimizations

- **Indexes**: Used for optimizing frequent queries (e.g., customer spending, product sales).
- **Aggregation Pipelines**: Efficiently used to calculate analytics data.
- **MongoDB Sessions**: Ensured transactional consistency when mutating product stock.

## Acknowledgments

- **MongoDB** for its flexible NoSQL capabilities.
- **Apollo Server** for a seamless GraphQL implementation.
