# Project TODO

## Phase 1: Foundation

- [x] Configure theme colors (dark charcoal backgrounds, gold accents)
- [x] Set up custom fonts (Playfair Display, Inter, Caveat)
- [x] Create design system components (PrimaryButton, SecondaryButton)
- [x] Create GlassmorphismCard component
- [x] Create TextInput component
- [x] Set up tab navigation structure
- [x] Create Splash/Loading screen
- [x] Create Onboarding screen with carousel
- [x] Create Login screen
- [x] Create Sign Up screen
- [x] Configure Supabase credentials
- [x] Create database tables (users, recipes, recipe_photos, generations, transactions)
- [x] Set up Row Level Security (RLS) policies
- [x] Implement Supabase auth client and hooks
- [x] Connect Apple Sign In to auth flow
- [x] Update Login/Sign Up screens with real authentication
- [x] Generate custom app logo
- [x] Configure app branding (name, icons)

## Phase 2: Core Flow

- [x] Install expo-camera and expo-image-picker dependencies
- [x] Build Capture Screen with camera view
- [x] Add gallery picker to Capture Screen
- [x] Build Input Details Screen (dish name + user notes)
- [x] Build Processing Screen with loading animation
- [x] Set up navigation flow between capture screens
- [x] Configure Anthropic API key
- [x] Create analyze-image tRPC route with Claude Vision
- [x] Build Recipe Card Screen with glassmorphism design
- [x] Connect Processing Screen to tRPC AI route
## Phase 3: Collection

### Save to Collection Flow
- [x] Create Supabase Storage bucket for recipe images
- [x] Create tRPC routes for recipe CRUD operations
- [x] Connect Save to Collection button to Supabase
- [x] Upload captured image to Supabase Storage
- [x] Save recipe data to recipes table
- [x] Show success confirmation

### Home Screen
- [x] Build Home Screen with 2-column recipe grid
- [x] Display recipe photo, title, cook time on cards
- [x] Add category filter pills (All, Main, Soup, Dessert, Favorites)
- [x] Add search bar
- [x] Tap card to open Recipe Card Screen
- [x] Add empty state when no recipes

### Collection Tab
- [x] Build Collection tab with same grid layout
- [x] Add pull-to-refresh
- [x] Add favorite toggle on cards (heart icon)

### Delete Recipe
- [x] Add swipe to delete or long-press menu
- [x] Add confirmation dialog

## Future Phases

- [ ] Refinement Screen (clarification questions)

## Phase 4: Video Generation & Monetization

### Profile Tab
- [x] Build Profile Tab with user avatar and email
- [x] Add stats section (recipes count, videos generated)
- [x] Add subscription status section
- [x] Add settings links (Notifications, Appearance, Help, Terms, Privacy)
- [x] Add Sign Out button with confirmation

### Paywall Screen
- [x] Build Paywall Screen with premium illustration
- [x] Add feature list (videos, AI photos, storage, sync)
- [x] Add pricing options ($1.99, $6.99/5, $19.99/mo)
- [x] Add Continue button and Restore Purchases link

### Video Generation Flow
- [x] Connect Generate Video button to Paywall
- [x] Build Video Generation Screen with progress animation
- [x] Build Video Player Screen with step-by-step playback
- [x] Add navigation between video steps (prev/next)
- [x] Mock payment and generation for now

## iOS Testing Preparation

- [x] Add demo recipes for testing the full flow
- [x] Verify app builds correctly for iOS
- [x] Provide Expo Go testing instructions

## Bug Fixes

- [x] Fix recipe steps rendering - display step.instruction instead of whole step object

## New Features

### Refinement Screen (Dish Correction)
- [x] Create Refinement Screen between Processing and Recipe Card
- [x] Show AI-detected dish name with confidence score
- [x] Add "Is this correct?" with Yes/No buttons
- [x] Add text input for manual dish name correction
- [x] Show alternative suggestions from AI
- [x] Add Confirm button to proceed with corrected name
- [x] Update Processing Screen to navigate to Refinement

### Mock Video Generation Flow
- [x] Fix Paywall mock purchase to work smoothly
- [x] Ensure Video Generation shows progress animation
- [x] Add placeholder/demo video to Video Player
- [x] Make full flow testable end-to-end

## Bug Fixes (Round 2)

### BUG 1: Dish correction doesn't regenerate recipe
- [x] When user corrects dish name → call AI again with corrected name
- [x] Generate NEW recipe for the corrected dish
- [x] Show loading state ("Updating recipe...")
- [x] Recipe Card shows NEW recipe matching corrected name

### BUG 2: No "Generate AI Photo" option for text recipes
- [x] On Recipe Card, if no food photo → show "Generate AI Photo" button
- [x] Button triggers AI image generation (mock for now)

### BUG 3: Video doesn't play
- [x] Add Ken Burns effect (slow zoom/pan) on recipe photo as placeholder
- [x] Play/pause button works
- [x] Timer counts properly with auto-advance

### BUG 4: Console Error - Text strings in wrong component
- [x] Reviewed all screens and components for text rendering issues
- [x] All text content is properly wrapped in <Text> components
- [x] TypeScript check passes with no errors

## Bug Fixes (Round 3)

### BUG: Text rendering error line 534-537
- [x] Fixed step parsing to ensure instruction is always a string

### BUG: Dish correction STILL doesn't update recipe
- [x] Updated AI prompt to prioritize user-provided dish name
- [x] AI now generates recipe for corrected dish, not image content
- [x] New recipe data passed to Recipe Card screen

### BUG: No AI image generation for text recipes
- [x] Added server-side AI image generation endpoint using generateImage
- [x] Generate food image based on dish name/description
- [x] Connected Recipe Card button to real AI generationipes

### BUG: Video shows wrong image (text photo instead of food)
- [x] Pass generated AI image to video player
- [x] Use AI-generated food image for Ken Burns effect
- [ ] Never show handwritten text photo in video player

## Bug Fixes (Round 4) - Video Player

### BUG 1: Video doesn't show different images per step
- [x] Added step-specific visual styles (different zoom/pan patterns)
- [x] Added color overlay that changes per step for visual variety

### BUG 2: Two play buttons on screen
- [x] Removed play button overlay from the image
- [x] Keep only the gold play/pause button at bottom
- [x] Added "Tap to play" hint when paused

### BUG 3: Page not scrollable
- [x] Made the ALL STEPS section scrollable
- [x] Users can see full step list with nested scroll

### BUG 4: Share button doesn't work
- [x] Implemented share functionality using React Native Share API
- [x] Shares recipe name, step count, and total time

### BUG 5: No Generate AI Photo option after recipe loads
- [x] Show Generate AI Photo button for all recipes (not just text)
- [x] Button appears on Recipe Card allowing users to generate AI food images anytime
