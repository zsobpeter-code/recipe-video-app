# Recipe Video Tutorial App - Design Document

## Design Philosophy

- **Editorial** - Magazine-quality, premium feel
- **Memory Album** - Personal, nostalgic, emotional
- **Immersive** - Full-screen food photography as backgrounds

All design assumes **mobile portrait orientation (9:16)** and **one-handed usage**.

---

## Screen List

### Phase 1: Foundation
1. **Splash Screen** - App launch with logo
2. **Onboarding Screen** - Welcome carousel (3 slides)
3. **Login Screen** - Email/password login + Apple Sign In
4. **Sign Up Screen** - Email/password registration

### Phase 2: Core Flow (Future)
5. **Home Screen** - Recipe collection grid
6. **Capture Screen** - Camera/gallery photo capture
7. **Input Details Screen** - Dish name and notes input
8. **Processing Screen** - AI analysis progress
9. **Refinement Screen** - Clarification questions
10. **Recipe Card Screen** - Full recipe view with ingredients/steps

### Phase 3+ (Future)
11. **Video Player Screen** - Step-by-step cooking video
12. **Timer Screen** - Cooking timer overlay
13. **Profile Screen** - User settings and stats
14. **Paywall Screen** - Subscription options

---

## Color Palette

### Backgrounds (Dark Charcoal)
| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#1A1A1A` | Primary screen background |
| `surface` | `#2D2D2D` | Card backgrounds (glassmorphism base) |
| `surfaceSecondary` | `#3D3D3D` | Secondary surfaces |

### Accent (Muted Gold / Warm Beige)
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#C9A962` | Buttons, CTAs, highlights |
| `primaryLight` | `#E8DCC4` | Text highlights, subtle elements |
| `primaryDark` | `#8B7355` | Icons, secondary elements |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `foreground` | `#FFFFFF` | Headings, important text |
| `muted` | `#B3B3B3` | Descriptions, subtitles |
| `subtle` | `#808080` | Timestamps, meta info |

### Status
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#4A7C59` | Success states (muted green) |
| `error` | `#8B4049` | Error states (muted red) |
| `warning` | `#C9A962` | Warning states (gold accent) |

---

## Typography

### Headings (Serif - elegant, timeless)
- **Font Family**: Playfair Display
- **Usage**: Recipe names, screen titles
- **Weights**: Regular (400), Bold (700)

### Body Text (Sans-serif - readable)
- **Font Family**: Inter
- **Usage**: Descriptions, ingredients, steps
- **Weights**: Regular (400), Medium (500)

### User Notes (Handwritten - personal)
- **Font Family**: Caveat
- **Usage**: User comments, personal notes
- **Weights**: Regular (400)

---

## UI Components

### Glassmorphism Cards
- Background: `rgba(45, 45, 45, 0.7)`
- Backdrop blur: 20px
- Border: 1px solid `rgba(255, 255, 255, 0.1)`
- Border radius: 24px

### Primary Buttons
- Background: `#C9A962` (gold)
- Text color: `#1A1A1A` (dark)
- Border radius: 12px
- Padding: 16px vertical, 32px horizontal
- Press feedback: scale 0.97 + haptic

### Secondary Buttons
- Background: transparent
- Border: 1px solid `#C9A962`
- Text color: `#C9A962`
- Border radius: 12px

### Text Inputs
- Background: `rgba(45, 45, 45, 0.5)`
- Border: 1px solid `rgba(255, 255, 255, 0.1)`
- Border radius: 12px
- Text color: `#FFFFFF`
- Placeholder color: `#808080`

### Icons
- Style: Outline, 1.5px stroke
- Colors: `#FFFFFF` or `#C9A962`
- Size: 24px standard

---

## Key User Flows

### Flow 1: Authentication (Phase 1)
1. User opens app → Splash screen
2. First-time user → Onboarding carousel
3. User taps "Get Started" → Login screen
4. New user taps "Sign Up" → Sign Up screen
5. User enters credentials → Home screen

### Flow 2: New Recipe from Photo (Phase 2)
1. User taps Capture tab
2. User takes photo or selects from gallery
3. Input Details Screen appears
4. User optionally enters dish name and notes
5. User taps "Create Recipe"
6. Processing Screen shows progress
7. If clarification needed → Refinement Screen
8. Recipe Card Screen shows completed recipe

---

## Screen Layouts

### Splash Screen
- Full dark background (#1A1A1A)
- Centered app logo (gold accent)
- App name in Playfair Display below logo

### Onboarding Screen
- 3 slides with full-screen food imagery (blurred background)
- Glassmorphism card at bottom with:
  - Headline in Playfair Display
  - Description in Inter
  - Page indicators (gold dots)
- "Get Started" button on final slide

### Login Screen
- Dark background with subtle texture
- App logo at top (smaller)
- Glassmorphism card containing:
  - "Welcome Back" heading (Playfair Display)
  - Email input field
  - Password input field
  - "Sign In" primary button
  - "Sign in with Apple" button
  - "Don't have an account? Sign Up" link

### Sign Up Screen
- Similar layout to Login
- "Create Account" heading
- Display name input
- Email input
- Password input
- Confirm password input
- "Create Account" primary button
- "Already have an account? Sign In" link

---

## Visual Effects

- Subtle paper/canvas texture overlay on backgrounds (3-5% opacity)
- Noise texture on cards (2-3% opacity) for premium feel
- Vignette effect on food photos (10-15% darkening at edges)
- Warm color filter on AI-generated images
