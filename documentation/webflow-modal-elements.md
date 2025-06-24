# 📱 Webflow Radio Program Sections Guide

**Version 3.1.0** | Updated: January 2025

This guide explains how to create the radio program generation sections on the `/rp` page in Webflow instead of JavaScript-generated popups.

## 🎯 **Overview**

You need to create **TWO PAGE SECTIONS** in Webflow on the `/rp` page that will be controlled by JavaScript:

1. **Progress Section** - Shown during radio program generation
2. **Success Section** - Shown when generation is complete

Both sections should be **initially hidden** and will be shown/hidden via JavaScript as part of the normal page flow.

---

## 🎙️ **PROGRESS SECTION**

### **Structure & IDs**

```html
<div id="radio-progress-section" class="progress-section w--hidden">
  <div id="radio-progress-content" class="progress-content">
    <!-- Icon -->
    <div id="radio-progress-icon" class="progress-icon">🎙️</div>
    
    <!-- Title -->
    <h2 id="radio-progress-title" class="progress-title">Creating Radio Program</h2>
    
    <!-- Status Message -->
    <p id="radio-status" class="progress-status">Initializing...</p>
    
    <!-- Progress Bar -->
    <div id="radio-progress-container" class="progress-container">
      <div id="radio-progress" class="progress-bar"></div>
    </div>
    
    <!-- Details Text -->
    <p id="radio-details" class="progress-details"></p>
    
    <!-- Info Text -->
    <p id="radio-progress-info" class="progress-info">This may take a few minutes...</p>
  </div>
</div>
```

### **Required Element IDs**

| Element | ID | Content Type | Purpose |
|---------|----|--------------|---------| 
| Section Container | `radio-progress-section` | Div | Main progress section |
| Content Wrapper | `radio-progress-content` | Div | Section content container |
| Icon | `radio-progress-icon` | Text/Image | 🎙️ microphone icon |
| Title | `radio-progress-title` | Heading | "Creating Radio Program" |
| Status Message | `radio-status` | Text | **Dynamic** - updated by JS |
| Progress Container | `radio-progress-container` | Div | Progress bar background |
| Progress Bar | `radio-progress` | Div | **Dynamic** - width updated by JS |
| Details Text | `radio-details` | Text | **Dynamic** - spinner + fun messages |
| Info Text | `radio-progress-info` | Text | "This may take a few minutes..." |

### **Styling Guidelines**

```css
#radio-progress-section {
  width: 100%;
  padding: 40px 20px;
  margin: 20px 0;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  display: none; /* Initially hidden */
}

#radio-progress-content {
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
}

#radio-progress-container {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  margin: 20px 0;
}

#radio-progress {
  height: 100%;
  background: #007bff;
  border-radius: 4px;
  transition: width 0.3s ease;
  width: 0%; /* Initial state */
}
```

---

## 🎉 **SUCCESS SECTION**

### **Structure & IDs**

```html
<div id="radio-success-section" class="success-section w--hidden">
  <div id="radio-success-content" class="success-content">
    <!-- Success Icon -->
    <div id="radio-success-icon" class="success-icon">🎉</div>
    
    <!-- Success Title -->
    <h2 id="radio-success-title" class="success-title">Radio Program Ready!</h2>
    
    <!-- Description -->
    <p id="radio-success-description" class="success-description">
      Your radio program is ready!
    </p>
    
    <!-- Audio Player Container -->
    <div id="radio-audio-container" class="audio-container">
      <audio id="radio-audio-player" controls preload="metadata" crossorigin="anonymous">
        Your browser does not support the audio element.
      </audio>
    </div>
    
    <!-- Hide Button (Optional) -->
    <button id="close-radio-section" class="success-button">Hide</button>
  </div>
</div>
```

### **Required Element IDs**

| Element | ID | Content Type | Purpose |
|---------|----|--------------|---------| 
| Section Container | `radio-success-section` | Div | Main success section |
| Content Wrapper | `radio-success-content` | Div | Section content container |
| Success Icon | `radio-success-icon` | Text/Image | 🎉 celebration icon |
| Success Title | `radio-success-title` | Heading | "Radio Program Ready!" |
| Description | `radio-success-description` | Text | **Dynamic** - updated by JS |
| Audio Container | `radio-audio-container` | Div | Audio player wrapper |
| Audio Player | `radio-audio-player` | Audio | **Dynamic** - src updated by JS |
| Hide Button | `close-radio-section` | Button | Hide section button (optional) |

### **Styling Guidelines**

```css
#radio-success-section {
  width: 100%;
  padding: 40px 20px;
  margin: 20px 0;
  background: #f8fff8;
  border-radius: 12px;
  border: 2px solid #28a745;
  display: none; /* Initially hidden */
}

#radio-success-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

#radio-audio-container {
  margin: 20px 0;
  padding: 20px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

#radio-audio-player {
  width: 100%;
}

#close-radio-section {
  background: #6c757d;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
}
```

---

## ⚙️ **Webflow Setup Instructions**

### **1. Create Section Structure on /rp Page**

1. Add a **Div Block** with ID `radio-progress-section` to the `/rp` page
2. Set initial state as **Hidden** (add `w--hidden` class)
3. Add all child elements with their respective IDs
4. Add another **Div Block** with ID `radio-success-section` below it
5. Set both sections to initially hidden

### **2. Set Section Classes**

Add these CSS classes to both section containers:
- `w--hidden` (Webflow's hidden class)
- `hide` (custom hidden class)
- Display: Block (but initially hidden)
- Width: 100%
- Margin: 20px 0

### **3. Responsive Design**

- **Desktop**: Max-width 500px (progress), 600px (success) - centered
- **Tablet**: Width 100%, padding 30px 15px
- **Mobile**: Width 100%, padding 20px 10px

### **4. Animation (Optional)**

You can add Webflow interactions:
- **Show**: Fade in + slide down
- **Hide**: Fade out + slide up
- **Duration**: 300ms

---

## 🔧 **JavaScript Integration**

The sections are controlled by these JavaScript functions:

### **Progress Section**
```javascript
// Show progress section
showRadioProgramModal('Processing...', 25);

// Update progress
updateRadioProgramProgress('Combining audio...', 75, 'Detailed status');

// Hide progress section
hideRadioProgramModal();
```

### **Success Section**
```javascript
// Show success section
showRadioProgramSuccess(audioUrl, world, lmid, questionCount, totalRecordings);

// Hide success section
hideRadioProgramSuccessModal();
```

---

## 🎨 **Design Recommendations**

### **Visual Hierarchy**
1. **Icon** (48px, center)
2. **Title** (24px, bold, center)
3. **Status/Description** (16px, center)
4. **Progress Bar** (full width, 8px height)
5. **Details** (12px, monospace, muted)
6. **Action Button** (prominent, accessible)

### **Color Scheme**
- **Progress Section**: Light gray background (#f8f9fa) with light border
- **Success Section**: Light green background (#f8fff8) with green border
- **Progress Bar**: Blue (#007bff)
- **Success Accent**: Green (#28a745)
- **Text**: Dark gray (#333)
- **Muted**: Light gray (#666)

### **Accessibility**
- **Keyboard Navigation**: Tab order
- **ARIA Labels**: Add appropriate labels
- **Focus Management**: Focus trap in modal
- **Screen Reader**: Proper heading structure

---

## ✅ **Testing Checklist**

- [ ] Progress section shows/hides correctly on /rp page
- [ ] Progress bar animates smoothly (0-100%)
- [ ] Status text updates dynamically
- [ ] Success section shows after progress completion
- [ ] Audio player loads and plays correctly
- [ ] Hide button works (if included)
- [ ] Sections integrate well with existing /rp page content
- [ ] Responsive design works on all devices
- [ ] Animations are smooth
- [ ] No JavaScript errors in console

---

## 🚨 **Troubleshooting**

### **Section Not Showing**
- Check element ID matches exactly (`radio-progress-section`, `radio-success-section`)
- Verify `w--hidden` class is present initially
- Ensure `display: block` is set when shown
- Check if section is placed correctly on `/rp` page

### **Progress Bar Not Updating**
- Verify `radio-progress` element exists within the progress section
- Check CSS has `transition: width 0.3s ease`
- Ensure width is set via JavaScript

### **Audio Not Playing**
- Verify `radio-audio-player` ID exists within success section
- Check CORS settings for audio files
- Ensure `preload="metadata"` and `crossorigin="anonymous"`

### **Styling Issues**
- Use browser dev tools to inspect elements
- Check if sections blend well with existing `/rp` page design
- Verify CSS specificity and inheritance

---

*This documentation was generated for Little Microphones v3.1.0* 