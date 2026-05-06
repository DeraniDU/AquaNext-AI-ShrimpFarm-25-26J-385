# Security Guidelines for Disease Detection Module

## Database Credentials Management

### ✅ Best Practices Implemented

1. **No Hardcoded Credentials**
   - MongoDB connection URI is NOT hardcoded in source code
   - Credentials are required via environment variables only
   - Application will fail to start if credentials are not provided

2. **Environment Variables**
   - `MONGO_URI`: MongoDB Atlas connection string
   - `DB_NAME`: Database name
   - Both variables are **required** - no default values

3. **.env File Management**
   - `.env.example` contains **placeholder values only**
   - Actual `.env` file is **excluded from git** (in .gitignore)
   - Never commit real credentials to repository

4. **Error Handling**
   - Internal errors are logged securely (not exposed to clients)
   - API responses contain generic error messages only
   - Database connection strings cannot leak through error responses

### 🔐 Read-Only Database Access

The disease-detection module connects to `shrimp_farm_iot` database with **read-only access** to:
- `environment_data` collection: Water quality sensor readings

**No write operations** are performed on the shared database.

### 📋 Configuration at Check-In

Before running the application, ensure:

```bash
# Set environment variables
export MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/?appName=AppName"
export DB_NAME="shrimp_farm_iot"

# Or create a .env file (DO NOT COMMIT)
# See .env.example for structure
```

### 🚨 What NOT to Do

- ❌ Never commit `.env` files with real credentials
- ❌ Never log or print database connection strings
- ❌ Never expose sensitive errors in API responses
- ❌ Never hardcode credentials in source code
- ❌ Never modify the shared `environment_data` collection

### 🛡️ Deployment Checklist

1. Set `MONGO_URI` and `DB_NAME` via environment variables
2. Use strong, rotated credentials
3. Enable MongoDB IP whitelisting for production
4. Use connection strings with minimal required permissions
5. Monitor database access logs
6. Rotate credentials regularly

## Additional Security Measures

- All errors are logged internally with full context
- API errors returned to clients contain no sensitive information
- Environment validation happens at application startup
- Type hints and Pydantic models validate all inputs
