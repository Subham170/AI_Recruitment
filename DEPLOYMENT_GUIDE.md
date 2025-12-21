# AWS Amplify Deployment Guide for Frontend

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub/GitLab/Bitbucket** repository with your code
3. **Node.js 18+** (Amplify will use this automatically)
4. **Backend API URL** ready for environment variables

## 🔧 Step-by-Step Deployment Process

### Step 1: Prepare Your Repository

1. **Ensure all files are committed:**
   ```bash
   git add .
   git commit -m "Prepare for Amplify deployment"
   git push origin main
   ```

2. **Verify your project structure:**
   ```
   AI_Recruitement/
   ├── amplify.yml          ✅ (Build configuration)
   ├── package.json         ✅ (Root package.json)
   ├── client/
   │   ├── package.json     ✅ (Client dependencies)
   │   ├── next.config.ts   ✅
   │   └── ...
   └── server/              (Not needed for frontend deployment)
   ```

### Step 2: Create AWS Amplify App

1. **Go to AWS Amplify Console:**
   - Navigate to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Sign in with your AWS account

2. **Click "New app" → "Host web app"**

3. **Connect Repository:**
   - Choose your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
   - Authorize AWS Amplify to access your repository
   - Select your repository: `AI_Recruitement`
   - Select branch: `main` (or your default branch)

4. **Configure Build Settings:**
   - Amplify will auto-detect `amplify.yml` from your repository
   - Verify the detected settings:
     ```
     App root: client
     Build command: npm run build
     Output directory: .next
     ```

### Step 3: Configure Environment Variables

1. **In Amplify Console, go to your app → "Environment variables"**

2. **Add Required Variables:**
   ```
   NEXT_PUBLIC_API_URL = https://your-backend-api-url.com
   ```
   ⚠️ **Important:** Replace with your actual backend API URL

3. **Optional Variables (if needed):**
   ```
   NODE_ENV = production
   ```

### Step 4: Review Build Settings

1. **Go to "Build settings" in Amplify Console**

2. **Verify amplify.yml is detected correctly:**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
     appRoot: client
   ```

### Step 5: Deploy

1. **Click "Save and deploy"**

2. **Monitor Build Process:**
   - Amplify will:
     - Clone your repository
     - Navigate to `client` directory (appRoot)
     - Run `npm ci` to install dependencies
     - Run `npm run build` to build Next.js app
     - Deploy the `.next` output directory

3. **Wait for Build to Complete:**
   - Build typically takes 5-10 minutes
   - You can view real-time logs in the Amplify Console

### Step 6: Verify Deployment

1. **Once build completes, Amplify provides:**
   - **App URL:** `https://<app-id>.amplifyapp.com`
   - **Custom Domain:** (if configured)

2. **Test Your Application:**
   - Visit the provided URL
   - Verify frontend loads correctly
   - Test API connections
   - Check authentication flow

## 🔍 Troubleshooting Common Issues

### Issue 1: Build Fails - "Cannot find module"

**Solution:**
- Ensure `client/package.json` has all dependencies
- Check that `node_modules` is not in `.gitignore` (it shouldn't be)
- Verify Node.js version compatibility

### Issue 2: Environment Variables Not Working

**Solution:**
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### Issue 3: API Calls Failing

**Solution:**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings on your backend
- Ensure backend API is accessible from Amplify's IP ranges

### Issue 4: Build Timeout

**Solution:**
- Optimize dependencies (remove unused packages)
- Use `npm ci` instead of `npm install` (already configured)
- Enable caching (already configured in amplify.yml)

### Issue 5: 404 Errors on Routes

**Solution:**
- Next.js requires rewrites for client-side routing
- Add to `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     output: 'standalone', // Optional: for better performance
   };
   ```

## 📝 Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] All routes work correctly
- [ ] API connections are working
- [ ] Authentication flow works
- [ ] Images and assets load properly
- [ ] Environment variables are set correctly
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate is active (automatic with Amplify)

## 🔄 Continuous Deployment

**Automatic Deployments:**
- Amplify automatically deploys on every push to your connected branch
- You can configure branch-specific settings
- Set up preview deployments for pull requests

**Manual Deployments:**
- Go to Amplify Console → Your App → "Redeploy this version"

## 🎯 Best Practices

1. **Use Environment Variables:**
   - Never hardcode API URLs or secrets
   - Use Amplify's environment variable management

2. **Monitor Build Logs:**
   - Check logs regularly for warnings
   - Fix issues before they become critical

3. **Set Up Custom Domain:**
   - Go to App Settings → Domain Management
   - Add your custom domain
   - Configure DNS settings

4. **Enable Branch Previews:**
   - Test changes before merging to main
   - Each PR gets its own preview URL

5. **Optimize Build Time:**
   - Use caching (already configured)
   - Remove unused dependencies
   - Consider using `npm ci` (already configured)

## 📞 Additional Resources

- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Amplify Console](https://console.aws.amazon.com/amplify/)

## ✅ Your amplify.yml is Correct!

Your current `amplify.yml` configuration is properly set up:
- ✅ Uses `appRoot: client` to work in client directory
- ✅ Uses `npm ci` for faster, reliable installs
- ✅ Correct output directory (`.next`)
- ✅ Caching enabled for faster builds
- ✅ Proper artifact configuration

You're all set to deploy! 🚀

