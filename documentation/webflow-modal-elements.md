# 📱 Webflow Modal Elements Guide

**Version 3.1.0** | Updated: January 2025

This guide explains how to create the radio program generation modals in Webflow instead of JavaScript-generated popups.

## 🎯 **Overview**

You need to create **TWO MODALS** in Webflow that will be controlled by JavaScript:

1. **Progress Modal** - Shown during radio program generation
2. **Success Modal** - Shown when generation is complete

Both modals should be **initially hidden** and will be shown/hidden via JavaScript.

---

## 🎙️ **PROGRESS MODAL**

### **Structure & IDs**

```html
<div id="radio-progress-modal" class="modal-overlay w--hidden">
  <div id="radio-progress-content" class="modal-content">
    <!-- Icon -->
    <div id="radio-progress-icon" class="modal-icon">🎙️</div>
    
    <!-- Title -->
    <h2 id="radio-progress-title" class="modal-title">Creating Radio Program</h2>
    
    <!-- Status Message -->
    <p id="radio-status" class="modal-status">Initializing...</p>
    
    <!-- Progress Bar -->
    <div id="radio-progress-container" class="progress-container">
      <div id="radio-progress" class="progress-bar"></div>
    </div>
    
    <!-- Details Text -->
    <p id="radio-details" class="modal-details"></p>
    
    <!-- Info Text -->
    <p id="radio-progress-info" class="modal-info">This may take a few minutes...</p>
  </div>
</div>
```

### **Required Element IDs**

| Element | ID | Content Type | Purpose |
|---------|----|--------------|---------| 
| Modal Container | `radio-progress-modal` | Div | Main modal overlay |
| Content Wrapper | `radio-progress-content` | Div | Modal content container |
| Icon | `radio-progress-icon` | Text/Image | 🎙️ microphone icon |
| Title | `radio-progress-title` | Heading | "Creating Radio Program" |
| Status Message | `radio-status` | Text | **Dynamic** - updated by JS |
| Progress Container | `radio-progress-container` | Div | Progress bar background |
| Progress Bar | `radio-progress` | Div | **Dynamic** - width updated by JS |
| Details Text | `radio-details` | Text | **Dynamic** - spinner + fun messages |
| Info Text | `radio-progress-info` | Text | "This may take a few minutes..." |

### **Styling Guidelines**

```css
#radio-progress-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

#radio-progress-content {
  background: white;
  padding: 40px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

#radio-progress-container {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
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

## 🎉 **SUCCESS MODAL**

### **Structure & IDs**

```html
<div id="radio-success-modal" class="modal-overlay w--hidden">
  <div id="radio-success-content" class="modal-content">
    <!-- Success Icon -->
    <div id="radio-success-icon" class="modal-icon">🎉</div>
    
    <!-- Success Title -->
    <h2 id="radio-success-title" class="modal-title">Radio Program Ready!</h2>
    
    <!-- Description -->
    <p id="radio-success-description" class="modal-description">
      Your radio program is ready!
    </p>
    
    <!-- Audio Player Container -->
    <div id="radio-audio-container" class="audio-container">
      <audio id="radio-audio-player" controls preload="metadata" crossorigin="anonymous">
        Your browser does not support the audio element.
      </audio>
    </div>
    
    <!-- Close Button -->
    <button id="close-radio-modal" class="modal-button">✓ Close</button>
  </div>
</div>
```

### **Required Element IDs**

| Element | ID | Content Type | Purpose |
|---------|----|--------------|---------| 
| Modal Container | `radio-success-modal` | Div | Main modal overlay |
| Content Wrapper | `radio-success-content` | Div | Modal content container |
| Success Icon | `radio-success-icon` | Text/Image | 🎉 celebration icon |
| Success Title | `radio-success-title` | Heading | "Radio Program Ready!" |
| Description | `radio-success-description` | Text | **Dynamic** - updated by JS |
| Audio Container | `radio-audio-container` | Div | Audio player wrapper |
| Audio Player | `radio-audio-player` | Audio | **Dynamic** - src updated by JS |
| Close Button | `close-radio-modal` | Button | Close modal button |

### **Styling Guidelines**

```css
#radio-success-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

#radio-success-content {
  background: white;
  padding: 40px;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

#radio-audio-container {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

#radio-audio-player {
  width: 100%;
}

#close-radio-modal {
  background: #28a745;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}
```

---

## ⚙️ **Webflow Setup Instructions**

### **1. Create Modal Structure**

1. Add a **Div Block** with ID `radio-progress-modal`
2. Set initial state as **Hidden** (add `w--hidden` class)
3. Add all child elements with their respective IDs
4. Repeat for success modal

### **2. Set Modal Classes**

Add these CSS classes to both modal containers:
- `w--hidden` (Webflow's hidden class)
- `hide` (custom hidden class)
- Position: Fixed
- Z-index: 10000
- Display: Flex (but initially hidden)

### **3. Responsive Design**

- **Desktop**: Max-width 500px (progress), 600px (success)
- **Tablet**: Width 90%
- **Mobile**: Width 95%, adjust padding to 20px

### **4. Animation (Optional)**

You can add Webflow interactions:
- **Show**: Fade in + scale up
- **Hide**: Fade out + scale down
- **Duration**: 300ms

---

## 🔧 **JavaScript Integration**

The modals are controlled by these JavaScript functions:

### **Progress Modal**
```javascript
// Show progress modal
showRadioProgramModal('Processing...', 25);

// Update progress
updateRadioProgramProgress('Combining audio...', 75, 'Detailed status');

// Hide progress modal
hideRadioProgramModal();
```

### **Success Modal**
```javascript
// Show success modal
showRadioProgramSuccess(audioUrl, world, lmid, questionCount, totalRecordings);

// Hide success modal
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
- **Background**: rgba(0, 0, 0, 0.8)
- **Modal**: White with shadow
- **Progress**: Blue (#007bff)
- **Success**: Green (#28a745)
- **Text**: Dark gray (#333)
- **Muted**: Light gray (#666)

### **Accessibility**
- **Keyboard Navigation**: Tab order
- **ARIA Labels**: Add appropriate labels
- **Focus Management**: Focus trap in modal
- **Screen Reader**: Proper heading structure

---

## ✅ **Testing Checklist**

- [ ] Progress modal shows/hides correctly
- [ ] Progress bar animates smoothly (0-100%)
- [ ] Status text updates dynamically
- [ ] Success modal shows after progress
- [ ] Audio player loads and plays correctly
- [ ] Close button works
- [ ] Click outside modal closes it
- [ ] Responsive design works on all devices
- [ ] Animations are smooth
- [ ] No JavaScript errors in console

---

## 🚨 **Troubleshooting**

### **Modal Not Showing**
- Check element ID matches exactly
- Verify `w--hidden` class is present initially
- Ensure `display: flex` is set in CSS

### **Progress Bar Not Updating**
- Verify `radio-progress` element exists
- Check CSS has `transition: width 0.3s ease`
- Ensure width is set via JavaScript

### **Audio Not Playing**
- Verify `radio-audio-player` ID
- Check CORS settings for audio files
- Ensure `preload="metadata"` and `crossorigin="anonymous"`

### **Styling Issues**
- Use browser dev tools to inspect elements
- Check z-index conflicts
- Verify CSS specificity

---

*This documentation was generated for Little Microphones v3.1.0* 