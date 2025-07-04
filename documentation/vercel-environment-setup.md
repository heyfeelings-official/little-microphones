# Vercel Environment Variables Setup Guide

## Overview
This guide provides instructions for configuring environment variables in Vercel for the Little Microphones radio program sharing system.

## Required Environment Variables

### Supabase Configuration
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Bunny.net CDN Configuration
```
BUNNY_API_KEY=your-bunny-api-key
BUNNY_STORAGE_ZONE=your-storage-zone-name
BUNNY_CDN_URL=https://your-domain.b-cdn.net
```

## Step 1: Access Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign in to your account
3. Navigate to your Little Microphones project
4. Click on the project name

## Step 2: Configure Environment Variables

### 2.1 Navigate to Settings
1. Click on "Settings" tab
2. Select "Environment Variables" from the left sidebar

### 2.2 Add Supabase Variables

**SUPABASE_URL:**
1. Click "Add New" button
2. Name: `SUPABASE_URL`
3. Value: Your Supabase project URL (found in Supabase Dashboard > Settings > API)
4. Environment: Select "Production", "Preview", and "Development"
5. Click "Save"

**SUPABASE_ANON_KEY:**
1. Click "Add New" button
2. Name: `SUPABASE_ANON_KEY`
3. Value: Your Supabase anon/public key (found in Supabase Dashboard > Settings > API)
4. Environment: Select "Production", "Preview", and "Development"
5. Click "Save"

### 2.3 Add Bunny.net Variables

**BUNNY_API_KEY:**
1. Click "Add New" button
2. Name: `BUNNY_API_KEY`
3. Value: Your Bunny.net storage API key
4. Environment: Select "Production", "Preview", and "Development"
5. Click "Save"

**BUNNY_STORAGE_ZONE:**
1. Click "Add New" button
2. Name: `BUNNY_STORAGE_ZONE`
3. Value: Your Bunny.net storage zone name
4. Environment: Select "Production", "Preview", and "Development"
5. Click "Save"

**BUNNY_CDN_URL:**
1. Click "Add New" button
2. Name: `BUNNY_CDN_URL`
3. Value: Your Bunny.net CDN URL (e.g., `https://little-microphones.b-cdn.net`)
4. Environment: Select "Production", "Preview", and "Development"
5. Click "Save"

## Step 3: Redeploy Application

After adding environment variables, you need to redeploy:

1. Go to "Deployments" tab
2. Click "..." menu on the latest deployment
3. Select "Redeploy"
4. Confirm the redeployment

**OR**

1. Make a small change to your code
2. Push to GitHub
3. Vercel will automatically redeploy

## Step 4: Verify Configuration

### 4.1 Test API Endpoints
After redeployment, test the new API endpoints:

```bash
# Test ShareID generation
curl "https://your-domain.vercel.app/api/get-share-link?lmid=32"

# Test radio data retrieval
curl "https://your-domain.vercel.app/api/get-radio-data?shareId=test123"
```

### 4.2 Check Function Logs
1. Go to "Functions" tab in Vercel dashboard
2. Click on any failing function
3. Review the logs for environment variable errors

## Troubleshooting

### Common Issues

**Environment Variables Not Found:**
- Verify variable names are exactly correct (case-sensitive)
- Ensure variables are set for all environments
- Redeploy after adding variables

**Supabase Connection Errors:**
- Verify SUPABASE_URL format: `https://project-id.supabase.co`
- Verify SUPABASE_ANON_KEY is the public/anon key, not service key
- Check Supabase project is active and accessible

**Bunny.net Access Errors:**
- Verify BUNNY_API_KEY has proper permissions
- Verify BUNNY_STORAGE_ZONE name is correct
- Verify BUNNY_CDN_URL format: `https://domain.b-cdn.net`

### Error Messages

**"Missing environment variables":**
```
Error: Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY
```
Solution: Add the missing environment variables in Vercel dashboard

**"Database connection failed":**
```
Error: Invalid API key or project URL
```
Solution: Verify Supabase credentials are correct

**"Storage upload failed":**
```
Error: Bunny.net API authentication failed
```
Solution: Verify Bunny.net API key and permissions

## Step 5: Test Complete System

### 5.1 Run API Tests
Use the provided testing script:

```bash
# Test all endpoints
node test-api-endpoints.js all

# Test just ShareID flow
node test-api-endpoints.js shareid

# Test webhook functionality
node test-api-endpoints.js webhook
```

### 5.2 Manual Testing
1. Generate a ShareID via API
2. Test radio data retrieval
3. Verify audio program generation
4. Test registration webhook

## Security Best Practices

### Environment Variable Security
- Never commit environment variables to code
- Use different keys for development/production
- Regularly rotate API keys
- Monitor usage for unusual activity

### Access Control
- Use minimal required permissions
- Enable Row Level Security in Supabase
- Configure CORS headers appropriately
- Monitor API endpoint usage

## Monitoring

### Set Up Alerts
1. Configure Vercel function error alerts
2. Monitor Supabase usage and quotas
3. Track Bunny.net bandwidth usage
4. Set up uptime monitoring

### Performance Monitoring
- Monitor function execution times
- Track API response times
- Monitor database query performance
- Track CDN cache hit rates

## Backup Configuration

### Environment Variables Backup
Keep a secure backup of your environment variables:

```bash
# Example format (DO NOT commit this file)
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=eyJ...
BUNNY_API_KEY=abc123...
BUNNY_STORAGE_ZONE=little-microphones
BUNNY_CDN_URL=https://little-microphones.b-cdn.net
```

### Recovery Process
1. Access backup environment variables
2. Re-add to Vercel dashboard
3. Redeploy application
4. Test all functionality

## Support

### Getting Help
- Check Vercel documentation for environment variables
- Review Supabase connection troubleshooting
- Consult Bunny.net API documentation
- Use the provided testing scripts for diagnosis

### Contact Information
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Supabase Support: [supabase.com/support](https://supabase.com/support)
- Bunny.net Support: [bunny.net/support](https://bunny.net/support)

**Last Updated:** January 2025  
**Version:** 4.0.0  
**Status:** Production Ready ✅ 