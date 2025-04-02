const typeDefs = `#graphql
  # Customer types
  type Customer {
    id: ID!
    name: String!
    email: String!
    age: Int!
    location: String!
    gender: String!
  }

  type CustomerSpending {
    customerId: ID!
    totalSpent: Float!
    averageOrderValue: Float!
    lastOrderDate: String
  }

  # Product types
  type Product {
    id: ID!
    name: String!
    category: String!
    price: Float!
    stock: Int!
  }

  type TopProduct {
    productId: ID!
    name: String!
    totalSold: Int!
  }

  # Order types
  type OrderProduct {
    productId: ID!
    quantity: Int!
    priceAtPurchase: Float!
  }

  type Order {
    id: ID!
    customerId: ID!
    products: [OrderProduct!]!
    totalAmount: Float!
    orderDate: String!
    status: String!
  }

  # Analytics types
  type CategoryRevenue {
    category: String!
    revenue: Float!
  }

  type SalesAnalytics {
    totalRevenue: Float!
    completedOrders: Int!
    categoryBreakdown: [CategoryRevenue!]!
  }

  # Input types
  input OrderProductInput {
    productId: ID!
    quantity: Int!
  }

  input PlaceOrderInput {
    customerId: ID!
    products: [OrderProductInput!]!
  }

  # Query & Mutation definitions
  type Query {
    # Customer queries
    getCustomer(id: ID!): Customer
    getAllCustomers: [Customer!]!
    getCustomerSpending(customerId: ID!): CustomerSpending!
    
    # Product queries
    getProduct(id: ID!): Product
    getAllProducts: [Product!]!
    getTopSellingProducts(limit: Int!): [TopProduct!]!
    
    # Order queries
    getOrder(id: ID!): Order
    getCustomerOrders(customerId: ID!, page: Int, limit: Int): [Order!]!
    
    # Analytics queries
    getSalesAnalytics(startDate: String!, endDate: String!): SalesAnalytics!
  }

  type Mutation {
    placeOrder(input: PlaceOrderInput!): Order!
  }
`;

export default typeDefs;