# 📱 Webflow Radio Program Section Guide

**Version 3.1.0** | Updated: January 2025

This guide explains how to create the persistent radio program section on the `/rp` page in Webflow.

## 🎯 **Overview**

You need to create **ONE PERSISTENT SECTION** in Webflow on the `/rp` page that will be controlled by JavaScript:

- **Radio Program Section** - Always visible, updates dynamically during generation
- Shows progress during generation, displays audio player when complete
- Fallback message when no programs exist yet

The section is **always visible** and updates its content based on the current state.

---

## 🎙️ **RADIO PROGRAM SECTION**

### **Structure & IDs**

```html
<div id="radio-program-section" class="radio-program-section">
  <div id="radio-program-content" class="radio-program-content">
    <!-- Title (Dynamic) -->
    <h2 id="radio-program-title" class="radio-program-title">Radio Program</h2>
    
    <!-- Progress Bar (Single Element) -->
    <div id="radio-progress-bar" class="radio-progress-bar"></div>
    
    <!-- Details Text (During Generation) -->
    <p id="radio-details" class="radio-details"></p>
    
    <!-- Info Text (Only During Generation) -->
    <p id="radio-progress-info" class="radio-progress-info w--hidden">This may take a few minutes...</p>
    
    <!-- Audio Player (Always Present) -->
    <audio id="radio-audio-player" controls preload="metadata" crossorigin="anonymous" style="width: 100%;">
      Your browser does not support the audio element.
    </audio>
  </div>
</div>
```

### **Required Element IDs**

| Element | ID | Content Type | Purpose |
|---------|----|--------------|---------| 
| Section Container | `radio-program-section` | Div | Main persistent section |
| Content Wrapper | `radio-program-content` | Div | Section content container |
| Title | `radio-program-title` | Heading | **Dynamic** - "Radio Program" / "Creating Radio Program for [World]" |
| Progress Bar | `radio-progress-bar` | Div | **Dynamic** - width updated by JS (single element) |
| Details Text | `radio-details` | Text | **Dynamic** - spinner + fun messages (during generation) |
| Info Text | `radio-progress-info` | Text | "This may take a few minutes..." (shown only during generation) |
| Audio Player | `radio-audio-player` | Audio | **Dynamic** - src updated by JS / shows latest file |

### **Styling Guidelines**

```css
#radio-program-section {
  width: 100%;
  padding: 40px 20px;
  margin: 20px 0;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  display: block; /* Always visible */
}

#radio-program-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

#radio-program-title {
  margin-bottom: 20px;
  color: #333;
}

#radio-progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  margin: 20px 0;
  transition: background 0.3s ease;
}

/* 
JavaScript will update the background using linear-gradient:
progressElement.style.background = `linear-gradient(to right, #007bff ${progress}%, #e9ecef ${progress}%)`;
*/

#radio-details {
  font-family: monospace;
  font-size: 12px;
  color: #888;
  min-height: 16px;
  margin: 10px 0;
}

#radio-progress-info {
  font-size: 14px;
  color: #666;
  margin: 20px 0;
}

#radio-audio-player {
  width: 100%;
  margin: 20px 0;
}

#no-radio-programs-msg {
  padding: 20px;
  text-align: center;
  color: #6c757d;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin: 20px 0;
}
```



---

## ⚙️ **Webflow Setup Instructions**

### **1. Create Radio Program Section on /rp Page**

1. Add a **Div Block** with ID `radio-program-section` to the `/rp` page
2. Keep it **always visible** (do not add `w--hidden` class)
3. Add all child elements with their respective IDs
4. Set `radio-progress-info` to initially hidden (`w--hidden` class)

### **2. Set Section Properties**

Main section settings:
- Display: Block (always visible)
- Width: 100%
- Margin: 20px 0
- Background: Light gray (#f8f9fa)
- Border: 1px solid #e9ecef

### **3. Progress Bar Setup**

**Important**: Use CSS `::before` pseudo-element for the progress bar fill:
- The `radio-progress-bar` div is the container
- JavaScript will update the `::before` width via style manipulation
- Or create nested div structure as shown in styling guidelines

### **4. Responsive Design**

- **Desktop**: Max-width 600px - centered
- **Tablet**: Width 100%, padding 30px 15px
- **Mobile**: Width 100%, padding 20px 10px

### **5. Initialization**

Call the initialization function when the page loads:
```javascript
// Add this to your /rp page custom code
document.addEventListener('DOMContentLoaded', function() {
    if (window.initializeRadioProgramSection) {
        window.initializeRadioProgramSection();
    }
});
```

---

## 🔧 **JavaScript Integration**

The section is controlled by these JavaScript functions:

### **Initialization**
```javascript
// Initialize section when page loads
initializeRadioProgramSection();
```

### **During Generation**
```javascript
// Start generation (updates title and shows progress)
showRadioProgramModal('', 25);

// Update progress
updateRadioProgramProgress('', 75, 'Combining audio segments');

// Continue updating progress...
```

### **After Generation**
```javascript
// Complete generation (resets title, loads audio player)
showRadioProgramSuccess(audioUrl, world, lmid, questionCount, totalRecordings);
```

### **Reset to Idle**
```javascript
// Reset section to idle state
hideRadioProgramModal();
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
- **Section Background**: Light gray (#f8f9fa) with light border (#e9ecef)
- **Progress Bar**: Blue (#007bff)
- **Title**: Dark gray (#333)
- **Details Text**: Gray (#888)
- **Info Text**: Medium gray (#666)
- **No Programs Message**: Gray (#6c757d) with light background

### **Accessibility**
- **Keyboard Navigation**: Tab order
- **ARIA Labels**: Add appropriate labels
- **Focus Management**: Focus trap in modal
- **Screen Reader**: Proper heading structure

---

## ✅ **Testing Checklist**

- [ ] Radio program section is always visible on /rp page
- [ ] Title changes from "Radio Program" to "Creating Radio Program for [World]" during generation
- [ ] Progress bar animates smoothly (0-100%)
- [ ] Details text shows fun spinner messages during generation
- [ ] Info text appears only during generation
- [ ] Audio player shows latest file or "No Radio Programs Generated yet" message
- [ ] Section resets properly after generation completes
- [ ] Initialization function works on page load
- [ ] Section integrates well with existing /rp page content
- [ ] Responsive design works on all devices
- [ ] No JavaScript errors in console

---

## 🚨 **Troubleshooting**

### **Section Not Visible**
- Check element ID matches exactly (`radio-program-section`)
- Ensure section is always visible (no `w--hidden` class on main container)
- Verify section is placed correctly on `/rp` page
- Check if `initializeRadioProgramSection()` is being called

### **Progress Bar Not Updating**
- Verify `radio-progress-bar` element exists
- Check if using CSS `::before` approach or nested div approach
- Ensure JavaScript is updating the correct element
- Verify CSS has `transition: width 0.3s ease`

### **Audio Player Issues**
- Verify `radio-audio-player` ID exists
- Check CORS settings for audio files from Bunny CDN
- Ensure `preload="metadata"` and `crossorigin="anonymous"`
- Check if fallback message appears when no files exist

### **Title Not Updating**
- Verify `radio-program-title` element exists
- Check if URL parameters are being read correctly
- Ensure world name formatting is working

### **Styling Issues**
- Use browser dev tools to inspect elements
- Check if section blends well with existing `/rp` page design
- Verify CSS specificity and inheritance
- Test responsive design on different screen sizes

---

*This documentation was generated for Little Microphones v3.1.0* 