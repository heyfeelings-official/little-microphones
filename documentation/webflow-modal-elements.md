# 📱 Webflow Radio Program Section Guide

**Version 3.1.0** | Updated: January 2025

This guide explains how to create the persistent radio program section on the `/rp` page in Webflow. The system automatically handles all initialization and styling.

## 🎯 **Overview**

You need to create **ONE PERSISTENT SECTION** in Webflow on the `/rp` page:

- **Radio Program Section** - Always visible, updates dynamically during generation
- Shows progress during generation, displays audio player when complete
- Fallback message when no programs exist yet
- **Auto-Initialization** - No manual setup required
- **Included CSS** - Styling automatically injected

The section is **always visible** and updates its content based on the current state.

---

## 🎙️ **RADIO PROGRAM SECTION**

### **Structure & IDs**

```html
<div id="radio-program-section">
  <div id="radio-program-content">
    <!-- Title (Dynamic) -->
    <h2 id="radio-program-title">Radio Program</h2>
    
    <!-- Progress Bar (Single Element) -->
    <div id="radio-progress-bar"></div>
    
    <!-- Details Text (During Generation) -->
    <div id="radio-details"></div>
    
    <!-- Info Text (Only During Generation) -->
    <div id="radio-progress-info" style="display: none;">Generation progress info</div>
    
    <!-- Audio Player (Always Present) -->
    <audio id="radio-audio-player" controls></audio>
    
    <!-- No Programs Message (Fallback) -->
    <div id="no-radio-programs-msg">No Radio Programs Generated yet</div>
  </div>
</div>
```

### **Required Element IDs**

| Element | ID | Content Type | Purpose |
|---------|----|--------------|---------| 
| Section Container | `radio-program-section` | Div | Main persistent section |
| Content Wrapper | `radio-program-content` | Div | Section content container |
| Title | `radio-program-title` | Heading | **Dynamic** - "Radio Program" / "Creating Radio Program for [World]" |
| Progress Bar | `radio-progress-bar` | Div | **Dynamic** - background updated with linear-gradient |
| Details Text | `radio-details` | Div | **Dynamic** - technical details during generation |
| Info Text | `radio-progress-info` | Div | Descriptive progress info (shown only during generation) |
| Audio Player | `radio-audio-player` | Audio | **Dynamic** - src updated by JS / shows latest file |
| No Programs Message | `no-radio-programs-msg` | Div | Fallback when no programs exist |

---

## 🎨 **Automatic CSS Styling**

The system automatically injects responsive CSS:

```css
#radio-program-section {
    width: 100%;
    padding: 40px 20px;
    margin: 20px 0;
    background: #f8f9fa;
    border-radius: 12px;
    border: 1px solid #e9ecef;
    display: block;
}

#radio-program-content {
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
}

#radio-program-title {
    margin-bottom: 20px;
    color: #333;
    font-size: 24px;
    font-weight: bold;
}

#radio-progress-bar {
    width: 100%;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    margin: 20px 0;
    transition: background 0.3s ease;
}

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

/* Responsive design included */
@media (max-width: 768px) {
    #radio-program-section {
        padding: 30px 15px;
        margin: 15px 0;
    }
    
    #radio-program-title {
        font-size: 20px;
    }
}

@media (max-width: 480px) {
    #radio-program-section {
        padding: 20px 10px;
        margin: 10px 0;
    }
    
    #radio-program-title {
        font-size: 18px;
    }
}
```

---

## ⚡ **Progress Bar Implementation**

The progress bar uses CSS `linear-gradient` for visual progress:

```css
/* Example: 45% complete */
background: linear-gradient(to right, #007bff 45%, #e9ecef 45%);
```

JavaScript automatically updates this during generation:
- 0% = Gray background
- 25% = Blue gradient to 25%, gray remainder
- 100% = Full blue background

---

## 🔄 **Section States**

### **1. Idle State (Default)**
- Title: "Radio Program"
- Progress bar: Gray background (no progress)
- Info text: Hidden (`display: none`)
- Audio player: Shows latest file OR "No Radio Programs Generated yet"

### **2. Generation State**
- Title: "Creating Radio Program for [World]" (e.g., "Creating Radio Program for Spookyland")
- Progress bar: Updates with blue gradient progress
- Info text: Visible with generation details
- Audio player: Remains with current file

### **3. Completion State**
- Returns to idle state automatically
- Audio player: Loads new radio program
- Title: "Radio Program"
- Progress bar: Reset to gray

---

## ⚙️ **Webflow Setup Instructions**

### **SIMPLE SETUP - Just Add Elements**

1. **Add Section to /rp Page**
   - Create a Div Block with ID `radio-program-section`
   - **Keep it visible** (do not hide it)

2. **Add Child Elements**
   - Add each child element with the exact IDs listed above
   - Set `radio-progress-info` to `display: none` initially

3. **That's It!**
   - No additional JavaScript setup required
   - CSS automatically injected
   - Section automatically initializes
   - Audio player automatically loads latest file

### **Element Setup Checklist**

- [ ] `radio-program-section` - Main container
- [ ] `radio-program-content` - Content wrapper
- [ ] `radio-program-title` - Dynamic title
- [ ] `radio-progress-bar` - Progress visualization
- [ ] `radio-details` - Technical details
- [ ] `radio-progress-info` - Progress description (hidden by default)
- [ ] `radio-audio-player` - Audio element with `controls` attribute
- [ ] `no-radio-programs-msg` - Fallback message

---

## 🚀 **Auto-Initialization Features**

The system handles everything automatically:

✅ **CSS Injection** - Styling automatically added to page head  
✅ **Section Initialization** - Initializes when DOM is ready  
✅ **Audio Player Setup** - Loads latest file or shows fallback message  
✅ **Progress Updates** - Real-time visual progress during generation  
✅ **Error Handling** - Errors displayed within section (no popups)  
✅ **Responsive Design** - Mobile-optimized styling included  
✅ **Memory Management** - Auto-cleanup of resources  

---

## 🎛️ **Button Integration**

When users click the "Generate Program" button:

1. **Title Changes**: "Creating Radio Program for [World]"
2. **Progress Updates**: Blue gradient shows real-time progress
3. **Info Text**: Shows detailed generation steps
4. **Audio Player**: Automatically loads new file when complete
5. **Return to Idle**: Section resets to "Radio Program" title

**No popups are shown** - everything happens within the persistent section.

---

## 🔧 **Technical Notes**

- **No Manual Setup**: Everything works automatically when elements exist
- **No Popups**: Completely eliminates overlay modals
- **Persistent UI**: Section remains visible as part of normal page flow
- **Error Handling**: Errors displayed within section, not in separate modals
- **Performance**: Optimized with proper cleanup and memory management

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