# AI Photo Generation Service - MVP

A personalized AI photo generation service where users upload 10-20 photos of themselves to create custom FLUX models, then generate unlimited personalized images.

## 🏗️ **Tech Stack**

### **Frontend**
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand (ready to implement)
- **File Handling**: React Dropzone + Sharp
- **Authentication**: NextAuth.js (next step)

### **Backend**
- **Runtime**: Node.js with TypeScript
- **Framework**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: AWS S3 (ready to configure)
- **AI Services**: Together AI API (next step)

### **Development**
- **Testing**: Jest + React Testing Library
- **Type Safety**: TypeScript with strict mode
- **Code Quality**: ESLint + Prettier

## 📊 **Database Schema Overview**

```sql
Users → UserModels → TrainingImages
  ↓         ↓
Subscriptions  GeneratedImages
  ↓
JobQueue (background processing)
```

**Key Features:**
- User management with subscription tiers
- Multiple AI models per user
- Training image management
- Generated image gallery
- Background job processing
- Billing integration ready

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

**Current Test Coverage:**
- ✅ User creation and validation
- ✅ Password hashing and verification
- ✅ Duplicate email handling
- ✅ Error handling
...

## 🔧 **Development Commands**

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:migrate      # Run database migrations
npm run db:generate     # Generate Prisma client
npm run db:studio       # Open Prisma Studio

# Testing
npm test               # Run tests
npm run test:watch     # Watch mode
npm run lint           # Lint code
```

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- AWS account (for S3)
- Together AI account

### **Environment Setup**

1. **Clone and install dependencies:**
```bash
git clone [repo-url]
cd finetuned-image-gen
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

3. **Set up database:**
```bash
npm run db:migrate
npm run db:generate
```

4. **Run development server:**
```bash
npm run dev
```

## 🎯 **Business Model**

### **Subscription Tiers**
- **Free**: 3 generations, 1 model slot
- **Creator ($20/month)**: 200 generations, 3 models
- **Pro ($40/month)**: 500 generations, 10 models
- **Enterprise ($99/month)**: Unlimited access

### **Revenue Projections**
- Target: 1,000 MAUs by Month 6
- Conversion rate: 15-20% to paid plans
- Average revenue per user: $25/month
- Projected MRR: $3,750 - $5,000

## 🔒 **Security & Privacy**

- Password hashing with bcrypt (12 rounds)
- SQL injection prevention with Prisma
- File upload validation and sanitization
- Rate limiting on API endpoints
- GDPR compliance ready

## 📈 **Monitoring & Analytics**

**Ready to integrate:**
- Sentry for error tracking
- PostHog for user analytics
- Stripe for billing metrics
- Custom metrics for AI generation

## 🤝 **Contributing**

This project follows test-driven development principles:
1. Write failing tests first
2. Implement minimal code to pass tests
3. Refactor and optimize
4. Repeat for next feature

## 🎯 **Current Features**

