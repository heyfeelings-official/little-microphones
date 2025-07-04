# Webflow Integration Guide - Radio Page Setup

## Overview
This guide provides step-by-step instructions for creating and configuring the `/members/radio` page in Webflow to integrate with the Little Microphones radio program sharing system.

## Prerequisites
- Webflow account with Designer access
- Little Microphones project in Webflow
- Understanding of Webflow custom code functionality
- Access to radio.js file from the repository

## Step 1: Create the Radio Page

### 1.1 Add New Page
1. Open Webflow Designer
2. Go to Pages panel
3. Click "+" to add new page
4. Name: `radio`
5. URL slug: `radio`
6. Set as static page (not CMS)

### 1.2 Page Settings
- **Page Title**: `Radio Program - Little Microphones`
- **Meta Description**: `Listen to personalized radio programs and join the Little Microphones community`
- **Open Graph Title**: `Little Microphones Radio Program`
- **Open Graph Description**: `Listen to personalized radio programs created by students`

## Step 2: HTML Structure Setup

### 2.1 Base HTML Structure
Add this HTML structure to the radio page:

```html
<!-- Main Container -->
<div id="main-container" class="radio-main-container">
    
    <!-- Loading State (Initial) -->
    <div id="loading-container" class="loading-container">
        <div class="loading-content">
            <h1>🎵 Little Microphones</h1>
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            <p id="loading-message">Loading radio program...</p>
        </div>
    </div>
    
    <!-- Program Header -->
    <div id="program-header" class="program-header" style="display: none;">
        <h1 id="world-name" class="world-name"></h1>
        <div id="program-info" class="program-info"></div>
    </div>
    
    <!-- Audio Player Container -->
    <div id="audio-player-container" class="audio-player-container" style="display: none;">
        <!-- Radio.js will populate this -->
    </div>
    
    <!-- Registration Container -->
    <div id="registration-container" class="registration-container" style="display: none;">
        <!-- Radio.js will populate this -->
    </div>
    
    <!-- Error Container -->
    <div id="error-container" class="error-container" style="display: none;">
        <!-- Radio.js will populate this -->
    </div>
    
</div>
```

### 2.2 Webflow Classes Setup
Create these classes in Webflow Designer:

#### Container Classes
- `.radio-main-container`
  - Width: 100%
  - Max-width: 1200px
  - Margin: 0 auto
  - Padding: 20px

#### Loading Classes
- `.loading-container`
  - Text-align: center
  - Padding: 60px 20px
  - Min-height: 400px

- `.loading-content`
  - Max-width: 500px
  - Margin: 0 auto

- `.progress-bar`
  - Width: 100%
  - Height: 20px
  - Background: #e9ecef
  - Border-radius: 10px
  - Overflow: hidden
  - Margin: 20px 0

- `.progress-fill`
  - Height: 100%
  - Background: #007bff
  - Width: 0%
  - Transition: width 0.3s ease

#### Program Classes
- `.program-header`
  - Text-align: center
  - Margin-bottom: 30px

- `.world-name`
  - Font-size: 2.5em
  - Font-weight: bold
  - Color: #333
  - Margin-bottom: 10px

- `.program-info`
  - Color: #666
  - Font-size: 1.1em

#### Container Classes
- `.audio-player-container`
  - Margin: 30px 0

- `.registration-container`
  - Margin: 30px 0

- `.error-container`
  - Margin: 30px 0

## Step 3: Custom Code Integration

### 3.1 Add radio.js Script
1. Go to Page Settings for the radio page
2. Navigate to "Custom Code" tab
3. In "Before </body> tag" section, add:

```html
<script>
// Radio.js script content goes here
// Copy the entire content of radio.js file
</script>
```

### 3.2 Alternative: External Script Loading
If you prefer to host radio.js externally:

```html
<script src="https://your-cdn.com/radio.js"></script>
```

### 3.3 Memberstack Integration
Ensure Memberstack is loaded before radio.js:

```html
<!-- Memberstack Script (should already be in site-wide settings) -->
<script src="https://api.memberstack.com/static/memberstack.js" data-memberstack-id="your-memberstack-id"></script>

<!-- Radio.js Script -->
<script>
// radio.js content
</script>
```

## Step 4: CSS Styling

### 4.1 Additional CSS
Add this CSS to Page Settings > Custom Code > "Inside <head> tag":

```css
<style>
/* Radio Page Specific Styles */
.radio-main-container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
}

.loading-container h1 {
    color: #333;
    margin-bottom: 20px;
}

.loading-container p {
    color: #666;
    font-size: 16px;
}

/* Responsive Design */
@media (max-width: 768px) {
    .radio-main-container {
        padding: 10px;
    }
    
    .world-name {
        font-size: 2em;
    }
    
    .loading-container {
        padding: 40px 10px;
    }
}

/* Error States */
.error-container {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    padding: 20px;
    color: #721c24;
    text-align: center;
}

/* Success States */
.success-message {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 6px;
    padding: 15px;
    color: #155724;
    text-align: center;
    margin: 20px 0;
}
</style>
```

## Step 5: Testing Setup

### 5.1 Test URL Structure
The radio page should be accessible at:
- `https://your-domain.com/members/radio`
- `https://your-domain.com/members/radio?ID=shareId123`

### 5.2 Test Parameters
Create test URLs with different scenarios:
- Valid ShareID: `?ID=valid-share-id`
- Invalid ShareID: `?ID=invalid-share-id`
- No ShareID: No parameters

### 5.3 Console Testing
Open browser console to monitor:
- ShareID extraction
- API calls
- Error messages
- Registration flow

## Step 6: Memberstack Configuration

### 6.1 Custom Fields Setup
In Memberstack dashboard:
1. Go to Members > Custom Fields
2. Add field: `originating_share_id`
3. Type: Text
4. Required: No
5. Save changes

### 6.2 Webhook Configuration
1. Go to Settings > Webhooks
2. Add new webhook:
   - **URL**: `https://little-microphones.vercel.app/api/handle-new-member`
   - **Event**: Member Created
   - **Method**: POST
   - **Content-Type**: application/json

### 6.3 Registration Modal
Ensure registration modal is configured to accept metadata:
- Modal ID: `signup`
- Custom fields enabled
- Metadata support active

## Step 7: Production Deployment

### 7.1 Environment Variables
Verify these environment variables are set in Vercel:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `BUNNY_API_KEY`
- `BUNNY_STORAGE_ZONE`
- `BUNNY_CDN_URL`

### 7.2 API Endpoints
Ensure all API endpoints are deployed:
- `/api/get-share-link`
- `/api/get-radio-data`
- `/api/handle-new-member`
- `/api/combine-audio`
- `/api/list-recordings`

### 7.3 Database Setup
Verify Supabase database:
- `lmids` table has `share_id` column
- Proper indexes on `share_id`
- Row Level Security configured

## Step 8: Testing Checklist

### 8.1 Basic Functionality
- [ ] Radio page loads without errors
- [ ] ShareID extraction from URL works
- [ ] Loading states display properly
- [ ] Error handling for invalid ShareIDs

### 8.2 Audio Functionality
- [ ] Audio player loads and displays
- [ ] Playback controls work
- [ ] Download functionality works
- [ ] Share button copies URL

### 8.3 Registration Flow
- [ ] Registration button appears for non-logged users
- [ ] Registration modal opens correctly
- [ ] ShareID metadata is passed
- [ ] Webhook receives registration data

### 8.4 Intelligent Generation
- [ ] Existing programs load immediately
- [ ] New programs generate when needed
- [ ] Manifest tracking works correctly
- [ ] Manual regeneration functions

## Step 9: Troubleshooting

### 9.1 Common Issues

**Radio page doesn't load:**
- Check console for JavaScript errors
- Verify radio.js is properly included
- Ensure Memberstack is loaded first

**ShareID not found:**
- Verify ShareID format in URL
- Check database for ShareID existence
- Ensure API endpoints are working

**Audio won't play:**
- Check audio file URLs
- Verify CORS headers
- Test different browsers

**Registration fails:**
- Check Memberstack configuration
- Verify webhook URL is correct
- Test webhook endpoint directly

### 9.2 Debug Tools

**Browser Console:**
- Monitor network requests
- Check for JavaScript errors
- Verify API responses

**Webflow Inspector:**
- Check element IDs match radio.js
- Verify CSS classes are applied
- Test responsive behavior

**API Testing:**
- Test endpoints with Postman
- Verify response formats
- Check error handling

## Step 10: Launch Preparation

### 10.1 Final Checks
- [ ] All HTML structure in place
- [ ] radio.js script integrated
- [ ] CSS styling applied
- [ ] Memberstack configured
- [ ] Webhooks working
- [ ] Database ready
- [ ] API endpoints deployed

### 10.2 Monitoring Setup
- Enable error tracking
- Set up performance monitoring
- Configure usage analytics
- Test backup procedures

### 10.3 Documentation
- Update team on new functionality
- Provide user guides
- Document troubleshooting steps
- Create support materials

## Support Resources

### Documentation Links
- [Radio.js Documentation](./radio.js.md)
- [API Documentation](./api-documentation.md)
- [Memberstack Webhook Setup](./memberstack-webhook-setup.md)

### External Resources
- [Webflow Custom Code Guide](https://webflow.com/help/custom-code)
- [Memberstack Documentation](https://memberstack.com/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

### Contact Information
- Technical Support: Check documentation first
- Emergency Issues: Review error logs
- Feature Requests: Submit via GitHub issues

**Last Updated:** January 2025  
**Version:** 4.0.0  
**Status:** Production Ready ✅ 