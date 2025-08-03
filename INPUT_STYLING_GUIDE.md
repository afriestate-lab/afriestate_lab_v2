# Mobile Input Styling Guide - User-Intuitive Design

## Overview

This guide outlines the user-intuitive input styling for the Icumbi mobile app. The input design follows mobile best practices to ensure clarity, usability, and accessibility.

## Input Design Principles

### 1. Clear Visual Hierarchy
- **Labels**: Dark, readable text above inputs
- **Placeholders**: Light gray text that disappears when typing
- **Input Text**: Dark text on white background for maximum readability
- **Borders**: Subtle borders that provide definition without distraction

### 2. Touch-Friendly Design
- **Minimum Height**: 48px for all input fields
- **Adequate Padding**: 16px horizontal padding for comfortable touch
- **Clear Boundaries**: Visible borders and sufficient spacing

### 3. Visual Feedback
- **Focus States**: Blue border when input is active
- **Error States**: Red border and clear error messages
- **Success States**: Green border for validated inputs

## Input Color Scheme

### Standard Input
```css
.input {
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  font-size: 16px;
  padding: 16px;
  min-height: 48px;
}

.input:focus {
  border-color: #667eea;
  outline: none;
}

.input::placeholder {
  color: #9ca3af;
}
```

### Input Labels
```css
.input-label {
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  display: block;
}
```

### Error States
```css
.input-error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}
```

### Success States
```css
.input-success {
  border-color: #10b981;
  background-color: #f0fdf4;
}
```

## Input Types and Styling

### 1. Text Inputs
- **Background**: Pure white (`#ffffff`)
- **Border**: Light gray (`#d1d5db`)
- **Text**: Dark gray (`#374151`)
- **Placeholder**: Light gray (`#9ca3af`)

### 2. Date Inputs
- **Background**: Pure white (`#ffffff`)
- **Border**: Light gray (`#d1d5db`)
- **Label**: Dark gray (`#374151`) with medium weight
- **Value**: Dark gray (`#374151`) with medium weight
- **Icon**: Brand blue (`#667eea`)

### 3. Phone Inputs
- **Background**: Pure white (`#ffffff`)
- **Border**: Light gray (`#d1d5db`)
- **Text**: Dark gray (`#374151`)
- **Keyboard**: Numeric keypad for easy input

### 4. Email Inputs
- **Background**: Pure white (`#ffffff`)
- **Border**: Light gray (`#d1d5db`)
- **Text**: Dark gray (`#374151`)
- **Keyboard**: Email keyboard with @ symbol

### 5. Password Inputs
- **Background**: Pure white (`#ffffff`)
- **Border**: Light gray (`#d1d5db`)
- **Text**: Dark gray (`#374151`)
- **Toggle**: Eye icon for show/hide password

## Interactive States

### Default State
- Clean white background
- Subtle gray border
- Dark text for readability
- Clear placeholder text

### Focus State
- Blue border (`#667eea`)
- Slight elevation or shadow
- Maintains white background
- Clear visual feedback

### Error State
- Red border (`#ef4444`)
- Light red background (`#fef2f2`)
- Clear error message below
- Maintains readability

### Success State
- Green border (`#10b981`)
- Light green background (`#f0fdf4`)
- Checkmark icon
- Positive feedback

### Disabled State
- Grayed out appearance
- Reduced opacity
- Clear disabled indication
- Non-interactive

## Accessibility Features

### 1. High Contrast
- Dark text on white background
- Minimum 4.5:1 contrast ratio
- Clear borders for definition
- Readable font sizes

### 2. Screen Reader Support
- Proper labels for all inputs
- Clear error messages
- Descriptive placeholder text
- Logical tab order

### 3. Touch Accessibility
- Large touch targets (48px minimum)
- Adequate spacing between inputs
- Clear visual boundaries
- Easy-to-tap buttons

## Implementation Examples

### React Native Paper TextInput
```tsx
<TextInput
  label="Amazina yawe *"
  value={fullName}
  onChangeText={setFullName}
  style={styles.input}
  mode="outlined"
  dense
  outlineColor="#d1d5db"
  activeOutlineColor="#667eea"
  textColor="#374151"
  placeholderTextColor="#9ca3af"
/>
```

### Custom Date Input
```tsx
<TouchableOpacity style={styles.dateInput}>
  <View style={styles.dateInputContent}>
    <Ionicons name="calendar" size={20} color="#667eea" />
    <View style={styles.dateInputText}>
      <Text style={styles.dateInputLabel}>Itariki yo kwinjira</Text>
      <Text style={styles.dateInputValue}>
        {checkInDate || 'Hitamo itariki'}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
  </View>
</TouchableOpacity>
```

### Error Handling
```tsx
<TextInput
  label="Imeri *"
  value={email}
  onChangeText={setEmail}
  style={[
    styles.input,
    emailError && styles.inputError
  ]}
  mode="outlined"
  dense
  outlineColor={emailError ? "#ef4444" : "#d1d5db"}
  activeOutlineColor="#667eea"
/>
{emailError && (
  <Text style={styles.errorMessage}>{emailError}</Text>
)}
```

## Best Practices

### 1. Visual Clarity
- Use consistent spacing and padding
- Maintain clear visual hierarchy
- Provide adequate contrast
- Use familiar input patterns

### 2. User Feedback
- Immediate visual feedback on interaction
- Clear error messages
- Success confirmations
- Loading states for async operations

### 3. Mobile Optimization
- Optimize for touch interaction
- Use appropriate keyboard types
- Provide clear input validation
- Support auto-complete where appropriate

### 4. Performance
- Minimize re-renders
- Use efficient validation
- Optimize for smooth scrolling
- Handle large datasets appropriately

## Testing Guidelines

### 1. Visual Testing
- Test on various screen sizes
- Verify contrast ratios
- Check accessibility features
- Validate color schemes

### 2. Interaction Testing
- Test touch targets
- Verify keyboard behavior
- Check focus management
- Validate error handling

### 3. Accessibility Testing
- Screen reader compatibility
- Keyboard navigation
- High contrast mode
- Voice control support

## Conclusion

The input styling follows mobile design best practices to ensure a user-intuitive experience. By using clear visual hierarchy, consistent colors, and proper feedback states, users can easily understand and interact with all input fields in the app.

The design prioritizes readability, accessibility, and usability while maintaining a clean, professional appearance that builds trust with users. 