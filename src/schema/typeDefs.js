const typeDefs = `#graphql
  # Customer types
  type Customer {
    _id: ID!
    name: String!
    email: String!
    age: Int
    location: String
    gender: String
  }
  
  type Product {
    _id: ID!
    name: String!
    category: String!
    price: Float!
    stock: Int!
  }
  
  type OrderProduct {
    productId: ID!
    quantity: Int!
    priceAtPurchase: Float!
  }
  
  type Order {
    _id: ID!
    customerId: ID!
    products: [OrderProduct!]!
    totalAmount: Float!
    orderDate: String!
    status: String!
  }
  
  # Response types for customer spending analytics
  type CustomerSpending {
    customerId: ID!
    totalSpent: Float!
    averageOrderValue: Float!
    lastOrderDate: String
  }
  
  # Response type for top selling products
  type TopProduct {
    productId: ID!
    name: String!
    totalSold: Int!
  }
  
  # Response types for sales analytics
  type CategoryBreakdown {
    category: String!
    revenue: Float!
  }
  
  type SalesAnalytics {
    totalRevenue: Float!
    completedOrders: Int!
    categoryBreakdown: [CategoryBreakdown!]!
  }
  
  # Input types for mutations
  input OrderProductInput {
    productId: ID!
    quantity: Int!
  }
  
  input PlaceOrderInput {
    customerId: ID!
    products: [OrderProductInput!]!
  }
  
  type Query {
    # Customer queries
    getCustomer(id: ID!): Customer
    getAllCustomers: [Customer!]!
    getCustomerSpending(customerId: ID!): CustomerSpending!
    
    # Product queries
    getProduct(id: ID!): Product
    getAllProducts: [Product!]!
    getTopSellingProducts(limit: Int!): [TopProduct!]!
    
    # Analytics queries
    getSalesAnalytics(startDate: String!, endDate: String!): SalesAnalytics!
  }
  
  type Mutation {
    placeOrder(input: PlaceOrderInput!): Order
  }
`;

export default typeDefs;