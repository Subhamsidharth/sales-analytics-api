const typeDefs = `#graphql
  type CategoryBreakdown {
    category: String!
    revenue: Float!
  }

  type SalesAnalytics {
    totalRevenue: Float!
    completedOrders: Int!
    categoryBreakdown: [CategoryBreakdown!]!
  }

  extend type Query {
    getSalesAnalytics(startDate: String!, endDate: String!): SalesAnalytics!
  }
`;

export default typeDefs;
