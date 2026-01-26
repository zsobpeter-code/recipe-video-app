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

## Bug Fixes (Round 5) - User Testing Feedback

### BUG 1: Generated AI Photo Not Saved (HIGH)
- [x] Add original_image_url field to SavedRecipe interface
- [x] Save BOTH original image and AI-generated image when saving recipe
- [x] Add toggle button to view original vs generated image in recipe detail
- [x] Show original image as default if no AI photo generated

### BUG 2: Generate AI Photo Button Position (MEDIUM)
- [x] Added inline Generate AI Photo button in scroll flow
- [x] Button placed after description, before tags/ingredients
- [x] Button scrolls with content

### BUG 3: Favorites Heart Icon Not Working (HIGH)
- [x] Connect heart icon onPress handler
- [x] Implement toggleFavorite tRPC mutation call
- [x] Update local state after successful save
- [x] Heart fills gold when favorited, outline (white) when not
- [x] Recipe appears/disappears from favorites filter (via server-side toggle)

### BUG 4: Video Generation Shows Static Image Only (HIGH)
- [x] Create videoPromptEnricher service
- [x] Transform recipe steps into rich visual prompts using Claude
- [x] Include camera angles, lighting, motion descriptions
- [x] Pass enriched prompts to video player via navigation params
- [x] Show visual prompt preview in video player (Scene Description panel)
## Bug Fixes (Round 6) - User Testing Feedback

### BUG 1: Favorites Toggle Still Failing (HIGH)
- [x] Fixed: Recipe ID not being stored after save
- [x] Added savedRecipeId state to track ID after saving
- [x] Updated handleToggleFavorite to use savedRecipeId
- [x] Now favorites toggle works after saving recipe

### BUG 2: Text String Rendering Error (MEDIUM)
- [x] Reviewed step rendering code - all text properly wrapped in <Text> components
- [x] step.instruction, step.stepNumber, step.duration all wrapped correctly
- [x] Error may have been transient or from stale code

## Feature: Video Storage Setup (Runway Preparation)

### Step 1: Supabase Storage Bucket
- [x] Storage bucket setup documented (requires Supabase dashboard)
- [x] Storage policies documented for future implementation

### Step 2: Database Schema
- [x] Using in-memory storage for now (no DB table needed yet)
- [x] Schema ready to add when Supabase Storage is configured

### Step 3: Video Storage Service
- [x] Created videoStorageService.ts
- [x] Implemented storeVideoFromUrl function (placeholder)
- [x] Implemented deleteRecipeVideo function
- [x] Implemented getStoredVideo function

### Step 4: Integration Point
- [x] Created generateAndStoreVideo placeholder for Runway API
- [x] Service ready for Runway integration

## Feature: Cook Mode (Free Step-by-Step Instructions)

### UI Changes
- [x] Add "Cook" button to recipe-card.tsx bottom bar
- [x] Layout: [Save] [Cook] [Video] - 3 equal buttons
- [x] Cook button: gold filled (PrimaryButton), Save/Video: outlined (SecondaryButton)

### Cook Mode Screen
- [x] Modified video-player.tsx to support cook mode via "mode" param
- [x] Show step-by-step view without video/payment
- [x] Include: step image, step text, prev/next nav, timer
- [x] No paywall required - FREE to use
- [x] Shows dish name subtitle in cook mode
- [x] Hides scene description (video-only feature)

## Feature: Cook Mode Redesign & Step Photo Generation

### Cook Mode Screen
- [x] Create dedicated cook-mode.tsx screen (separate from video-player)
- [x] Header: Close, "Cook Mode" title, Share icon
- [x] Step image display with step badge and timer
- [x] Recipe title and step indicator
- [x] Scrollable step instructions
- [x] Previous/Next navigation controls
- [x] Bottom bar: [Save] [Photos $1.99] [Video $4.99]

### Step Photo Generation Service
- [x] Create stepPhotoService.ts
- [x] Generate AI images for each cooking step
- [x] Images saved via generateImage (uses built-in storage)
- [ ] Store step_images in recipe record (pending tRPC endpoint)

### Recipe Card Update
- [x] Update bottom bar: [Save] [Cook] [Video $4.99]
- [x] Cook button navigates to cook-mode.tsx (not video-player)

### Photo Generation UI
- [x] Show paywall for $1.99 step photos (separate pricing from video)
- [x] Progress indicator during generation (step-photo-generation.tsx)
- [x] Display generated step photos in Cook Mode (via stepImages param)

## Bug Fixes (Round 8) - Flow & UX Fixes

### Problem 1: Cook Mode Missing Ingredients
- [x] Add ingredients button in header (top right)
- [x] Show full ingredients modal when tapped
- [x] Display step-specific ingredients below instruction
- [x] Make step image static (no Ken Burns animation)

#### Problem 2: Generated Photos Don't Appear
- [x] Fixed: Photo generation now uses separate endpoint (not video enrichment)
- [x] Fixed: Added "View Recipe with Photos" button after generation
- [x] Fixed: stepImages passed to cook-mode via navigation params on completion screen

### Problem 3: "Untitled Dish (Name)" Formatting
- [x] Updated Claude prompt to explicitly require actual dish names
- [x] Removed "Untitled Dish" default from input-details.tsx
- [x] Claude now instructed to never use generic names like "Untitled Dish"
- [ ] Apply fix in recipe recognition flow

## Bug Fixes (Round 9) - Cook Mode & Recipe Detail UX

### Problem 1: Instructions Hard to Access on Recipe Detail
- [x] Make Instructions section expanded by default (changed from ingredients)
- [x] Reduce hero image height to max 200-240px
- [x] Instructions now prominent and easily scrollable

### Problem 2: Cook Mode Image Takes Too Much Space
- [x] Convert hero image to subtle blurred background (opacity 0.3, blur 15)
- [x] Add dark overlay for text readability (60% black)
- [x] Focus layout on instruction text and ingredients
- [x] Make instruction text large and readable (22px PlayfairDisplay)

### Problem 3: Redundant Badges on Image
- [x] Removed "Step X of Y" badge from image
- [x] Removed timer badge from image - now inline tappable timer
- [x] Keep only text-based step counter below title

### Problem 4: Can't Save Recipe After Photo Generation
- [x] Fixed: Properly format ingredients/steps as JSON strings
- [x] Fixed: Handle both string and object types for nested data
- [x] Added detailed error logging for debugging

## Feature: Runway Gen-3 API Integration

### Phase 1: SDK and Service Setup
- [x] Install @runwayml/sdk package
- [x] Create server/runwayService.ts with generateVideoFromImage, checkVideoStatus, waitForVideo
- [x] Add createCookingVideoPrompt helper for cinematic prompts

### Phase 2: Video Generation Service
- [x] Update videoStorageService.ts to use Runway API
- [x] Add generateStepVideos for batch processing
- [x] Add generateSingleStepVideo for individual steps
- [x] Add generateStepVideo tRPC endpoint
- [ ] Save videos to Supabase recipe-videos bucket (pending storage setup)

### Phase 3: Video Player Update
- [x] Updated video-player.tsx with expo-video VideoView component
- [x] Added stepVideos param for passing generated videos
- [x] Auto-advance to next step when video ends
- [x] Shows "AI VIDEO" badge when playing real videos
- [x] Fallback to Ken Burns animation for steps without video

### Configuration
- Model: gen3a_turbo (faster, cheaper)
- Duration: 5 seconds per step
- Ratio: 9:16 (vertical)

## Feature: Video Storage in Supabase

### Phase 1: Database & Storage Setup
- [x] Add step_videos JSONB column to recipes table
- [x] Add video_generated_at TIMESTAMPTZ column
- [x] Create recipe-videos storage bucket in Supabase
- [x] Create storage policies for upload/view/delete

### Phase 2: Video Generation Updates
- [x] Update videoStorageService.ts with storeVideoToSupabase function
- [x] Download video from Runway temp URL
- [x] Upload to Supabase Storage (recipe-videos bucket)
- [x] Add "saving" progress status during upload
- [ ] Save step_videos array to recipe record (pending tRPC endpoint)

### Phase 3: Video Player Updates
- [x] Videos now stored permanently in Supabase Storage
- [x] userId and recipeId passed through navigation chain
- [x] Storage path: recipe-videos/{userId}/{recipeId}/step_{n}.mp4
- [ ] Check if videos already exist before regenerating (future optimization)
- [ ] Skip generation if step_videos already populated

### Testing Checklist
- [ ] Video generates via Runway API
- [ ] Progress shows "saving" status during upload
- [ ] Video appears in Supabase Storage bucket
- [ ] Storage path is {userId}/{recipeId}/step_X.mp4
- [ ] Recipe record has step_videos array with permanent URLs
- [ ] Video player loads from Supabase URL
- [ ] Re-opening recipe plays stored video without regenerating

## Feature: Video Caching Check

### Phase 1: Caching Logic
- [x] Check if step_videos already exist before generating
- [x] Skip generation if videos are cached
- [x] Show "complete" progress immediately for cached videos
- [x] Navigate directly to video player with cached videos

### Phase 2: UI Updates
- [x] Update Cook Mode bottom bar to show "Watch Video" if cached
- [x] Update Recipe Card Video button to show different state
- [x] Remove price display for already-generated videos
- [x] Skip paywall and go directly to video player for cached videos

## Critical Bug Fix - Recipe Data Not Loading

### Symptoms
- [x] "STEP 1 OF 0" - steps array is empty or undefined
- [x] "Loading..." stuck - recipe not loading
- [x] "501 steps" - incorrect step count (reading wrong field)
- [x] TypeError during video generation

### Fixes Applied
- [x] Add debug logging to Cook Mode, Video Generation, and Video Player
- [x] Handle steps as both array and JSON string
- [x] Guard against undefined/empty steps with error logging
- [x] Use Array.isArray check before accessing steps.length

## Bug Fix - Runway API Invalid Image URL

### Problem
- Runway API returns 400 error: "Invalid string: must start with https://"
- promptImage parameter receiving undefined, base64, or file path instead of HTTPS URL

### Fixes Needed
- [x] Add URL validation in runwayService.ts before calling Runway API
- [x] Add debug logging to trace image URL values
- [x] Add fallback to main recipe image if step images unavailable
- [x] Convert HTTP to HTTPS if needed
- [x] Throw clear error if no valid HTTPS URL found

## Bug Fix - Step Photos Not Persisting (file:// URLs)

### Problem
- Step photos generated by Flux are stored as local file paths (file:///var/mobile/...)
- Images don't persist after app restart
- Video generation fails because Runway requires HTTPS URLs

### Solution
- [x] Storage already configured - generateImage() uses storagePut() which returns HTTPS URLs
- [x] stepPhotoService.ts already uses generateImage() which returns HTTPS URLs
- [ ] Debug why file:// URLs are appearing instead of HTTPS URLs
- [ ] Save step_images array with HTTPS URLs to database
- [ ] Add "uploading" status during upload phase

## Bug Fix - Video Generation Requires HTTPS Images

### Problem
- Video generation fails with "Invalid image URL format. Must start with https://"
- Original captured images are local file:// paths
- Runway API requires HTTPS URLs

### Solution
- [x] Add stepImages param to navigation flow (paywall, recipe-card, cook-mode)
- [x] Pass stepImages (which have HTTPS URLs) to video-generation screen
- [x] Add fallback logic in video-generation to use step images when available
- [x] Add clear error handling when no HTTPS image is available
- [x] Add alert prompting user to generate AI photo first if no HTTPS image
- [x] Skip video generation for steps without HTTPS images (continue with others)


## Bug Fix - Upload Step Photos to Supabase Storage

### Problem
- Step photos generated by Flux are stored as local file:// paths
- Images don't persist after app restart
- Video generation fails because Runway API requires HTTPS URLs
- Images only visible locally, not synced across devices

### Solution
- [x] Update stepPhotoService to upload generated images to Supabase Storage (already uses generateImage which stores to S3)
- [x] Add step_images and step_videos fields to SavedRecipe interface
- [x] Add updateStepImages and updateStepVideos tRPC endpoints
- [x] Save step_images array with HTTPS URLs to database after generation
- [x] Save step_videos array with HTTPS URLs to database after generation
- [ ] Test: Photo generation saves HTTPS URLs to database
- [ ] Test: step_images array in database contains HTTPS URLs (not file://)
- [ ] Test: Cook Mode background images load from Supabase URLs
- [ ] Test: After app restart, step images still visible
- [ ] Test: Video generation works with the HTTPS URLs


## Bug Fix - Video Generation tRPC Timeout Error

### Problem
- Step 8 video failed with: TRPCClientError: Unable to transform response from server
- Likely a timeout or response parsing issue when Runway takes too long

### Solution
- [x] Add retry logic to runwayService.ts (max 2 retries per step)
- [x] Add configurable timeout for video generation (3 min default)
- [x] Return null instead of throwing on failure - allow other steps to continue
- [x] Add exponential backoff between retries (5s, 10s, 20s...)
- [x] Log retry attempts for debugging
- [x] Update generateSingleStepVideo to use new generateVideoWithRetry function


## Feature - Video Concatenation for Social Media Sharing

### Overview
After generating individual step videos, concatenate them into a single video file for TikTok/Instagram sharing.

### Implementation
- [x] Install ffmpeg-kit-react-native package
- [x] Configure Expo plugin in app.config.ts
- [x] Create videoConcatService.ts with concatenateStepVideos function
- [x] Download step videos to local cache
- [x] Run FFmpeg concatenation command
- [x] Add finalVideoUrl field to SavedRecipe interface
- [x] Add updateFinalVideoUrl tRPC endpoint
- [x] Update video generation flow to concatenate after all steps complete
- [x] Update video player to accept finalVideoPath parameter
- [x] Add share button with expo-sharing integration
- [x] Add "Share to TikTok / Instagram" button in video player
- [x] Clean up temp files after concatenation


## Feature - Comprehensive Sharing Features

### Part 1: Upload Final Video to Supabase
- [x] Create uploadFinalVideoToSupabase function in videoConcatService.ts
- [x] Upload concatenated video to recipe-videos bucket
- [x] Save final_video_url to recipe record via updateFinalVideoUrl mutation
- [x] Call upload after concatenation completes in video-generation.tsx

### Part 2: Image Selection (Original vs AI Generated)
- [x] Add generatedImageUrl and primaryImageUrl fields to SavedRecipe interface
- [x] Create ImageSelector component
- [x] Add updatePrimaryImage and updateGeneratedImage tRPC endpoints
- [ ] Integrate ImageSelector into recipe-card screen

### Part 3: Share Recipe Card (Image)
- [x] Install react-native-view-shot
- [x] Create ShareableRecipeCard component with ViewShot
- [x] Create shareRecipeCardImage function in recipeShareService.ts
- [x] Share via expo-sharing

### Part 4: Share Recipe PDF
- [x] Install expo-print
- [x] Create shareRecipePDF function in recipeShareService.ts
- [x] Generate HTML with recipe content, ingredients, steps, and step photos
- [x] Convert to PDF and share

### Part 5: Share Menu UI
- [x] Create ShareMenu modal component
- [x] Show available share options based on recipe content (card, PDF, AI photo, video)
- [ ] Integrate ShareMenu with recipe-card screen


## Bug Fixes - Critical Issues

### Issue 1: FFmpegKit not available in Expo Go
- [x] Add try/catch wrapper for FFmpegKit import
- [x] Create isFFmpegAvailable() function
- [x] Skip concatenation gracefully in Expo Go
- [x] Return first video URL as fallback
- [x] Show alert in video-generation when FFmpeg not available

### Issue 2: "Photos" button text wrapping
- [x] Add minWidth to action button in SecondaryButton
- [x] Add numberOfLines={1} to prevent text wrapping
- [x] Adjust padding for better fit

### Issue 3: Step photos not visible in Cook Mode
- [x] Increase background image opacity (from 0.3 to 0.6)
- [x] Reduce overlay darkness (from 0.6 to 0.4)
- [x] Blur already present at 15px for text readability

### Issue 4: Paywall pricing shows "/mo"
- [x] Remove "/mo" from $29.99 Unlimited option
- [x] Remove "/mo" from $9.99 Unlimited Photos option
- [x] Keep clean price display

### Issue 5: Video requires Photo first
- [x] Improve alert message to explain why photos are needed
- [x] Add "Generate Photos & Video" combined option
